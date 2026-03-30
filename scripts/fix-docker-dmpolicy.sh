#!/usr/bin/env bash
# ============================================================================
# Fix dmPolicy cho Docker container openclaw-bot
# 
# Script này sẽ:
#   1. Sửa entrypoint.sh bên trong container để KHÔNG ghi đè config
#   2. Đặt dmPolicy=open, groupPolicy=open cho tất cả channels
#   3. Commit thay đổi vào image → restart an toàn
#
# Chạy trên Ubuntu server:
#   curl -fsSL https://raw.githubusercontent.com/NguyenKhacDanh/OpenClaw_New/main/scripts/fix-docker-dmpolicy.sh | sudo bash
#
# Hoặc:
#   sudo bash fix-docker-dmpolicy.sh
#
# Hoặc chỉ định container name:
#   sudo bash fix-docker-dmpolicy.sh my-container-name
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

CONTAINER="${1:-openclaw-bot}"

echo -e "\n${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  Fix dmPolicy=open cho container: $CONTAINER${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}\n"

# ── Check container exists ──
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  err "Container '$CONTAINER' không tồn tại!"
  echo "Containers hiện có:"
  docker ps -a --format '  {{.Names}} ({{.Status}})'
  exit 1
fi

info "Container: $CONTAINER"

# ── Step 1: Xem entrypoint.sh hiện tại ──
echo ""
info "Đọc entrypoint.sh hiện tại..."
if docker exec "$CONTAINER" cat /entrypoint.sh &>/dev/null; then
  echo -e "${YELLOW}--- Entrypoint hiện tại ---${NC}"
  docker exec "$CONTAINER" cat /entrypoint.sh
  echo -e "${YELLOW}--- End ---${NC}"
  HAS_ENTRYPOINT=true
else
  warn "Không tìm thấy /entrypoint.sh — container có thể dùng CMD trực tiếp"
  HAS_ENTRYPOINT=false
fi

# ── Step 2: Tạo wrapper entrypoint mới ──
echo ""
info "Tạo entrypoint mới (không ghi đè dmPolicy)..."

# Tạo script fix-config chạy TRƯỚC gateway
docker exec "$CONTAINER" bash -c 'cat > /fix-config.sh << '\''FIXEOF'\''
#!/usr/bin/env bash
# Fix dmPolicy — chạy sau khi config đã được tạo
CONFIG_FILE="/root/.openclaw/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[fix-config] Config chưa tồn tại, bỏ qua..."
  exit 0
fi

echo "[fix-config] Đặt dmPolicy=open cho tất cả channels..."

# Dùng node để sửa JSON an toàn
node -e '\'''\'''\''
const fs = require("fs");
const configPath = "/root/.openclaw/openclaw.json";

try {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  // Đảm bảo channels object tồn tại
  if (!config.channels) config.channels = {};
  
  // Danh sách channels cần fix
  const channelNames = ["whatsapp", "zalouser", "zalo"];
  
  for (const ch of channelNames) {
    if (!config.channels[ch]) config.channels[ch] = {};
    config.channels[ch].dmPolicy = "open";
    config.channels[ch].groupPolicy = "open";
    config.channels[ch].allowFrom = ["*"];
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("[fix-config] ✓ Config đã cập nhật:");
  for (const ch of channelNames) {
    console.log("  " + ch + ": dmPolicy=open, groupPolicy=open, allowFrom=[*]");
  }
} catch (e) {
  console.error("[fix-config] ✗ Lỗi:", e.message);
  process.exit(1);
}
'\'''\'''\''
FIXEOF'

docker exec "$CONTAINER" chmod +x /fix-config.sh

# ── Step 3: Tạo wrapper entrypoint ──
info "Tạo wrapper entrypoint..."

docker exec "$CONTAINER" bash -c 'cat > /entrypoint-wrapper.sh << '\''WRAPEOF'\''
#!/usr/bin/env bash
set -e

# Chạy entrypoint gốc nếu có (tạo config ban đầu)
if [ -f /entrypoint-original.sh ]; then
  echo "[wrapper] Chạy entrypoint gốc..."
  bash /entrypoint-original.sh &
  GATEWAY_PID=$!
  
  # Đợi gateway khởi động (tạo config xong)
  echo "[wrapper] Đợi gateway khởi động..."
  sleep 8
  
  # Kill gateway tạm
  kill $GATEWAY_PID 2>/dev/null || true
  wait $GATEWAY_PID 2>/dev/null || true
  sleep 2
fi

# Fix config TRƯỚC khi start gateway thật
echo "[wrapper] Áp dụng fix dmPolicy=open..."
bash /fix-config.sh

# Start gateway thật
echo "[wrapper] Khởi động gateway..."
exec node openclaw.mjs gateway run --bind lan --port ${PORT:-19001} --force
WRAPEOF'

docker exec "$CONTAINER" chmod +x /entrypoint-wrapper.sh

# ── Step 4: Backup entrypoint gốc ──
if [ "$HAS_ENTRYPOINT" = true ]; then
  info "Backup entrypoint gốc..."
  docker exec "$CONTAINER" bash -c '
    if [ ! -f /entrypoint-original.sh ]; then
      cp /entrypoint.sh /entrypoint-original.sh
    fi
  '
fi

# ── Step 5: Fix config NGAY BÂY GIỜ (không cần restart) ──
echo ""
info "Fix config ngay bây giờ (trong container đang chạy)..."
docker exec "$CONTAINER" bash /fix-config.sh

# ── Step 6: Commit thay đổi vào image ──
echo ""
info "Commit thay đổi vào Docker image..."

# Lấy image name hiện tại
CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo "openclaw:v1")
info "Image hiện tại: $CURRENT_IMAGE"

# Commit với entrypoint mới
docker commit \
  --change='ENTRYPOINT ["/bin/bash", "/entrypoint-wrapper.sh"]' \
  --change='CMD []' \
  "$CONTAINER" \
  "${CURRENT_IMAGE}-fixed"

log "Image mới: ${CURRENT_IMAGE}-fixed"

# ── Step 7: Hướng dẫn ──
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ FIX HOÀN TẤT!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Đã thực hiện:${NC}"
echo "  1. ✓ Fix config ngay trong container đang chạy"
echo "  2. ✓ Tạo image mới: ${CURRENT_IMAGE}-fixed"
echo "  3. ✓ Entrypoint mới sẽ tự fix dmPolicy=open sau mỗi restart"
echo ""
echo -e "${YELLOW}Để dùng image mới (bền vững qua restart):${NC}"
echo ""
echo "  # Cách 1: Thay thế container hiện tại"
echo "  docker stop $CONTAINER"
echo "  docker rm $CONTAINER"
echo "  docker run -d --name $CONTAINER \\"
echo "    -p 19001:19001 \\"
echo "    -v openclaw_data:/root/.openclaw \\"
echo "    -e PORT=19001 \\"
echo "    -e TZ=Asia/Ho_Chi_Minh \\"
echo "    ${CURRENT_IMAGE}-fixed"
echo ""
echo "  # Cách 2: Tag lại image gốc"
echo "  docker tag ${CURRENT_IMAGE}-fixed ${CURRENT_IMAGE}"
echo "  docker restart $CONTAINER"
echo ""
echo -e "${YELLOW}Hoặc không cần restart — config đã được fix rồi!${NC}"
echo -e "${YELLOW}Bot sẽ phản hồi tất cả tin nhắn ngay bây giờ.${NC}"
echo ""

# ── Step 8: Verify ──
echo -e "${CYAN}Kiểm tra config hiện tại:${NC}"
docker exec "$CONTAINER" node -e '
const fs = require("fs");
try {
  const config = JSON.parse(fs.readFileSync("/root/.openclaw/openclaw.json", "utf8"));
  const channels = ["whatsapp", "zalouser", "zalo"];
  for (const ch of channels) {
    const c = config.channels?.[ch] || {};
    const icon = (c.dmPolicy === "open") ? "✅" : "❌";
    console.log(`  ${icon} ${ch}: dmPolicy=${c.dmPolicy || "N/A"}, groupPolicy=${c.groupPolicy || "N/A"}, allowFrom=${JSON.stringify(c.allowFrom || [])}`);
  }
} catch (e) {
  console.error("Lỗi đọc config:", e.message);
}
'
echo ""
