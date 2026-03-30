#!/usr/bin/env bash
# ============================================================================
# OpenClaw AI Helpdesk FinViet — Docker Deploy cho Ubuntu 24.04
# 1 lệnh duy nhất: curl + bash
#
# Sử dụng:
#   curl -fsSL https://raw.githubusercontent.com/NguyenKhacDanh/OpenClaw_New/main/scripts/deploy-docker-ubuntu.sh | bash
#
# Hoặc tải về rồi chạy:
#   wget -O deploy.sh https://raw.githubusercontent.com/NguyenKhacDanh/OpenClaw_New/main/scripts/deploy-docker-ubuntu.sh
#   chmod +x deploy.sh && ./deploy.sh
# ============================================================================
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[→]${NC} $*"; }
header(){ echo -e "\n${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BLUE}  $*${NC}"; echo -e "${BLUE}══════════════════════════════════════════${NC}\n"; }

# ── Config ──────────────────────────────────────────────────────
INSTALL_DIR="/opt/openclaw"
DATA_DIR="/opt/openclaw-data"
REPO_URL="https://github.com/NguyenKhacDanh/OpenClaw_New.git"
GATEWAY_PORT=19001
GATEWAY_TOKEN="80130a3a631f966a38d943e7ba21cebc2c2c6f46911b5a7b"

header "🤖 OpenClaw AI Helpdesk FinViet — Docker Deploy"
echo "Ubuntu 24.04 LTS | Docker Compose"
echo ""

# ── Step 0: Check root ─────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Script cần chạy bằng root. Dùng: sudo bash deploy.sh"
  exit 1
fi

# ── Step 1: Prompt API Keys ────────────────────────────────────
header "Step 1: Nhập API Keys"

# Hỗ trợ truyền key qua biến môi trường (cho automation)
# hoặc nhập tay qua /dev/tty (cho curl | bash)
GROQ_KEY="${GROQ_KEY:-}"
NVIDIA_KEY="${NVIDIA_KEY:-}"

if [[ -z "$GROQ_KEY" ]]; then
  echo -en "${CYAN}Groq API Key: ${NC}"
  read -r GROQ_KEY < /dev/tty
fi
if [[ -z "$GROQ_KEY" ]]; then
  err "Groq API Key không được để trống!"
  err ""
  err "Cách 1 — Tải script rồi chạy:"
  err "  curl -fsSL https://raw.githubusercontent.com/NguyenKhacDanh/OpenClaw_New/main/scripts/deploy-docker-ubuntu.sh -o deploy.sh"
  err "  sudo bash deploy.sh"
  err ""
  err "Cách 2 — Truyền key qua biến môi trường:"
  err "  sudo GROQ_KEY='gsk_xxx' NVIDIA_KEY='nvapi-xxx' bash deploy.sh"
  exit 1
fi

if [[ -z "$NVIDIA_KEY" ]]; then
  echo -en "${CYAN}NVIDIA API Key (Enter để bỏ qua): ${NC}"
  read -r NVIDIA_KEY < /dev/tty || true
fi

echo ""
log "API Keys đã lưu."

# ── Step 2: Install Docker (nếu chưa có) ──────────────────────
header "Step 2: Kiểm tra Docker"

if command -v docker &>/dev/null; then
  log "Docker đã cài: $(docker --version)"
else
  info "Cài đặt Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  log "Docker cài xong: $(docker --version)"
fi

# Verify docker compose
if docker compose version &>/dev/null; then
  log "Docker Compose: $(docker compose version --short)"
else
  err "Docker Compose plugin không tìm thấy!"
  exit 1
fi

# ── Step 3: Install Git + Clone repo ──────────────────────────
header "Step 3: Clone repository"

apt-get install -y -qq git 2>/dev/null || true

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Repo đã tồn tại, pulling latest..."
  cd "$INSTALL_DIR"
  git pull --rebase origin main
else
  info "Cloning repo..."
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
log "Repo: $INSTALL_DIR ($(git log --oneline -1))"

# ── Step 4: Setup data directories ────────────────────────────
header "Step 4: Chuẩn bị config & data"

mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/workspace"
mkdir -p "$DATA_DIR/credentials"

# ── openclaw.json ──
info "Tạo openclaw.json..."

FALLBACKS_JSON='[
          "groq/llama-3.3-70b-versatile",
          "groq/llama-3.1-8b-instant"'
if [[ -n "$NVIDIA_KEY" ]]; then
  FALLBACKS_JSON="$FALLBACKS_JSON"',
          "nvidia/nvidia/llama-3.1-nemotron-70b-instruct"'
fi
FALLBACKS_JSON="$FALLBACKS_JSON"'
        ]'

cat > "$DATA_DIR/openclaw.json" << JSONEOF
{
  "\$schema": "https://docs.openclaw.ai/schema/config.json",
  "gateway": {
    "bind": "lan",
    "port": $GATEWAY_PORT,
    "auth": {
      "mode": "token",
      "token": "$GATEWAY_TOKEN"
    },
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "dangerouslyDisableDeviceAuth": true
    }
  },
  "channels": {
    "zalouser": { "enabled": true },
    "whatsapp": { "enabled": true },
    "zalo": { "enabled": true }
  },
  "whatsapp": {
    "dmPolicy": "open",
    "allowFrom": ["*"],
    "groupPolicy": "open"
  },
  "zalouser": {
    "dmPolicy": "open",
    "allowFrom": ["*"],
    "groupPolicy": "open"
  },
  "zalo": {
    "dmPolicy": "open",
    "allowFrom": ["*"],
    "groupPolicy": "open"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "groq/meta-llama/llama-4-scout-17b-16e-instruct",
        "fallbacks": $FALLBACKS_JSON
      }
    }
  },
  "tools": {
    "profile": "minimal"
  },
  "plugins": {
    "whatsapp": { "enabled": true },
    "zalouser": { "enabled": true },
    "zalo": { "enabled": true },
    "groq": { "enabled": true }
  }
}
JSONEOF

log "openclaw.json → $DATA_DIR/openclaw.json"

# ── models.json ──
info "Tạo models.json..."

NVIDIA_MODELS=""
if [[ -n "$NVIDIA_KEY" ]]; then
  NVIDIA_MODELS=',
    {
      "provider": "nvidia",
      "name": "nvidia/llama-3.1-nemotron-70b-instruct",
      "apiKey": "'"$NVIDIA_KEY"'",
      "supportsTools": false
    }'
fi

cat > "$DATA_DIR/models.json" << MODEOF
[
    {
      "provider": "groq",
      "name": "meta-llama/llama-4-scout-17b-16e-instruct",
      "apiKey": "$GROQ_KEY",
      "maxTokens": 8192,
      "supportsTools": false
    },
    {
      "provider": "groq",
      "name": "llama-3.3-70b-versatile",
      "apiKey": "$GROQ_KEY",
      "supportsTools": false
    },
    {
      "provider": "groq",
      "name": "llama-3.1-8b-instant",
      "apiKey": "$GROQ_KEY",
      "supportsTools": false
    }$NVIDIA_MODELS
]
MODEOF

log "models.json → $DATA_DIR/models.json"

# ── auth-profiles.json ──
info "Tạo auth-profiles.json..."

AUTH_PROFILES='{ "version": 1, "profiles": { "groq:default": { "type": "api_key", "provider": "groq", "key": "'"$GROQ_KEY"'" }'
if [[ -n "$NVIDIA_KEY" ]]; then
  AUTH_PROFILES="$AUTH_PROFILES"', "nvidia:default": { "type": "api_key", "provider": "nvidia", "key": "'"$NVIDIA_KEY"'" }'
fi
AUTH_PROFILES="$AUTH_PROFILES"' } }'

echo "$AUTH_PROFILES" > "$DATA_DIR/auth-profiles.json"
log "auth-profiles.json → $DATA_DIR/auth-profiles.json"

# ── AGENTS.md (workspace) ──
if [[ ! -f "$DATA_DIR/workspace/AGENTS.md" ]]; then
  info "Tạo workspace AGENTS.md mặc định..."
  cat > "$DATA_DIR/workspace/AGENTS.md" << 'AGENTSEOF'
# AGENTS

Bạn là **AI Helpdesk FinViet** — bot hỗ trợ Helpdesk IT của công ty **FinViet**.

## QUY TẮC TRẢ LỜI
- LUÔN ưu tiên trả lời dựa trên kiến thức bên dưới (Knowledge Base).
- Nếu câu hỏi nằm trong KB: trả lời chính xác theo KB.
- Nếu câu hỏi KHÔNG có trong KB: hướng dẫn liên hệ IT Support.
- Chuyên nghiệp, lịch sự, đi thẳng vào vấn đề.
- Greeting: "Xin chào! Tôi là AI Helpdesk FinViet 🤖. Tôi có thể hỗ trợ bạn vấn đề IT gì hôm nay?"

## Thông tin liên hệ IT Support

- **Email:** it.support@finviet.com.vn
- **Service Portal:** https://hotro.finviet.com.vn
AGENTSEOF
  log "AGENTS.md → $DATA_DIR/workspace/AGENTS.md"
fi

# ── Step 5: Create docker-compose.override.yml ────────────────
header "Step 5: Tạo Docker Compose config"

cat > "$INSTALL_DIR/docker-compose.override.yml" << COMPEOF
services:
  openclaw-gateway:
    environment:
      OPENCLAW_GATEWAY_TOKEN: "$GATEWAY_TOKEN"
      OPENCLAW_ALLOW_INSECURE_PRIVATE_WS: "1"
      TZ: "Asia/Ho_Chi_Minh"
    ports:
      - "$GATEWAY_PORT:18789"
      - "18790:18790"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "lan",
        "--port",
        "18789",
      ]
COMPEOF

# ── .env for docker compose ──
cat > "$INSTALL_DIR/.env" << ENVEOF
OPENCLAW_IMAGE=openclaw:local
OPENCLAW_CONFIG_DIR=$DATA_DIR
OPENCLAW_WORKSPACE_DIR=$DATA_DIR/workspace
OPENCLAW_GATEWAY_PORT=$GATEWAY_PORT
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=$GATEWAY_TOKEN
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1
OPENCLAW_TZ=Asia/Ho_Chi_Minh
ENVEOF

log "Docker Compose config → $INSTALL_DIR/"

# ── Step 6: Build Docker image ────────────────────────────────
header "Step 6: Build Docker image (có thể mất 5-15 phút)"

cd "$INSTALL_DIR"
info "Building openclaw:local ..."
docker build -t openclaw:local . 2>&1 | tail -20
log "Docker image built: openclaw:local"

# ── Step 7: Start gateway ─────────────────────────────────────
header "Step 7: Khởi động Gateway"

# Stop old containers nếu có
docker compose down 2>/dev/null || true

info "Starting gateway..."
docker compose up -d openclaw-gateway

# Wait for health
info "Đợi gateway khởi động..."
for i in $(seq 1 30); do
  if docker compose ps --format json 2>/dev/null | grep -q '"healthy"'; then
    break
  fi
  sleep 2
done

log "Gateway đang chạy!"

# ── Step 8: Summary ───────────────────────────────────────────
header "✅ DEPLOY HOÀN TẤT!"

LOCAL_IP=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}Gateway URL:${NC}  http://$LOCAL_IP:$GATEWAY_PORT"
echo -e "${GREEN}Token:${NC}        $GATEWAY_TOKEN"
echo -e "${GREEN}Config:${NC}       $DATA_DIR/openclaw.json"
echo -e "${GREEN}Workspace:${NC}    $DATA_DIR/workspace/"
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  BƯỚC TIẾP THEO: Login Zalo                     ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  docker compose -f $INSTALL_DIR/docker-compose.yml \\${NC}"
echo -e "${CYAN}║    exec openclaw-gateway \\                       ║${NC}"
echo -e "${CYAN}║    node dist/index.js channels login zalouser    ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  Hoặc dùng CLI container:                        ║${NC}"
echo -e "${CYAN}║  docker compose -f $INSTALL_DIR/docker-compose.yml \\${NC}"
echo -e "${CYAN}║    run --rm openclaw-cli channels login zalouser ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  → Quét QR bằng Zalo trên điện thoại            ║${NC}"
echo -e "${CYAN}║  → Không cần approve — ai nhắn cũng được!       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Các lệnh quản lý:${NC}"
echo "  Xem logs:     cd $INSTALL_DIR && docker compose logs -f openclaw-gateway"
echo "  Restart:       cd $INSTALL_DIR && docker compose restart openclaw-gateway"
echo "  Stop:          cd $INSTALL_DIR && docker compose down"
echo "  Update code:   cd $INSTALL_DIR && git pull && docker build -t openclaw:local . && docker compose up -d"
echo ""
