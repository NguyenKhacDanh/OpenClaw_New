# AI Helpdesk FinViet

Trợ lý IT Helpdesk tự động cho công ty FinViet, chạy trên nền tảng [OpenClaw](https://github.com/openclaw/openclaw).

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🤖 **AI Auto-Reply** | Tự động trả lời câu hỏi IT qua WhatsApp & Zalo |
| 📚 **Knowledge Base** | Import PDF, Word, Excel, text — tự xử lý encoding UTF-8 |
| 📋 **Ticket System** | Tạo & quản lý ticket với SLA tracking |
| 🔄 **Auto-Retry** | Tự động gửi lại khi AI provider lỗi, provider failover |
| 📊 **Dashboard** | Admin UI bật/tắt agent, QR, report, chỉnh agent profile |
| 📱 **Multi-Channel** | WhatsApp + Zalo OA + Zalo cá nhân |

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────┐
│               Admin Dashboard (:3847)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ Agent    │ │ QR Mgmt  │ │ Reports          ││
│  │ Toggle   │ │ WA/Zalo  │ │ Ticket/Retry/SLA ││
│  └──────────┘ └──────────┘ └──────────────────┘│
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              OpenClaw Gateway                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐       │
│  │WhatsApp │ │ Zalo    │ │ Zalo User   │       │
│  │(Baileys)│ │ (OA API)│ │ (ZCA Client)│       │
│  └────┬────┘ └────┬────┘ └──────┬──────┘       │
│       └───────────┼─────────────┘               │
│                   ▼                              │
│  ┌────────────────────────────────────┐         │
│  │      AI Helpdesk FinViet Agent     │         │
│  │  ┌──────────┐ ┌────────────────┐  │         │
│  │  │  System   │ │ Knowledge Base │  │         │
│  │  │  Prompt   │ │ (Full-text)    │  │         │
│  │  └──────────┘ └────────────────┘  │         │
│  │  ┌──────────┐ ┌────────────────┐  │         │
│  │  │  Ticket   │ │ Retry Engine   │  │         │
│  │  │  System   │ │ (Failover)     │  │         │
│  │  └──────────┘ └────────────────┘  │         │
│  └────────────────────────────────────┘         │
│                   │                              │
│  ┌────────────────▼──────────────────┐          │
│  │        LLM Providers              │          │
│  │  Groq (primary) → GitHub (backup) │          │
│  └───────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

## 🚀 Hướng dẫn cài đặt

### 1. Chuẩn bị
```bash
# Clone repo OpenClaw
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Cài dependencies
pnpm install
```

### 2. Cấu hình API Keys
```bash
cd helpdesk-finviet

# Copy file env mẫu
cp .env.example .env

# Sửa file .env, điền API key thật:
# GROQ_API_KEY=gsk_xxxxx
# GITHUB_TOKEN=ghp_xxxxx
```

### 3. Copy config vào OpenClaw
```bash
# Copy cấu hình agent vào OpenClaw
# Windows:
copy openclaw.json %USERPROFILE%\.openclaw\openclaw.json

# Linux/Mac:
cp openclaw.json ~/.openclaw/openclaw.json
```

### 4. Kết nối WhatsApp
```bash
# Chạy setup WhatsApp (sẽ hiện QR code)
openclaw whatsapp setup

# Mở WhatsApp trên điện thoại → Linked Devices → Quét QR
```

### 5. Kết nối Zalo cá nhân
```bash
# Chạy setup Zalo User (sẽ hiện QR code)
openclaw zalouser setup

# Mở Zalo trên điện thoại → Quét QR
```

### 6. Khởi chạy

```bash
# Chạy Admin Dashboard
cd helpdesk-finviet
npx tsx src/index.ts

# Trong terminal khác, chạy OpenClaw Gateway
openclaw gateway run
```

### 7. Import tài liệu IT
```bash
# Import từ file text/markdown
npx tsx scripts/import-kb.ts ./data/sample-docs/reset-mat-khau-office365.md account

# Import file PDF
npx tsx scripts/import-kb.ts ./docs/huong-dan-vpn.pdf network

# Import file Word (.docx)
npx tsx scripts/import-kb.ts ./docs/it-policy.docx security

# Import file Excel (.xlsx)
npx tsx scripts/import-kb.ts ./docs/inventory.xlsx hardware

# Import cả thư mục (hỗ trợ mix nhiều format)
npx tsx scripts/import-kb.ts ./data/sample-docs/ general

# Hoặc import qua Admin Dashboard (http://localhost:3847)
# → Kéo thả file PDF/Word/Excel vào upload zone
```

### Định dạng file hỗ trợ

| Format | Extension | Thư viện | Ghi chú |
|--------|-----------|----------|---------|
| PDF | `.pdf` | pdf-parse | Text-based PDF (scan/image cần OCR) |
| Word | `.docx` | mammoth | OOXML format |
| Excel | `.xlsx` | xlsx (SheetJS) | Tất cả sheets, UTF-8 |
| CSV | `.csv` | Built-in | Auto-detect delimiter |
| Text | `.txt` | Built-in | Auto-detect encoding |
| Markdown | `.md` | Built-in | Giữ nguyên format |
| JSON | `.json` | Built-in | Extract text values |

**Encoding**: Tự động detect và chuẩn hóa UTF-8. Fix Vietnamese mojibake (Windows-1252 → UTF-8).

## 📱 Sử dụng

Sau khi setup xong, AI Helpdesk FinViet sẽ:

1. **Tự động nhận tin nhắn** từ WhatsApp & Zalo
2. **Tìm kiếm KB** trước khi trả lời
3. **Trả lời tiếng Việt** ngắn gọn, chính xác
4. **Tạo ticket** khi cần escalate
5. **Tự động retry** khi gặp lỗi provider

## 📊 Admin Dashboard

Truy cập `http://localhost:3847`:

- **Bật/Tắt Agent** — toggle nhanh
- **Kênh liên lạc** — xem trạng thái WhatsApp, Zalo, quét QR
- **Knowledge Base** — import, tìm kiếm, quản lý tài liệu
- **Reports** — ticket stats, retry report, SLA overdue

## 🔧 LLM Providers

| Provider | Model | Vai trò |
|----------|-------|---------|
| **Groq** | llama-4-scout-17b-16e-instruct | Primary |
| **Groq** | llama-3.3-70b-versatile | Fallback 1 |
| **GitHub** | gpt-4.1-mini | Fallback 2 |

Khi Groq gặp lỗi (rate limit, timeout), hệ thống tự động chuyển sang fallback và thử lại primary sau 5 phút.

## 📁 Cấu trúc thư mục

```
helpdesk-finviet/
├── openclaw.json          # Config OpenClaw cho agent
├── AGENTS.md              # System prompt (tự generate từ Agent Profile)
├── .env                   # API keys (KHÔNG commit!)
├── .env.example           # Template API keys
├── package.json
├── src/
│   ├── index.ts           # Entry point
│   ├── file-parser.ts     # Parse PDF/Word/Excel + encoding UTF-8
│   ├── knowledge-base.ts  # Module KB (search, import, delete)
│   ├── ticket-system.ts   # Module ticket + SLA
│   ├── retry-engine.ts    # Module retry/failover
│   └── admin-dashboard.ts # Admin UI + API server
├── scripts/
│   ├── import-kb.ts       # Script import tài liệu (all formats)
│   └── generate-report.ts # Script tạo báo cáo
├── data/
│   └── sample-docs/       # Tài liệu mẫu IT
└── workspace/
    └── HEARTBEAT.md       # Heartbeat check config
```

## ⚠️ Bảo mật

- **KHÔNG** commit file `.env` lên git
- **KHÔNG** chia sẻ API key trong chat/email
- Đổi `FINVIET_HELPDESK_ADMIN_PASSWORD` trước khi dùng production
- Dùng `allowFrom` trong config để giới hạn ai được nhắn tin với bot
