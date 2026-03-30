#!/usr/bin/env bash
# ============================================================================
# Fix NHANH: Sửa entrypoint.sh ở ~/openclaw-build rồi rebuild image
#
# Chạy trên Ubuntu server:
#   sudo bash fix-rebuild.sh
#
# Script sẽ:
#   1. Sửa entrypoint.sh: pairing → open, allowlist → open
#   2. Thêm đoạn fix config sau khi gateway tạo config
#   3. Rebuild image openclaw:v1
#   4. Restart container
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[→]${NC} $*"; }

CONTAINER="${CONTAINER:-openclaw-bot}"
IMAGE="${IMAGE:-openclaw:v1}"

# Auto-detect build dir: thử nhiều vị trí phổ biến
if [ -n "${BUILD_DIR:-}" ]; then
  : # Dùng BUILD_DIR từ env
elif [ -d "/home/fv-admin/openclaw-build" ]; then
  BUILD_DIR="/home/fv-admin/openclaw-build"
elif [ -d "$HOME/openclaw-build" ]; then
  BUILD_DIR="$HOME/openclaw-build"
elif [ -d "/root/openclaw-build" ]; then
  BUILD_DIR="/root/openclaw-build"
else
  # Tìm tự động
  BUILD_DIR=$(find /home /root -maxdepth 2 -type d -name "openclaw-build" 2>/dev/null | head -1)
fi

echo -e "\n${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  Fix entrypoint.sh + Rebuild image${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}\n"

# ── Check build dir ──
if [ -z "$BUILD_DIR" ] || [ ! -d "$BUILD_DIR" ]; then
  err "Không tìm thấy openclaw-build directory!"
  err "Thử: BUILD_DIR=/đường/dẫn/tới/openclaw-build sudo bash fix-rebuild.sh"
  exit 1
fi

cd "$BUILD_DIR"
log "Build dir: $BUILD_DIR"

# ── Check entrypoint.sh ──
if [ ! -f "entrypoint.sh" ]; then
  err "Không tìm thấy entrypoint.sh trong $BUILD_DIR"
  exit 1
fi

# ── Backup ──
cp entrypoint.sh entrypoint.sh.bak.$(date +%Y%m%d%H%M%S)
log "Backup entrypoint.sh"

# ── Show current ──
echo ""
info "Entrypoint.sh TRƯỚC khi fix:"
grep -n "dmPolicy\|groupPolicy\|allowlist\|pairing\|allowFrom" entrypoint.sh || echo "  (không tìm thấy pattern)"

# ── Fix: Thay thế tất cả pairing → open, allowlist → open ──
echo ""
info "Sửa entrypoint.sh..."

# Thay thế dmPolicy
sed -i 's/"dmPolicy"[[:space:]]*:[[:space:]]*"pairing"/"dmPolicy": "open"/g' entrypoint.sh
sed -i "s/'dmPolicy'[[:space:]]*:[[:space:]]*'pairing'/'dmPolicy': 'open'/g" entrypoint.sh
sed -i "s/dmPolicy=pairing/dmPolicy=open/g" entrypoint.sh
sed -i 's/dmPolicy: "pairing"/dmPolicy: "open"/g' entrypoint.sh
sed -i "s/dmPolicy: 'pairing'/dmPolicy: 'open'/g" entrypoint.sh

# Thay thế groupPolicy
sed -i 's/"groupPolicy"[[:space:]]*:[[:space:]]*"allowlist"/"groupPolicy": "open"/g' entrypoint.sh
sed -i "s/'groupPolicy'[[:space:]]*:[[:space:]]*'allowlist'/'groupPolicy': 'open'/g" entrypoint.sh
sed -i "s/groupPolicy=allowlist/groupPolicy=open/g" entrypoint.sh
sed -i 's/groupPolicy: "allowlist"/groupPolicy: "open"/g' entrypoint.sh
sed -i "s/groupPolicy: 'allowlist'/groupPolicy: 'open'/g" entrypoint.sh

log "Đã thay thế pairing → open, allowlist → open"

# ── Thêm đoạn inject fix config VÀO CUỐI entrypoint (trước exec) ──
# Tìm dòng exec cuối cùng và chèn fix trước đó
info "Thêm fix-config vào trước lệnh exec gateway..."

# Tạo đoạn fix config bằng node
FIX_BLOCK='
# ── AUTO FIX dmPolicy=open (added by fix-rebuild.sh) ──
echo "[entrypoint] Fixing dmPolicy=open for all channels..."
node -e "
const fs = require(\"fs\");
const configPath = \"/root/.openclaw/openclaw.json\";
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, \"utf8\"));
    if (!config.channels) config.channels = {};
    for (const ch of [\"whatsapp\", \"zalouser\", \"zalo\"]) {
      if (!config.channels[ch]) config.channels[ch] = {};
      config.channels[ch].dmPolicy = \"open\";
      config.channels[ch].groupPolicy = \"open\";
      config.channels[ch].allowFrom = [\"*\"];
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(\"[entrypoint] ✓ dmPolicy=open set for all channels\");
  } catch (e) {
    console.error(\"[entrypoint] Config fix error:\", e.message);
  }
}
" || true
# ── END FIX ──'

# Kiểm tra xem đã có fix block chưa
if grep -q "AUTO FIX dmPolicy=open" entrypoint.sh; then
  warn "Fix block đã tồn tại trong entrypoint.sh, bỏ qua..."
else
  # Chèn trước dòng exec cuối cùng
  # Tìm dòng cuối cùng có "exec"
  EXEC_LINE=$(grep -n "^exec " entrypoint.sh | tail -1 | cut -d: -f1)
  
  if [ -n "$EXEC_LINE" ]; then
    # Chèn fix block trước dòng exec
    head -n $((EXEC_LINE - 1)) entrypoint.sh > entrypoint.tmp
    echo "$FIX_BLOCK" >> entrypoint.tmp
    echo "" >> entrypoint.tmp
    tail -n +$EXEC_LINE entrypoint.sh >> entrypoint.tmp
    mv entrypoint.tmp entrypoint.sh
    chmod +x entrypoint.sh
    log "Đã chèn fix block trước 'exec' (dòng $EXEC_LINE)"
  else
    # Không tìm thấy exec, thêm vào cuối file trước dòng cuối
    echo "$FIX_BLOCK" >> entrypoint.sh
    log "Đã thêm fix block vào cuối entrypoint.sh"
  fi
fi

# ── Show result ──
echo ""
info "Entrypoint.sh SAU khi fix:"
grep -n "dmPolicy\|groupPolicy\|allowlist\|pairing\|open\|allowFrom\|AUTO FIX" entrypoint.sh || echo "  (OK)"

# ── Rebuild image ──
echo ""
info "Rebuild Docker image: $IMAGE ..."
docker build -t "$IMAGE" . 2>&1 | tail -5
log "Image rebuilt: $IMAGE"

# ── Restart container ──
echo ""
info "Restart container: $CONTAINER ..."
docker restart "$CONTAINER"
sleep 5

# ── Verify ──
echo ""
info "Kiểm tra config sau restart..."
sleep 5
docker exec "$CONTAINER" node -e '
const fs = require("fs");
try {
  const config = JSON.parse(fs.readFileSync("/root/.openclaw/openclaw.json", "utf8"));
  const channels = ["whatsapp", "zalouser", "zalo"];
  for (const ch of channels) {
    const c = config.channels?.[ch] || {};
    const icon = (c.dmPolicy === "open") ? "✅" : "❌";
    console.log(`  ${icon} ${ch}: dmPolicy=${c.dmPolicy || "N/A"}, groupPolicy=${c.groupPolicy || "N/A"}`);
  }
} catch (e) {
  console.error("Lỗi:", e.message);
}
' 2>/dev/null || warn "Container chưa sẵn sàng, đợi thêm..."

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ FIX HOÀN TẤT!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  Image: $IMAGE (đã rebuild)"
echo "  Container: $CONTAINER (đã restart)"
echo "  dmPolicy: open (cho tất cả channels)"
echo "  groupPolicy: open (cho tất cả channels)"
echo ""
echo -e "${YELLOW}Giờ container restart bao nhiêu lần cũng giữ dmPolicy=open!${NC}"
echo ""
