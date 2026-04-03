/**
 * NKD Custom Tab — AI Helpdesk FinViet integrated into OpenClaw Gateway UI.
 *
 * ALL communication goes through gateway RPC (nkd.* methods).
 * No external HTTP server needed — everything runs inside the gateway.
 */

import { html, nothing, type TemplateResult } from "lit";
import type { AppViewState } from "../app-view-state.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NkdCustomProps = {
  state: AppViewState;
};

// ---------------------------------------------------------------------------
// State reference (stored on init so all helpers can access gateway RPC)
// ---------------------------------------------------------------------------

let _state: AppViewState | null = null;

function rpc<T = any>(method: string, params?: Record<string, unknown>): Promise<T> {
  if (!_state?.client || !_state.connected) {
    return Promise.reject(new Error("Chưa kết nối gateway"));
  }
  return _state.client.request<T>(method, params ?? {});
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderNkdCustom(props: NkdCustomProps): TemplateResult {
  return html`
    <div class="view-container" style="padding:24px; max-width:1200px; margin:0 auto;">
      <style>
        .nkd-section {
          background: var(--color-surface, #1e293b);
          border-radius: var(--radius-lg, 12px);
          padding: 24px;
          border: 1px solid var(--color-border, #334155);
          margin-bottom: 20px;
        }
        .nkd-section h2 {
          font-size: 18px;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nkd-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .nkd-stat-card {
          background: var(--color-bg, #0f172a);
          border-radius: var(--radius-md, 8px);
          padding: 16px;
          text-align: center;
        }
        .nkd-stat-card .label {
          color: var(--color-muted, #94a3b8);
          font-size: 12px;
          text-transform: uppercase;
        }
        .nkd-stat-card .value {
          font-size: 28px;
          font-weight: 700;
          margin-top: 4px;
        }
        .nkd-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }
        .nkd-input,
        .nkd-select,
        .nkd-textarea {
          width: 100%;
          padding: 10px;
          border-radius: var(--radius-md, 8px);
          border: 1px solid var(--color-border, #475569);
          background: var(--color-bg, #0f172a);
          color: var(--color-text, #e2e8f0);
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .nkd-textarea {
          min-height: 80px;
          resize: vertical;
        }
        .nkd-label {
          display: block;
          color: var(--color-muted, #94a3b8);
          font-size: 12px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .nkd-btn {
          padding: 8px 16px;
          border-radius: var(--radius-md, 8px);
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
        }
        .nkd-btn-primary {
          background: var(--color-accent, #3b82f6);
          color: #fff;
        }
        .nkd-btn-primary:hover {
          opacity: 0.9;
        }
        .nkd-btn-success {
          background: #22c55e;
          color: #fff;
        }
        .nkd-btn-success:hover {
          opacity: 0.9;
        }
        .nkd-btn-danger {
          background: #ef4444;
          color: #fff;
        }
        .nkd-btn-danger:hover {
          opacity: 0.9;
        }
        .nkd-btn-sm {
          padding: 4px 10px;
          font-size: 12px;
        }
        .nkd-channel-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--color-bg, #0f172a);
          border-radius: var(--radius-md, 8px);
          margin-bottom: 8px;
        }
        .nkd-channel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .nkd-channel-dot.on {
          background: #22c55e;
        }
        .nkd-channel-dot.off {
          background: #ef4444;
        }
        .nkd-channel-name {
          flex: 1;
          font-weight: 600;
        }
        .nkd-qr-wrap {
          margin-top: 12px;
          padding: 16px;
          background: #fff;
          border-radius: var(--radius-md, 8px);
          display: inline-block;
          text-align: center;
        }
        .nkd-qr-wrap img {
          width: 260px;
          height: 260px;
          image-rendering: pixelated;
        }
        .nkd-doc-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--color-bg, #0f172a);
          border-radius: var(--radius-md, 8px);
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .nkd-doc-title {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
          min-width: 120px;
        }
        .nkd-doc-meta {
          color: var(--color-muted, #94a3b8);
          font-size: 12px;
        }
        .nkd-doc-cat {
          background: var(--color-border, #334155);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          color: var(--color-muted, #94a3b8);
        }
        .nkd-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #22c55e;
          color: #fff;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          z-index: 200;
          display: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .nkd-toast.error {
          background: #ef4444;
        }
        .nkd-tab-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .nkd-tab-btn {
          padding: 8px 16px;
          border-radius: var(--radius-md, 8px);
          border: 1px solid var(--color-border, #475569);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          background: var(--color-bg, #0f172a);
          color: var(--color-muted, #94a3b8);
          transition: 0.15s;
          font-family: inherit;
        }
        .nkd-tab-btn.active {
          background: var(--color-accent, #3b82f6);
          color: #fff;
          border-color: var(--color-accent, #3b82f6);
        }
        .nkd-drop-zone {
          border: 2px dashed var(--color-border, #475569);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 12px;
          cursor: pointer;
          transition: 0.2s;
        }
        .nkd-drop-zone:hover {
          border-color: var(--color-accent, #3b82f6);
        }
        .nkd-prompt-preview {
          background: var(--color-bg, #0f172a);
          padding: 16px;
          border-radius: var(--radius-md, 8px);
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-size: 13px;
          color: var(--color-text-secondary, #cbd5e1);
          border: 1px solid var(--color-border, #334155);
          margin-top: 8px;
        }
      </style>

      <div class="nkd-toast" id="nkd-toast"></div>

      <div style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <h1 style="font-size:24px; display:flex; align-items:center; gap:10px; margin:0;">
            🤖 NKD Custom — AI Helpdesk FinViet
          </h1>
          <button
            class="nkd-btn nkd-btn-sm"
            style="background:#ef4444; color:#fff; margin-left:auto;"
            @click=${() => nkdRestartGateway()}
          >
            🔄 Restart Gateway
          </button>
        </div>
        <p style="color:var(--color-muted, #94a3b8); font-size:14px; margin-top:6px;">
          Quản lý Knowledge Base, Agent, Kênh liên lạc & Tickets — tất cả qua Gateway RPC
        </p>
      </div>

      <div class="nkd-tab-bar">
        <button class="nkd-tab-btn active" id="nkd-subtab-kb" @click=${() => nkdSwitchSubtab("kb")}>
          📚 Knowledge Base
        </button>
        <button class="nkd-tab-btn" id="nkd-subtab-agent" @click=${() => nkdSwitchSubtab("agent")}>
          ⚙️ Agent Settings
        </button>
        <button
          class="nkd-tab-btn"
          id="nkd-subtab-channels"
          @click=${() => nkdSwitchSubtab("channels")}
        >
          📱 Channels & QR
        </button>
        <button
          class="nkd-tab-btn"
          id="nkd-subtab-tickets"
          @click=${() => nkdSwitchSubtab("tickets")}
        >
          📋 Tickets & Reports
        </button>
        <button
          class="nkd-tab-btn"
          id="nkd-subtab-apikeys"
          @click=${() => nkdSwitchSubtab("apikeys")}
        >
          🔑 API Keys
        </button>
        <button
          class="nkd-tab-btn"
          id="nkd-subtab-sessions"
          @click=${() => nkdSwitchSubtab("sessions")}
        >
          🧹 Sessions
        </button>
        <button
          class="nkd-tab-btn"
          id="nkd-subtab-workspace"
          @click=${() => nkdSwitchSubtab("workspace")}
        >
          📝 Workspace
        </button>
      </div>

      <!-- KB -->
      <div id="nkd-panel-kb">
        <div class="nkd-section">
          <h2>📚 Knowledge Base</h2>
          <div
            style="display:flex; gap:10px; margin-bottom:12px; align-items:center; flex-wrap:wrap;"
          >
            <span id="nkd-kb-count" style="color:var(--color-muted);">Loading...</span>
            <button class="nkd-btn nkd-btn-primary nkd-btn-sm" @click=${() => nkdRefreshKB()}>
              🔄 Refresh
            </button>
            <button
              class="nkd-btn nkd-btn-sm"
              style="background:#8b5cf6; color:#fff;"
              @click=${() => nkdViewRawData()}
            >
              📋 Xem JSON Data
            </button>
            <input
              class="nkd-input"
              type="text"
              id="nkd-kb-search"
              placeholder="🔍 Tìm kiếm tài liệu..."
              style="flex:1; min-width:200px; margin-bottom:0;"
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") nkdSearchKB();
              }}
            />
            <button class="nkd-btn nkd-btn-primary nkd-btn-sm" @click=${() => nkdSearchKB()}>
              Tìm
            </button>
          </div>
          <div id="nkd-raw-data-panel" style="display:none; margin-bottom:16px;">
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <label class="nkd-label" style="margin-bottom:0;"
                >📋 Raw JSON Data (tất cả dữ liệu):</label
              >
              <button
                class="nkd-btn nkd-btn-sm"
                style="background:var(--color-border); color:var(--color-muted);"
                @click=${() => nkdCopyRawData()}
              >
                📋 Copy
              </button>
              <button
                class="nkd-btn nkd-btn-sm"
                style="background:#16a34a; color:#fff;"
                @click=${() => nkdSaveRawData()}
              >
                💾 Lưu JSON
              </button>
              <button
                class="nkd-btn nkd-btn-danger nkd-btn-sm"
                @click=${() => {
                  const p = document.getElementById("nkd-raw-data-panel");
                  if (p) p.style.display = "none";
                }}
              >
                ✕ Đóng
              </button>
            </div>
            <textarea
              class="nkd-textarea"
              id="nkd-raw-data-content"
              style="min-height:300px; max-height:500px; font-family:monospace; font-size:12px; white-space:pre;"
            ></textarea>
          </div>
          <div id="nkd-kb-doc-list" style="max-height:500px; overflow-y:auto; margin-bottom:16px;">
            <p style="color:var(--color-muted); text-align:center; padding:20px;">Đang tải...</p>
          </div>
          <div
            id="nkd-doc-detail-panel"
            style="display:none; margin-bottom:16px; background:var(--color-bg); border:1px solid var(--color-border); border-radius:8px; padding:16px;"
          >
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <h3 id="nkd-doc-detail-title" style="flex:1; font-size:15px; margin:0;"></h3>
              <button
                class="nkd-btn nkd-btn-sm"
                style="background:var(--color-border); color:var(--color-muted);"
                @click=${() => {
                  const p = document.getElementById("nkd-doc-detail-panel");
                  if (p) p.style.display = "none";
                }}
              >
                ✕ Đóng
              </button>
            </div>
            <div
              id="nkd-doc-detail-meta"
              style="color:var(--color-muted); font-size:12px; margin-bottom:8px;"
            ></div>
            <textarea
              class="nkd-textarea"
              id="nkd-doc-detail-content"
              style="min-height:200px; max-height:400px; font-family:monospace; font-size:13px; white-space:pre-wrap;"
              readonly
            ></textarea>
          </div>
          <h3
            style="font-size:15px; margin-bottom:12px; cursor:pointer;"
            @click=${() => nkdToggle("nkd-import-form")}
          >
            📥 Import tài liệu mới
            <span style="font-size:12px; color:var(--color-muted);">(click để mở/đóng)</span>
          </h3>
          <div id="nkd-import-form" style="display:none;">
            <div style="display:flex; gap:4px; margin-bottom:12px;">
              <button
                class="nkd-btn nkd-btn-sm nkd-btn-primary"
                id="nkd-imp-tab-text"
                @click=${() => nkdSwitchImport("text")}
              >
                📝 Paste text
              </button>
              <button
                class="nkd-btn nkd-btn-sm"
                id="nkd-imp-tab-file"
                @click=${() => nkdSwitchImport("file")}
                style="background:var(--color-border); color:var(--color-muted);"
              >
                📎 Upload file
              </button>
            </div>
            <input
              class="nkd-input"
              type="text"
              id="nkd-kb-title"
              placeholder="Tiêu đề tài liệu (tùy chọn)..."
            />
            <div class="nkd-form-row">
              <select class="nkd-select" id="nkd-kb-category">
                <option value="general">📁 Chung</option>
                <option value="network">🌐 Mạng / WiFi / VPN</option>
                <option value="hardware">🖥️ Phần cứng</option>
                <option value="software">💿 Phần mềm</option>
                <option value="account">🔑 Tài khoản / Mật khẩu</option>
                <option value="email">📧 Email / Office 365</option>
                <option value="security">🛡️ Bảo mật</option>
                <option value="internal-app">🏢 Phần mềm nội bộ</option>
              </select>
              <input
                class="nkd-input"
                type="text"
                id="nkd-kb-tags"
                placeholder="Tags (phân cách bằng dấu phẩy)..."
              />
            </div>
            <div id="nkd-import-text">
              <textarea
                class="nkd-textarea"
                id="nkd-kb-content"
                placeholder="Dán nội dung tài liệu vào đây..."
                style="min-height:120px;"
              ></textarea>
              <button class="nkd-btn nkd-btn-success" @click=${() => nkdImportText()}>
                📥 Import text
              </button>
            </div>
            <div id="nkd-import-file" style="display:none;">
              <div
                class="nkd-drop-zone"
                id="nkd-drop-zone"
                @dragover=${(e: DragEvent) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--color-accent, #3b82f6)";
                }}
                @dragleave=${(e: DragEvent) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--color-border, #475569)";
                }}
                @drop=${(e: DragEvent) => nkdHandleDrop(e)}
                @click=${() =>
                  (document.getElementById("nkd-file-input") as HTMLInputElement)?.click()}
              >
                <input
                  type="file"
                  id="nkd-file-input"
                  style="display:none;"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
                  @change=${(e: Event) => nkdHandleFileSelect(e)}
                />
                <p style="font-size:32px; margin-bottom:8px;">📎</p>
                <p style="color:var(--color-muted);">
                  Kéo thả file hoặc
                  <span style="color:var(--color-accent, #3b82f6); text-decoration:underline;"
                    >chọn file</span
                  >
                </p>
                <p style="color:var(--color-muted); font-size:12px; margin-top:8px;">
                  PDF, Word, Excel, CSV, TXT, Markdown, JSON
                </p>
              </div>
              <div
                id="nkd-file-preview"
                style="display:none; background:var(--color-bg); border-radius:8px; padding:12px; margin-bottom:12px;"
              >
                <div style="display:flex; align-items:center; gap:8px;">
                  <span id="nkd-file-icon" style="font-size:24px;">📄</span>
                  <div style="flex:1;">
                    <div id="nkd-file-name" style="font-weight:600;"></div>
                    <div id="nkd-file-size" style="color:var(--color-muted); font-size:12px;"></div>
                  </div>
                  <button class="nkd-btn nkd-btn-danger nkd-btn-sm" @click=${() => nkdClearFile()}>
                    ✕
                  </button>
                </div>
              </div>
              <button
                class="nkd-btn nkd-btn-success"
                id="nkd-upload-btn"
                disabled
                @click=${() => nkdUploadFile()}
              >
                📤 Upload & Import
              </button>
              <span
                id="nkd-upload-progress"
                style="color:var(--color-muted); font-size:13px; margin-left:8px;"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Agent Settings -->
      <div id="nkd-panel-agent" style="display:none;">
        <div class="nkd-section">
          <h2>⚙️ Cài đặt Agent</h2>
          <div class="nkd-form-row">
            <div>
              <label class="nkd-label">Tên Agent</label
              ><input
                class="nkd-input"
                type="text"
                id="nkd-ag-name"
                placeholder="AI Helpdesk FinViet"
              />
            </div>
            <div>
              <label class="nkd-label">Tên công ty</label
              ><input class="nkd-input" type="text" id="nkd-ag-company" placeholder="FinViet" />
            </div>
          </div>
          <div class="nkd-form-row">
            <div>
              <label class="nkd-label">Phong cách</label
              ><select class="nkd-select" id="nkd-ag-tone">
                <option value="professional">🏢 Chuyên nghiệp</option>
                <option value="friendly">😊 Thân thiện</option>
                <option value="casual">💬 Thoải mái</option>
              </select>
            </div>
            <div>
              <label class="nkd-label">Ngôn ngữ</label
              ><select class="nkd-select" id="nkd-ag-lang">
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇺🇸 English</option>
                <option value="both">🌐 Cả hai</option>
              </select>
            </div>
          </div>
          <div class="nkd-form-row">
            <div>
              <label class="nkd-label">Ticket prefix</label
              ><input class="nkd-input" type="text" id="nkd-ag-prefix" placeholder="FV" />
            </div>
            <div>
              <label class="nkd-label">Phạm vi hỗ trợ</label
              ><input
                class="nkd-input"
                type="text"
                id="nkd-ag-scope"
                placeholder="IT Helpdesk: mạng, phần mềm..."
              />
            </div>
          </div>
          <label class="nkd-label">Lời chào</label>
          <textarea
            class="nkd-textarea"
            id="nkd-ag-greeting"
            style="min-height:60px;"
            placeholder="Xin chào! Tôi là..."
          ></textarea>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="nkd-btn nkd-btn-success" @click=${() => nkdSaveProfile()}>
              💾 Lưu cài đặt
            </button>
            <button class="nkd-btn nkd-btn-primary" @click=${() => nkdPreviewPrompt()}>
              👁️ Xem / Sửa System Prompt
            </button>
          </div>
          <div id="nkd-prompt-box" style="display:none; margin-top:12px;">
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <label class="nkd-label" style="margin-bottom:0; flex:1;"
                >System Prompt (AGENTS.md) — có thể sửa trực tiếp:</label
              >
              <button class="nkd-btn nkd-btn-success nkd-btn-sm" @click=${() => nkdSavePrompt()}>
                💾 Lưu Prompt
              </button>
            </div>
            <textarea
              class="nkd-textarea"
              id="nkd-prompt-content"
              style="min-height:250px; max-height:500px; font-family:monospace; font-size:13px; white-space:pre-wrap;"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Channels & QR -->
      <div id="nkd-panel-channels" style="display:none;">
        <div class="nkd-section">
          <h2>📱 Kênh liên lạc & Quét QR</h2>
          <p style="color:var(--color-muted); font-size:13px; margin-bottom:16px;">
            Quét mã QR trực tiếp trên dashboard — không cần mở terminal.
          </p>
          <div class="nkd-channel-row">
            <div class="nkd-channel-dot off" id="nkd-wa-dot"></div>
            <div class="nkd-channel-name">💬 WhatsApp</div>
            <button
              class="nkd-btn nkd-btn-primary nkd-btn-sm"
              id="nkd-wa-qr-btn"
              @click=${() => nkdStartWhatsAppQR()}
            >
              📱 Quét QR
            </button>
            <button
              class="nkd-btn nkd-btn-danger nkd-btn-sm"
              @click=${() => nkdLogoutChannel("whatsapp")}
            >
              Đăng xuất
            </button>
          </div>
          <div id="nkd-wa-qr-area" style="display:none; margin-bottom:16px; padding-left:32px;">
            <div id="nkd-wa-qr-img" class="nkd-qr-wrap" style="display:none;"></div>
            <p
              id="nkd-wa-qr-msg"
              style="color:var(--color-muted); font-size:13px; margin-top:8px;"
            ></p>
          </div>
          <div class="nkd-channel-row">
            <div class="nkd-channel-dot off" id="nkd-zalo-dot"></div>
            <div class="nkd-channel-name">💙 Zalo Cá nhân</div>
            <button
              class="nkd-btn nkd-btn-primary nkd-btn-sm"
              id="nkd-zalo-qr-btn"
              @click=${() => nkdStartZaloQR()}
            >
              📱 Quét QR
            </button>
            <button
              class="nkd-btn nkd-btn-danger nkd-btn-sm"
              @click=${() => nkdLogoutChannel("zalouser")}
            >
              Đăng xuất
            </button>
          </div>
          <div id="nkd-zalo-qr-area" style="display:none; margin-bottom:16px; padding-left:32px;">
            <div id="nkd-zalo-qr-img" class="nkd-qr-wrap" style="display:none;"></div>
            <p
              id="nkd-zalo-qr-msg"
              style="color:var(--color-muted); font-size:13px; margin-top:8px;"
            ></p>
          </div>
          <div class="nkd-channel-row">
            <div class="nkd-channel-dot off" id="nkd-zalooa-dot"></div>
            <div class="nkd-channel-name">🏢 Zalo OA (Official Account)</div>
            <span style="color:var(--color-muted); font-size:13px;"
              >Token-based (cấu hình trong Config)</span
            >
          </div>
          <div style="margin-top:12px;">
            <button class="nkd-btn nkd-btn-primary nkd-btn-sm" @click=${() => nkdRefreshChannels()}>
              🔄 Refresh trạng thái
            </button>
          </div>
        </div>
      </div>

      <!-- Tickets -->
      <div id="nkd-panel-tickets" style="display:none;">
        <div class="nkd-section">
          <h2>📋 Tickets & Báo cáo</h2>
          <div class="nkd-grid">
            <div class="nkd-stat-card">
              <div class="label">📋 Tổng Ticket</div>
              <div class="value" style="color:var(--color-accent);" id="nkd-stat-total">0</div>
            </div>
            <div class="nkd-stat-card">
              <div class="label">⏳ Đang mở</div>
              <div class="value" style="color:#eab308;" id="nkd-stat-open">0</div>
            </div>
            <div class="nkd-stat-card">
              <div class="label">✅ Đã giải quyết</div>
              <div class="value" style="color:#22c55e;" id="nkd-stat-resolved">0</div>
            </div>
          </div>
        </div>
      </div>

      <!-- API Keys Management -->
      <div id="nkd-panel-apikeys" style="display:none;">
        <div class="nkd-section">
          <h2>🔑 Quản lý API Keys</h2>
          <p style="color:var(--color-muted); font-size:13px; margin-bottom:16px;">
            Quản lý API keys cho các AI provider. Thay đổi key sẽ có hiệu lực sau khi Restart
            Gateway.
          </p>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="nkd-btn nkd-btn-primary nkd-btn-sm" @click=${() => nkdRefreshApiKeys()}>
              🔄 Refresh
            </button>
          </div>
          <div id="nkd-apikey-list" style="margin-bottom:20px;">
            <p style="color:var(--color-muted); text-align:center; padding:20px;">Đang tải...</p>
          </div>
          <div
            style="margin-top:8px; padding:16px; background:var(--color-bg); border-radius:8px; border:1px solid var(--color-border);"
          >
            <h3 style="font-size:15px; margin:0 0 12px 0;">➕ Thêm / Cập nhật API Key</h3>
            <div class="nkd-form-row">
              <div>
                <label class="nkd-label">Provider</label>
                <select class="nkd-select" id="nkd-ak-provider">
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="nvidia">NVIDIA</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="other">Khác...</option>
                </select>
              </div>
              <div>
                <label class="nkd-label">Profile</label>
                <input
                  class="nkd-input"
                  type="text"
                  id="nkd-ak-profile"
                  value="default"
                  placeholder="default"
                />
              </div>
            </div>
            <div id="nkd-ak-custom-provider-row" style="display:none; margin-bottom:10px;">
              <label class="nkd-label">Tên provider (tùy chỉnh)</label>
              <input
                class="nkd-input"
                type="text"
                id="nkd-ak-custom-provider"
                placeholder="vd: together, fireworks..."
              />
            </div>
            <label class="nkd-label">API Key</label>
            <div style="display:flex; gap:8px; margin-bottom:12px;">
              <input
                class="nkd-input"
                type="password"
                id="nkd-ak-key"
                placeholder="Paste API key vào đây..."
                style="flex:1;"
              />
              <button
                class="nkd-btn nkd-btn-sm"
                style="background:var(--color-border); color:var(--color-muted);"
                @click=${() => nkdToggleKeyVisibility()}
              >
                👁️
              </button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="nkd-btn nkd-btn-success" @click=${() => nkdSaveApiKey()}>
                💾 Lưu API Key
              </button>
              <span style="color:var(--color-muted); font-size:12px; align-self:center;"
                >⚠️ Nhớ Restart Gateway sau khi đổi key</span
              >
            </div>
          </div>
          <div
            style="margin-top:16px; padding:12px; background:var(--color-bg); border-radius:8px; border:1px solid var(--color-border);"
          >
            <h3 style="font-size:14px; margin:0 0 8px 0;">🔗 Tạo API Key mới</h3>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🟠 Groq Console → Tạo key miễn phí</a
              >
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🟣 OpenRouter → Tạo key (có free models)</a
              >
              <a
                href="https://build.nvidia.com/settings/api-keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🟢 NVIDIA Build → API key miễn phí</a
              >
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🔵 Anthropic Console → API key</a
              >
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >⚪ OpenAI Platform → API key</a
              >
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🔴 Google AI Studio → API key</a
              >
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                style="color:var(--color-accent); font-size:13px;"
                >🟡 DeepSeek → API key</a
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions Management -->
      <div id="nkd-panel-sessions" style="display:none;">
        <div class="nkd-section">
          <h2>🧹 Quản lý Sessions</h2>
          <p style="color:#94a3b8; font-size:13px; margin-bottom:16px;">
            Mỗi cuộc hội thoại Zalo/WhatsApp tạo 1 session. Session quá lớn sẽ vượt token limit của
            AI model, gây lỗi không trả lời được.
            <strong style="color:#f59e0b;">Session vượt 50 KB sẽ bị tự động xóa</strong> khi
            refresh.
          </p>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="nkd-btn nkd-btn-primary nkd-btn-sm" @click=${() => nkdRefreshSessions()}>
              🔄 Refresh
            </button>
            <button class="nkd-btn nkd-btn-danger nkd-btn-sm" @click=${() => nkdClearAllSessions()}>
              🗑️ Xóa TẤT CẢ Sessions
            </button>
          </div>
          <div id="nkd-session-list" style="margin-bottom:16px;">
            <p style="color:#94a3b8; text-align:center; padding:20px;">
              Nhấn Refresh để tải danh sách sessions
            </p>
          </div>
          <div
            style="padding:14px; background:#0f172a; border-radius:8px; border:1px solid #334155;"
          >
            <h3 style="font-size:14px; margin:0 0 8px 0; color:#e2e8f0;">💡 Mẹo</h3>
            <ul style="color:#94a3b8; font-size:13px; margin:0; padding-left:20px;">
              <li style="margin-bottom:4px;">
                Session <strong style="color:#f59e0b;">&gt; 50 KB</strong> sẽ bị
                <strong style="color:#22c55e;">auto-clean</strong> khi bạn nhấn Refresh hoặc mở tab
                Sessions
              </li>
              <li style="margin-bottom:4px;">
                Bot sẽ bắt đầu hội thoại mới,
                <strong style="color:#e2e8f0;">không mất dữ liệu KB</strong>
              </li>
              <li style="margin-bottom:4px;">
                Groq free tier giới hạn 12k TPM — session ~50 KB ≈ 15k tokens → vượt limit
              </li>
              <li>Nếu bot không trả lời, hãy kiểm tra sessions ở đây trước</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Workspace Files (SOUL.md + IDENTITY.md) -->
      <div id="nkd-panel-workspace" style="display:none;">
        <div class="nkd-section">
          <h2>📝 Workspace Files</h2>
          <p style="color:var(--color-muted); font-size:13px; margin-bottom:16px;">
            Chỉnh sửa trực tiếp SOUL.md và IDENTITY.md — bot đọc runtime từ đây.
          </p>

          <!-- Agent Name Detection -->
          <div id="nkd-ws-agentname-box" style="margin-bottom:16px; padding:12px; background:var(--color-bg, #0f172a); border-radius:8px; border:1px solid var(--color-border, #334155);">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:14px; font-weight:600;">🤖 Tên Zalo Agent:</span>
              <span id="nkd-ws-agentname" style="color:var(--color-success, #4ade80); font-weight:700; font-size:15px;">
                đang tải...
              </span>
              <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
                <input
                  class="nkd-input"
                  id="nkd-ws-oldname"
                  style="width:140px; font-size:12px;"
                  placeholder="Tên cũ (vd: Cu Đen)"
                />
                <span style="color:var(--color-muted);">→</span>
                <input
                  class="nkd-input"
                  id="nkd-ws-newname"
                  style="width:140px; font-size:12px;"
                  placeholder="Tên mới (auto)"
                />
                <button class="nkd-btn nkd-btn-sm" @click=${() => nkdReplaceBotName()}>
                  🔄 Đổi tên
                </button>
              </div>
            </div>
            <p style="color:var(--color-muted); font-size:11px; margin:6px 0 0;">
              Tự động lấy tên từ Zalo Agent đang chạy. Dùng "Đổi tên" để replace tên cũ → tên mới trong cả SOUL + IDENTITY.
            </p>
          </div>

          <div style="margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <label class="nkd-label" style="margin-bottom:0; flex:1; font-size:15px; font-weight:600;">
                🧠 SOUL.md — Quy tắc cốt lõi
              </label>
              <button class="nkd-btn nkd-btn-success nkd-btn-sm" @click=${() => nkdSaveSoul()}>
                💾 Lưu SOUL
              </button>
              <button class="nkd-btn nkd-btn-sm" @click=${() => nkdLoadSoul()}>
                🔄 Tải lại
              </button>
            </div>
            <textarea
              class="nkd-textarea"
              id="nkd-ws-soul"
              style="min-height:300px; max-height:500px; font-family:monospace; font-size:13px; white-space:pre-wrap;"
              placeholder="Loading SOUL.md..."
            ></textarea>
          </div>

          <div style="margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <label class="nkd-label" style="margin-bottom:0; flex:1; font-size:15px; font-weight:600;">
                🪪 IDENTITY.md — Danh tính & cách trả lời
              </label>
              <button class="nkd-btn nkd-btn-success nkd-btn-sm" @click=${() => nkdSaveIdentity()}>
                💾 Lưu IDENTITY
              </button>
              <button class="nkd-btn nkd-btn-sm" @click=${() => nkdLoadIdentity()}>
                🔄 Tải lại
              </button>
            </div>
            <textarea
              class="nkd-textarea"
              id="nkd-ws-identity"
              style="min-height:400px; max-height:600px; font-family:monospace; font-size:13px; white-space:pre-wrap;"
              placeholder="Loading IDENTITY.md..."
            ></textarea>
          </div>

          <div style="padding:12px; background:var(--color-bg, #0f172a); border-radius:8px; border:1px solid var(--color-border, #334155);">
            <p style="color:var(--color-muted); font-size:12px; margin:0;">
              💡 <strong>Lưu ý:</strong> Thay đổi có hiệu lực ngay — bot sẽ đọc file mới từ lần trả lời tiếp theo.<br/>
              Tên bot trong SOUL/IDENTITY nên trùng với tên Zalo Agent đã cấu hình.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Sub-tab switching
// ---------------------------------------------------------------------------

function nkdSwitchSubtab(tab: string): void {
  for (const p of ["kb", "agent", "channels", "tickets", "apikeys", "sessions", "workspace"]) {
    const panel = document.getElementById(`nkd-panel-${p}`);
    const btn = document.getElementById(`nkd-subtab-${p}`);
    if (panel) panel.style.display = p === tab ? "block" : "none";
    if (btn) {
      if (p === tab) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  }
  if (tab === "kb") nkdRefreshKB();
  if (tab === "agent") nkdLoadProfile();
  if (tab === "tickets") nkdLoadTicketStats();
  if (tab === "apikeys") nkdRefreshApiKeys();
  if (tab === "sessions") nkdRefreshSessions();
  if (tab === "workspace") nkdLoadWorkspace();
}

function nkdToast(msg: string, isError = false): void {
  const el = document.getElementById("nkd-toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "nkd-toast" + (isError ? " error" : "");
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 3500);
}

function nkdToggle(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

// ---------------------------------------------------------------------------
// Knowledge Base — via gateway RPC (nkd.kb.*)
// ---------------------------------------------------------------------------

async function nkdRefreshKB(): Promise<void> {
  try {
    const [stats, docs] = await Promise.all([rpc("nkd.kb.stats"), rpc("nkd.kb.list")]);
    const countEl = document.getElementById("nkd-kb-count");
    if (countEl)
      countEl.textContent = `${stats.totalDocuments} tài liệu | ${(stats.totalChars ?? 0).toLocaleString()} ký tự`;
    renderNkdKBList(docs);
  } catch (err: any) {
    const countEl = document.getElementById("nkd-kb-count");
    if (countEl) countEl.textContent = `⚠️ ${err.message || "Lỗi tải KB"}`;
  }
}

const CAT_ICONS: Record<string, string> = {
  general: "📁",
  network: "🌐",
  hardware: "🖥️",
  software: "💿",
  account: "🔑",
  email: "📧",
  security: "🛡️",
  "internal-app": "🏢",
};

function renderNkdKBList(
  docs: Array<{
    id: string;
    title: string;
    category: string;
    charCount: number;
    importedAt: string;
    tags?: string[];
  }>,
): void {
  const container = document.getElementById("nkd-kb-doc-list");
  if (!container) return;
  if (!docs || docs.length === 0) {
    container.innerHTML =
      '<p style="color:var(--color-muted); text-align:center; padding:20px;">Chưa có tài liệu nào. Import tài liệu bên dưới 👇</p>';
    return;
  }
  container.innerHTML = docs
    .map((doc) => {
      const icon = CAT_ICONS[doc.category] || "📄";
      const date = new Date(doc.importedAt).toLocaleDateString("vi-VN");
      const chars = doc.charCount?.toLocaleString() ?? "0";
      const tags = (doc.tags || [])
        .map(
          (t) =>
            `<span style="background:var(--color-border,#475569); padding:1px 6px; border-radius:8px; font-size:11px; margin-left:4px;">${t}</span>`,
        )
        .join("");
      return `<div class="nkd-doc-row" style="cursor:pointer;" data-doc-id="${doc.id}" data-doc-title="${doc.title.replace(/"/g, "&quot;")}">
      <span class="nkd-doc-cat">${icon} ${doc.category}</span>
      <span class="nkd-doc-title">${doc.title}</span>${tags}
      <span class="nkd-doc-meta">${chars} ký tự · ${date}</span>
      <button class="nkd-btn nkd-btn-sm nkd-view-btn" style="background:#3b82f6; color:#fff; padding:2px 8px; font-size:12px;" data-action="view" data-doc-id="${doc.id}">👁️</button>
      <button class="nkd-btn nkd-btn-danger nkd-btn-sm nkd-del-btn" style="padding:2px 8px; font-size:12px;" data-action="delete" data-doc-id="${doc.id}" data-doc-title="${doc.title.replace(/"/g, "&quot;")}">🗑️</button>
    </div>`;
    })
    .join("");

  // Event delegation — single listener on container
  container.onclick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Delete button clicked
    const delBtn = target.closest("[data-action='delete']") as HTMLElement;
    if (delBtn) {
      e.stopPropagation();
      const docId = delBtn.dataset.docId ?? "";
      const docTitle = delBtn.dataset.docTitle ?? "";
      nkdDeleteDoc(docId, docTitle);
      return;
    }
    // View button clicked
    const viewBtn = target.closest("[data-action='view']") as HTMLElement;
    if (viewBtn) {
      e.stopPropagation();
      nkdViewDoc(viewBtn.dataset.docId ?? "");
      return;
    }
    // Row clicked (not on a button)
    const row = target.closest("[data-doc-id]") as HTMLElement;
    if (row && row.dataset.docId) {
      nkdViewDoc(row.dataset.docId);
    }
  };
}

// View doc detail — fetch full content
async function nkdViewDoc(docId: string): Promise<void> {
  try {
    const rawData = await rpc<any>("nkd.kb.rawData");
    const kbIndex = rawData?.kbIndex;
    if (!kbIndex?.documents) {
      nkdToast("❌ Không tìm thấy dữ liệu KB", true);
      return;
    }
    const doc = kbIndex.documents.find((d: any) => d.id === docId);
    if (!doc) {
      nkdToast("❌ Không tìm thấy tài liệu", true);
      return;
    }
    const panel = document.getElementById("nkd-doc-detail-panel");
    const titleEl = document.getElementById("nkd-doc-detail-title");
    const metaEl = document.getElementById("nkd-doc-detail-meta");
    const contentEl = document.getElementById("nkd-doc-detail-content") as HTMLTextAreaElement;
    if (!panel || !titleEl || !metaEl || !contentEl) return;
    const icon = CAT_ICONS[doc.category] || "📄";
    titleEl.textContent = `${icon} ${doc.title}`;
    const tagsStr = (doc.tags || []).join(", ");
    metaEl.textContent = `Category: ${doc.category} | Tags: ${tagsStr || "không có"} | ${doc.charCount?.toLocaleString()} ký tự | Import: ${new Date(doc.importedAt).toLocaleString("vi-VN")} | Source: ${doc.source}`;
    contentEl.value = doc.content;
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

// Delete doc
async function nkdDeleteDoc(docId: string, docTitle: string): Promise<void> {
  if (!confirm(`⚠️ Xóa "${docTitle}"?\n\nDữ liệu sẽ bị xóa khỏi KB JSON và workspace AGENTS.md.`))
    return;
  try {
    await rpc("nkd.kb.delete", { id: docId });
    nkdToast(`🗑️ Đã xóa: ${docTitle}`);
    const panel = document.getElementById("nkd-doc-detail-panel");
    if (panel) panel.style.display = "none";
    nkdRefreshKB();
  } catch (err: any) {
    nkdToast(`❌ Lỗi xóa: ${err.message || "Unknown error"}`, true);
  }
}

async function nkdSearchKB(): Promise<void> {
  const q = (document.getElementById("nkd-kb-search") as HTMLInputElement)?.value?.trim();
  if (!q) {
    nkdRefreshKB();
    return;
  }
  try {
    const results = await rpc<any[]>("nkd.kb.search", { q });
    renderNkdKBList(results.map((r) => r.document));
    nkdToast(`🔍 Tìm thấy ${results.length} kết quả`);
  } catch {
    nkdToast("Lỗi tìm kiếm!", true);
  }
}

async function nkdImportText(): Promise<void> {
  const content = (document.getElementById("nkd-kb-content") as HTMLTextAreaElement)?.value;
  const title = (document.getElementById("nkd-kb-title") as HTMLInputElement)?.value;
  const category = (document.getElementById("nkd-kb-category") as HTMLSelectElement)?.value;
  const tagsRaw = (document.getElementById("nkd-kb-tags") as HTMLInputElement)?.value;
  if (!content) {
    nkdToast("Vui lòng nhập nội dung!", true);
    return;
  }
  try {
    const d = await rpc("nkd.kb.importText", {
      title,
      content,
      category: category || "general",
      tags: tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    });
    nkdToast(`✅ Import thành công! ID: ${d.documentId}`);
    (document.getElementById("nkd-kb-content") as HTMLTextAreaElement).value = "";
    (document.getElementById("nkd-kb-title") as HTMLInputElement).value = "";
    (document.getElementById("nkd-kb-tags") as HTMLInputElement).value = "";
    nkdRefreshKB();
  } catch (err: any) {
    nkdToast(`❌ ${err.message || "Lỗi import"}`, true);
  }
}

function nkdSwitchImport(tab: string): void {
  const textPanel = document.getElementById("nkd-import-text");
  const filePanel = document.getElementById("nkd-import-file");
  const textBtn = document.getElementById("nkd-imp-tab-text");
  const fileBtn = document.getElementById("nkd-imp-tab-file");
  if (textPanel) textPanel.style.display = tab === "text" ? "block" : "none";
  if (filePanel) filePanel.style.display = tab === "file" ? "block" : "none";
  if (textBtn) {
    textBtn.style.background =
      tab === "text" ? "var(--color-accent, #3b82f6)" : "var(--color-border)";
    textBtn.style.color = tab === "text" ? "#fff" : "var(--color-muted)";
  }
  if (fileBtn) {
    fileBtn.style.background =
      tab === "file" ? "var(--color-accent, #3b82f6)" : "var(--color-border)";
    fileBtn.style.color = tab === "file" ? "#fff" : "var(--color-muted)";
  }
}

// ---------------------------------------------------------------------------
// File upload — via gateway RPC (nkd.kb.upload with base64)
// ---------------------------------------------------------------------------

let nkdSelectedFile: File | null = null;

function nkdHandleFileSelect(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) nkdShowFilePreview(input.files[0]);
}
function nkdHandleDrop(e: DragEvent): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border, #475569)";
  if (e.dataTransfer?.files?.[0]) nkdShowFilePreview(e.dataTransfer.files[0]);
}

const FILE_ICONS: Record<string, string> = {
  ".pdf": "📕",
  ".docx": "📘",
  ".doc": "📘",
  ".xlsx": "📗",
  ".xls": "📗",
  ".csv": "📊",
  ".txt": "📄",
  ".md": "📝",
  ".json": "📋",
};

function nkdShowFilePreview(file: File): void {
  nkdSelectedFile = file;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const sizeStr =
    file.size > 1048576
      ? (file.size / 1048576).toFixed(2) + " MB"
      : (file.size / 1024).toFixed(1) + " KB";
  const iconEl = document.getElementById("nkd-file-icon");
  const nameEl = document.getElementById("nkd-file-name");
  const sizeEl = document.getElementById("nkd-file-size");
  const previewEl = document.getElementById("nkd-file-preview");
  const uploadBtn = document.getElementById("nkd-upload-btn") as HTMLButtonElement;
  if (iconEl) iconEl.textContent = FILE_ICONS[ext] || "📄";
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = `${sizeStr} · ${ext.toUpperCase().slice(1)}`;
  if (previewEl) previewEl.style.display = "block";
  if (uploadBtn) uploadBtn.disabled = false;
  const titleEl = document.getElementById("nkd-kb-title") as HTMLInputElement;
  if (titleEl && !titleEl.value) titleEl.value = file.name.replace(/\.[^.]+$/, "");
}

function nkdClearFile(): void {
  nkdSelectedFile = null;
  const previewEl = document.getElementById("nkd-file-preview");
  const uploadBtn = document.getElementById("nkd-upload-btn") as HTMLButtonElement;
  const fileInput = document.getElementById("nkd-file-input") as HTMLInputElement;
  if (previewEl) previewEl.style.display = "none";
  if (uploadBtn) uploadBtn.disabled = true;
  if (fileInput) fileInput.value = "";
}

async function nkdUploadFile(): Promise<void> {
  if (!nkdSelectedFile) {
    nkdToast("Chọn file trước!", true);
    return;
  }
  const progress = document.getElementById("nkd-upload-progress");
  const btn = document.getElementById("nkd-upload-btn") as HTMLButtonElement;
  if (btn) btn.disabled = true;
  if (progress) progress.textContent = "⏳ Đang xử lý...";
  try {
    const base64 = await fileToBase64(nkdSelectedFile);
    if (progress) progress.textContent = "⏳ Đang import qua gateway...";
    const result = await rpc("nkd.kb.upload", {
      filename: nkdSelectedFile.name,
      base64,
      category:
        (document.getElementById("nkd-kb-category") as HTMLSelectElement)?.value || "general",
      tags: (document.getElementById("nkd-kb-tags") as HTMLInputElement)?.value || "",
      title: (document.getElementById("nkd-kb-title") as HTMLInputElement)?.value || undefined,
    });
    let msg = `✅ Upload thành công! ID: ${result.documentId}`;
    if (result.metadata)
      msg += ` (${result.metadata.format?.toUpperCase()}, ${result.metadata.extractedChars?.toLocaleString()} ký tự)`;
    nkdToast(msg);
    nkdClearFile();
    (document.getElementById("nkd-kb-title") as HTMLInputElement).value = "";
    (document.getElementById("nkd-kb-tags") as HTMLInputElement).value = "";
    nkdRefreshKB();
    if (progress) progress.textContent = "";
  } catch (err: any) {
    nkdToast(`❌ Upload lỗi: ${err.message}`, true);
    if (progress) progress.textContent = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve((reader.result as string).split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Agent Profile — via gateway RPC (nkd.agent.*)
// ---------------------------------------------------------------------------

async function nkdLoadProfile(): Promise<void> {
  try {
    const p = await rpc("nkd.agent.profile");
    (document.getElementById("nkd-ag-name") as HTMLInputElement).value = p.name || "";
    (document.getElementById("nkd-ag-company") as HTMLInputElement).value = p.company || "";
    (document.getElementById("nkd-ag-tone") as HTMLSelectElement).value = p.tone || "professional";
    (document.getElementById("nkd-ag-lang") as HTMLSelectElement).value = p.language || "vi";
    (document.getElementById("nkd-ag-prefix") as HTMLInputElement).value = p.ticketPrefix || "FV";
    (document.getElementById("nkd-ag-scope") as HTMLInputElement).value = p.scope || "";
    (document.getElementById("nkd-ag-greeting") as HTMLTextAreaElement).value = p.greeting || "";
  } catch (err: any) {
    nkdToast(`⚠️ ${err.message || "Lỗi tải profile"}`, true);
  }
}

async function nkdSaveProfile(): Promise<void> {
  const data = {
    name: (document.getElementById("nkd-ag-name") as HTMLInputElement)?.value,
    company: (document.getElementById("nkd-ag-company") as HTMLInputElement)?.value,
    tone: (document.getElementById("nkd-ag-tone") as HTMLSelectElement)?.value,
    language: (document.getElementById("nkd-ag-lang") as HTMLSelectElement)?.value,
    ticketPrefix: (document.getElementById("nkd-ag-prefix") as HTMLInputElement)?.value,
    scope: (document.getElementById("nkd-ag-scope") as HTMLInputElement)?.value,
    greeting: (document.getElementById("nkd-ag-greeting") as HTMLTextAreaElement)?.value,
  };
  if (!data.name) {
    nkdToast("Tên agent không được để trống!", true);
    return;
  }
  try {
    await rpc("nkd.agent.profileSave", data);
    nkdToast("💾 Đã lưu cài đặt Agent + cập nhật AGENTS.md");
  } catch (err: any) {
    nkdToast(`❌ ${err.message || "Lỗi lưu"}`, true);
  }
}

async function nkdPreviewPrompt(): Promise<void> {
  const box = document.getElementById("nkd-prompt-box");
  if (!box) return;
  if (box.style.display !== "none") {
    box.style.display = "none";
    return;
  }
  try {
    const d = await rpc("nkd.agent.prompt");
    const el = document.getElementById("nkd-prompt-content") as HTMLTextAreaElement;
    if (el) el.value = d.content || "(chưa có)";
    box.style.display = "block";
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

async function nkdSavePrompt(): Promise<void> {
  const el = document.getElementById("nkd-prompt-content") as HTMLTextAreaElement;
  if (!el) return;
  const content = el.value;
  if (!content.trim()) {
    nkdToast("System prompt không được để trống!", true);
    return;
  }
  try {
    await rpc("nkd.agent.promptSave", { content });
    nkdToast("💾 Đã lưu System Prompt (AGENTS.md)");
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

// ---------------------------------------------------------------------------
// Raw JSON Data viewer
// ---------------------------------------------------------------------------

async function nkdViewRawData(): Promise<void> {
  const panel = document.getElementById("nkd-raw-data-panel");
  if (!panel) return;
  if (panel.style.display !== "none") {
    panel.style.display = "none";
    return;
  }
  try {
    const d = await rpc("nkd.kb.rawData");
    const el = document.getElementById("nkd-raw-data-content") as HTMLTextAreaElement;
    if (el) el.value = JSON.stringify(d, null, 2);
    panel.style.display = "block";
    nkdToast("📋 Đã tải raw JSON data");
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

function nkdCopyRawData(): void {
  const el = document.getElementById("nkd-raw-data-content") as HTMLTextAreaElement;
  if (!el) return;
  navigator.clipboard
    .writeText(el.value)
    .then(() => {
      nkdToast("📋 Đã copy JSON vào clipboard");
    })
    .catch(() => {
      el.select();
      document.execCommand("copy");
      nkdToast("📋 Đã copy");
    });
}

async function nkdSaveRawData(): Promise<void> {
  const el = document.getElementById("nkd-raw-data-content") as HTMLTextAreaElement;
  if (!el) return;
  let parsed: any;
  try {
    parsed = JSON.parse(el.value);
  } catch {
    nkdToast("❌ JSON không hợp lệ — kiểm tra lại cú pháp", true);
    return;
  }
  if (!confirm("⚠️ Lưu thay đổi JSON? Dữ liệu KB, Agent Profile, AGENTS.md sẽ được cập nhật."))
    return;
  try {
    await rpc("nkd.kb.rawDataSave", parsed);
    nkdToast("💾 Đã lưu JSON data + sync workspace");
    nkdRefreshKB();
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

// ---------------------------------------------------------------------------
// Channels & QR — via gateway RPC
// ---------------------------------------------------------------------------

async function nkdRefreshChannels(): Promise<void> {
  try {
    const res = await rpc<any>("channels.status", { probe: true, timeoutMs: 8000 });
    const ch = res?.channels ?? {};
    const waDot = document.getElementById("nkd-wa-dot");
    if (waDot) waDot.className = `nkd-channel-dot ${ch.whatsapp?.connected ? "on" : "off"}`;
    const zaloDot = document.getElementById("nkd-zalo-dot");
    if (zaloDot) zaloDot.className = `nkd-channel-dot ${ch.zalouser?.connected ? "on" : "off"}`;
    const zaloOaDot = document.getElementById("nkd-zalooa-dot");
    if (zaloOaDot) zaloOaDot.className = `nkd-channel-dot ${ch.zalo?.connected ? "on" : "off"}`;
    nkdToast("🔄 Đã refresh trạng thái");
  } catch (err: any) {
    nkdToast(`⚠️ ${err.message || "Lỗi"}`, true);
  }
}

async function nkdStartWhatsAppQR(): Promise<void> {
  const area = document.getElementById("nkd-wa-qr-area");
  const imgWrap = document.getElementById("nkd-wa-qr-img");
  const msgEl = document.getElementById("nkd-wa-qr-msg");
  const btn = document.getElementById("nkd-wa-qr-btn") as HTMLButtonElement;
  if (area) area.style.display = "block";
  if (msgEl) msgEl.textContent = "⏳ Đang tạo mã QR...";
  if (btn) btn.disabled = true;
  try {
    const res = await rpc<{ message?: string; qrDataUrl?: string }>("web.login.start", {
      force: false,
      timeoutMs: 30000,
    });
    if (res.qrDataUrl) {
      if (imgWrap) {
        imgWrap.innerHTML = `<img src="${res.qrDataUrl}" alt="WhatsApp QR">`;
        imgWrap.style.display = "inline-block";
      }
      if (msgEl) msgEl.textContent = "📱 Mở WhatsApp → Thiết bị liên kết → Quét mã QR";
      const waitRes = await rpc<{ message?: string; connected?: boolean }>("web.login.wait", {
        timeoutMs: 120000,
      });
      if (waitRes.connected) {
        if (imgWrap) imgWrap.style.display = "none";
        if (msgEl) msgEl.textContent = "✅ WhatsApp đã kết nối!";
        nkdToast("✅ WhatsApp đã kết nối!");
        nkdRefreshChannels();
      } else {
        if (msgEl) msgEl.textContent = waitRes.message || "⚠️ Chưa quét QR hoặc hết thời gian.";
      }
    } else {
      if (msgEl) msgEl.textContent = res.message || "WhatsApp đã kết nối.";
    }
  } catch (err: any) {
    if (msgEl) msgEl.textContent = `❌ Lỗi: ${err.message}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function nkdStartZaloQR(): Promise<void> {
  const area = document.getElementById("nkd-zalo-qr-area");
  const imgWrap = document.getElementById("nkd-zalo-qr-img");
  const msgEl = document.getElementById("nkd-zalo-qr-msg");
  const btn = document.getElementById("nkd-zalo-qr-btn") as HTMLButtonElement;
  if (area) area.style.display = "block";
  if (msgEl) msgEl.textContent = "⏳ Đang tạo mã QR Zalo...";
  if (btn) btn.disabled = true;
  try {
    const res = await rpc<{ message?: string; qrDataUrl?: string }>("channels.loginQrStart", {
      channel: "zalouser",
      force: false,
      timeoutMs: 30000,
    });
    if (res.qrDataUrl) {
      if (imgWrap) {
        imgWrap.innerHTML = `<img src="${res.qrDataUrl}" alt="Zalo QR">`;
        imgWrap.style.display = "inline-block";
      }
      if (msgEl) msgEl.textContent = "📱 Mở Zalo → Quét mã QR → Xác nhận đăng nhập";
      try {
        const waitRes = await rpc<{ message?: string; connected?: boolean }>(
          "channels.loginQrWait",
          { channel: "zalouser", timeoutMs: 180000 },
        );
        if (waitRes.connected) {
          if (imgWrap) imgWrap.style.display = "none";
          if (msgEl) msgEl.textContent = "✅ Zalo đã kết nối!";
          nkdToast("✅ Zalo đã kết nối!");
          nkdRefreshChannels();
        } else {
          if (msgEl) msgEl.textContent = waitRes.message || "⚠️ Chưa quét QR hoặc hết thời gian.";
        }
      } catch (waitErr: any) {
        if (msgEl) msgEl.textContent = `⚠️ ${waitErr.message || "Timeout"}`;
      }
    } else {
      if (msgEl) msgEl.textContent = res.message || "Zalo đã kết nối.";
    }
  } catch (err: any) {
    if (msgEl) msgEl.textContent = `❌ Lỗi: ${err.message}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function nkdLogoutChannel(channel: string): Promise<void> {
  if (!confirm(`⚠️ Đăng xuất ${channel}?`)) return;
  try {
    await rpc("channels.logout", { channel });
    nkdToast(`✅ Đã đăng xuất ${channel}`);
    nkdRefreshChannels();
  } catch (err: any) {
    nkdToast(`❌ ${err.message}`, true);
  }
}

// ---------------------------------------------------------------------------
// Tickets — via gateway RPC (nkd.reports.tickets)
// ---------------------------------------------------------------------------

async function nkdLoadTicketStats(): Promise<void> {
  try {
    const d = await rpc("nkd.reports.tickets");
    const totalEl = document.getElementById("nkd-stat-total");
    const openEl = document.getElementById("nkd-stat-open");
    const resolvedEl = document.getElementById("nkd-stat-resolved");
    if (totalEl) totalEl.textContent = String(d.total ?? 0);
    if (openEl) openEl.textContent = String(d.open ?? 0);
    if (resolvedEl) resolvedEl.textContent = String(d.closed ?? 0);
  } catch {
    /* zeros by default */
  }
}

// ---------------------------------------------------------------------------
// Gateway Restart — via gateway RPC (nkd.gateway.restart)
// ---------------------------------------------------------------------------

async function nkdRestartGateway(): Promise<void> {
  if (
    !confirm(
      "⚠️ Restart Gateway?\n\nGateway sẽ khởi động lại để áp dụng thay đổi config.\nKết nối sẽ bị ngắt tạm thời (~5-10 giây).",
    )
  )
    return;
  try {
    nkdToast("🔄 Đang gửi lệnh restart gateway...");
    const res = await rpc<{ success: boolean; message: string }>("nkd.gateway.restart");
    nkdToast(`✅ ${res.message || "Gateway restart đã được lên lịch!"}`);
  } catch (err: any) {
    // Connection lost is expected during restart
    if (
      err.message?.includes("disconnect") ||
      err.message?.includes("close") ||
      err.message?.includes("connection")
    ) {
      nkdToast("🔄 Gateway đang restart... Trang sẽ tự kết nối lại.");
    } else {
      nkdToast(`❌ Lỗi restart: ${err.message || "Unknown error"}`, true);
    }
  }
}

// ---------------------------------------------------------------------------
// API Keys Management — via gateway RPC (nkd.apikey.*)
// ---------------------------------------------------------------------------

const PROVIDER_ICONS: Record<string, string> = {
  groq: "🟠",
  openrouter: "🟣",
  nvidia: "🟢",
  anthropic: "🔵",
  openai: "⚪",
  google: "🔴",
  deepseek: "🟡",
};

async function nkdRefreshApiKeys(): Promise<void> {
  try {
    const data = await rpc<{
      profiles: Array<{ provider: string; profile: string; maskedKey: string }>;
      path: string;
      activeModel?: string;
      openaiConfigured?: boolean;
    }>("nkd.apikey.list");
    const container = document.getElementById("nkd-apikey-list");
    if (!container) return;

    // Active model banner
    const modelBanner = data.activeModel
      ? `<div style="background:${data.openaiConfigured ? "#065f46" : "#92400e"}; color:#fff; padding:10px 14px; border-radius:8px; margin-bottom:12px; font-size:13px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">${data.openaiConfigured ? "🤖" : "🆓"}</span>
          <div>
            <div style="font-weight:600;">Model đang dùng: ${data.activeModel}</div>
            <div style="opacity:0.8; font-size:11px; margin-top:2px;">${data.openaiConfigured ? "✅ OpenAI key đã cấu hình — dùng GPT-4.1-mini (trả phí, nhanh, chất lượng cao)" : "⚡ Chưa có OpenAI key — dùng model miễn phí (Groq/OpenRouter). Thêm OpenAI key để tự động chuyển sang GPT-4.1-mini."}</div>
          </div>
        </div>`
      : "";

    if (!data.profiles || data.profiles.length === 0) {
      container.innerHTML =
        modelBanner +
        '<p style="color:#94a3b8; text-align:center; padding:20px;">Chưa có API key nào. Thêm key bên dưới 👇</p>';
      return;
    }
    container.innerHTML =
      modelBanner +
      `<div style="color:#94a3b8; font-size:11px; margin-bottom:8px;">📂 File: <code style="background:#1e293b; padding:2px 6px; border-radius:4px;">${data.path}</code></div>` +
      data.profiles
        .map((p) => {
          const icon = PROVIDER_ICONS[p.provider] || "🔹";
          return `<div class="nkd-doc-row" style="align-items:center;">
          <span style="font-size:20px;">${icon}</span>
          <span class="nkd-doc-title" style="min-width:100px;">${p.provider}</span>
          <span class="nkd-doc-meta" style="min-width:60px;">:${p.profile}</span>
          <code style="flex:1; font-size:13px; color:#94a3b8; background:#1e293b; padding:4px 8px; border-radius:4px; font-family:monospace;">${p.maskedKey}</code>
          <button class="nkd-btn nkd-btn-danger nkd-btn-sm nkd-ak-del-btn" style="padding:2px 8px; font-size:12px;" data-ak-provider="${p.provider}" data-ak-profile="${p.profile}">🗑️</button>
        </div>`;
        })
        .join("");

    // Event delegation for delete buttons
    container.onclick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const delBtn = target.closest(".nkd-ak-del-btn") as HTMLElement;
      if (delBtn) {
        e.stopPropagation();
        const provider = delBtn.dataset.akProvider ?? "";
        const profile = delBtn.dataset.akProfile ?? "";
        nkdDeleteApiKey(provider, profile);
      }
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải API keys";
    const container = document.getElementById("nkd-apikey-list");
    if (container)
      container.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px;">⚠️ ${msg}</p>`;
  }
}

async function nkdSaveApiKey(): Promise<void> {
  const providerSelect = document.getElementById("nkd-ak-provider") as HTMLSelectElement;
  const customProviderInput = document.getElementById("nkd-ak-custom-provider") as HTMLInputElement;
  const profileInput = document.getElementById("nkd-ak-profile") as HTMLInputElement;
  const keyInput = document.getElementById("nkd-ak-key") as HTMLInputElement;

  let provider = providerSelect?.value ?? "";
  if (provider === "other") {
    provider = customProviderInput?.value?.trim() ?? "";
    if (!provider) {
      nkdToast("Vui lòng nhập tên provider!", true);
      return;
    }
  }
  const profile = profileInput?.value?.trim() || "default";
  const apiKey = keyInput?.value?.trim() ?? "";

  if (!apiKey) {
    nkdToast("Vui lòng nhập API key!", true);
    return;
  }

  try {
    const result = await rpc<{
      success: boolean;
      message: string;
      modelSwitched?: boolean;
      activeModel?: string;
      needsRestart?: boolean;
    }>("nkd.apikey.set", { provider, profile, apiKey });
    let toastMsg = `✅ Đã lưu API key cho ${provider}:${profile}`;
    if (result.modelSwitched) {
      toastMsg += `\n🔄 Model tự động chuyển → ${result.activeModel}`;
    }
    if (result.needsRestart) {
      toastMsg += "\n⏳ Gateway đang restart...";
    }
    nkdToast(toastMsg);
    keyInput.value = "";
    nkdRefreshApiKeys();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi lưu API key";
    nkdToast(`❌ ${msg}`, true);
  }
}

async function nkdDeleteApiKey(provider: string, profile: string): Promise<void> {
  if (
    !confirm(
      `⚠️ Xóa API key cho ${provider}:${profile}?\n\nBạn sẽ cần thêm lại key sau nếu muốn dùng provider này.${provider === "openai" ? "\n\n⚠️ Xóa OpenAI key sẽ tự động chuyển về model miễn phí!" : ""}`,
    )
  ) {
    return;
  }
  try {
    const result = await rpc<{
      success: boolean;
      message: string;
      modelSwitched?: boolean;
      activeModel?: string;
      needsRestart?: boolean;
    }>("nkd.apikey.delete", { provider, profile });
    let toastMsg = `🗑️ Đã xóa API key: ${provider}:${profile}`;
    if (result.modelSwitched) {
      toastMsg += `\n🔄 Model tự động chuyển → ${result.activeModel}`;
    }
    if (result.needsRestart) {
      toastMsg += "\n⏳ Gateway đang restart...";
    }
    nkdToast(toastMsg);
    nkdRefreshApiKeys();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi xóa";
    nkdToast(`❌ ${msg}`, true);
  }
}

function nkdToggleKeyVisibility(): void {
  const input = document.getElementById("nkd-ak-key") as HTMLInputElement;
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

// Handle "other" provider selection — show custom input
document.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.id === "nkd-ak-provider") {
    const select = target as HTMLSelectElement;
    const customRow = document.getElementById("nkd-ak-custom-provider-row");
    if (customRow) {
      customRow.style.display = select.value === "other" ? "block" : "none";
    }
  }
});

// ---------------------------------------------------------------------------
// Session management functions
// ---------------------------------------------------------------------------

interface SessionInfo {
  id: string;
  sizeBytes: number;
  sizeKB: number;
  lines: number;
  modifiedAt: string;
  lastModified: string;
  ageMinutes: number;
}

async function nkdRefreshSessions(): Promise<void> {
  const container = document.getElementById("nkd-session-list");
  if (!container) {
    return;
  }
  container.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">⏳ Đang tải sessions...</p>`;
  try {
    const result = (await rpc("nkd.session.list", {})) as {
      sessions: SessionInfo[];
      autoPurged?: string[];
      autoCleanThresholdKB?: number;
    };
    const sessions = result.sessions ?? [];
    const autoPurged = result.autoPurged ?? [];
    const thresholdKB = result.autoCleanThresholdKB ?? 50;

    // Show auto-purge notification if any sessions were cleaned
    if (autoPurged.length > 0) {
      nkdToast(`🧹 Auto-cleaned ${autoPurged.length} session(s) vượt ${thresholdKB} KB limit`);
    }

    if (sessions.length === 0 && autoPurged.length === 0) {
      container.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">✅ Không có session nào. Bot sẽ tạo session mới khi có tin nhắn.</p>`;
      return;
    }

    if (sessions.length === 0 && autoPurged.length > 0) {
      container.innerHTML = `<p style="color:#22c55e; text-align:center; padding:20px;">🧹 Đã auto-clean ${autoPurged.length} session quá lớn. Tất cả sessions đã được xóa.</p>`;
      return;
    }

    let html = `<table style="width:100%; border-collapse:collapse; font-size:13px; color:#e2e8f0;">
      <thead>
        <tr style="border-bottom:2px solid #334155;">
          <th style="text-align:left; padding:10px 8px; color:#94a3b8; font-weight:600;">Session ID</th>
          <th style="text-align:right; padding:10px 8px; color:#94a3b8; font-weight:600;">Kích thước</th>
          <th style="text-align:right; padding:10px 8px; color:#94a3b8; font-weight:600;">Dòng</th>
          <th style="text-align:right; padding:10px 8px; color:#94a3b8; font-weight:600;">Cập nhật</th>
          <th style="text-align:center; padding:10px 8px; color:#94a3b8; font-weight:600;">Thao tác</th>
        </tr>
      </thead>
      <tbody>`;

    for (const s of sessions) {
      const sizeKB = s.sizeKB ?? (s.sizeBytes ? (s.sizeBytes / 1024).toFixed(1) : "0");
      const sizeBytes = s.sizeBytes ?? (s.sizeKB ? s.sizeKB * 1024 : 0);
      const isLarge = sizeBytes > thresholdKB * 1024;
      const sizeStyle = isLarge ? "color:#f87171; font-weight:bold;" : "color:#e2e8f0;";
      const shortId = s.id.length > 12 ? s.id.slice(0, 12) + "…" : s.id;
      const modified =
        s.modifiedAt || s.lastModified
          ? new Date(s.modifiedAt || s.lastModified).toLocaleString("vi-VN")
          : "—";
      const lines = s.lines ?? 0;

      html += `<tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:10px 8px; font-family:monospace; color:#e2e8f0;" title="${s.id}">${shortId}</td>
        <td style="text-align:right; padding:10px 8px; ${sizeStyle}">${sizeKB} KB${isLarge ? " ⚠️" : ""}</td>
        <td style="text-align:right; padding:10px 8px; color:#94a3b8;">${lines}</td>
        <td style="text-align:right; padding:10px 8px; color:#94a3b8;">${modified}</td>
        <td style="text-align:center; padding:10px 8px;">
          <button style="padding:4px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer; background:#ef4444; color:#fff; font-weight:600;"
            onclick="window.nkdClearSession('${s.id}')">🗑️ Xóa</button>
        </td>
      </tr>`;
    }

    const totalBytes = sessions.reduce(
      (acc: number, s: SessionInfo) => acc + (s.sizeBytes ?? (s.sizeKB ? s.sizeKB * 1024 : 0)),
      0,
    );

    html += `</tbody></table>`;

    // Auto-purge notification
    if (autoPurged.length > 0) {
      html += `<p style="color:#22c55e; font-size:12px; margin-top:8px; padding:8px; background:#064e3b; border-radius:6px;">
        🧹 Vừa auto-clean <strong>${autoPurged.length}</strong> session(s) vượt ${thresholdKB} KB limit: ${autoPurged.map((id: string) => id.slice(0, 8)).join(", ")}
      </p>`;
    }

    html += `<p style="color:#94a3b8; font-size:12px; margin-top:8px;">
      Tổng: <strong style="color:#e2e8f0;">${sessions.length}</strong> session(s) · 
      Tổng kích thước: <strong style="color:#e2e8f0;">${(totalBytes / 1024).toFixed(1)} KB</strong> ·
      Auto-clean threshold: <strong style="color:#f59e0b;">${thresholdKB} KB</strong>
    </p>`;
    container.innerHTML = html;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải sessions";
    container.innerHTML = `<p style="color:#f87171; text-align:center; padding:20px;">❌ ${msg}</p>`;
  }
}

async function nkdClearAllSessions(): Promise<void> {
  if (
    !confirm(
      "⚠️ XÓA TẤT CẢ SESSIONS?\n\nBot sẽ bắt đầu hội thoại mới với tất cả người dùng.\nDữ liệu KB không bị ảnh hưởng.",
    )
  ) {
    return;
  }
  try {
    const result = (await rpc("nkd.session.clearAll", {})) as { deleted: number };
    nkdToast(`✅ Đã xóa ${result.deleted ?? 0} sessions`);
    nkdRefreshSessions();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi xóa sessions";
    nkdToast(`❌ ${msg}`, true);
  }
}

async function nkdClearSession(sessionId: string): Promise<void> {
  if (!confirm(`Xóa session ${sessionId}?\nHội thoại này sẽ được reset.`)) {
    return;
  }
  try {
    await rpc("nkd.session.clear", { sessionId });
    nkdToast(`✅ Đã xóa session ${sessionId.slice(0, 12)}`);
    nkdRefreshSessions();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi xóa session";
    nkdToast(`❌ ${msg}`, true);
  }
}

// Expose to inline onclick handlers
(window as Record<string, unknown>).nkdClearSession = nkdClearSession;
(window as Record<string, unknown>).nkdClearAllSessions = nkdClearAllSessions;
(window as Record<string, unknown>).nkdRefreshSessions = nkdRefreshSessions;

// ---------------------------------------------------------------------------
// Workspace files (SOUL.md + IDENTITY.md)
// ---------------------------------------------------------------------------

async function nkdLoadWorkspace(): Promise<void> {
  await Promise.all([nkdLoadSoul(), nkdLoadIdentity(), nkdLoadAgentName()]);
}

async function nkdLoadAgentName(): Promise<void> {
  const nameEl = document.getElementById("nkd-ws-agentname");
  const newNameInput = document.getElementById("nkd-ws-newname") as HTMLInputElement | null;
  try {
    const d = await rpc("nkd.workspace.agentName");
    if (d.name) {
      if (nameEl) {
        nameEl.textContent = `${d.name}`;
        nameEl.style.color = "var(--color-success, #4ade80)";
      }
      // Auto-fill "new name" input
      if (newNameInput && !newNameInput.value) {
        newNameInput.value = d.name;
      }
    } else {
      if (nameEl) {
        nameEl.textContent = "(chưa kết nối Zalo)";
        nameEl.style.color = "var(--color-muted)";
      }
    }
  } catch {
    if (nameEl) {
      nameEl.textContent = "(lỗi)";
      nameEl.style.color = "var(--color-error, #ef4444)";
    }
  }
}

function nkdReplaceBotName(): void {
  const oldNameInput = document.getElementById("nkd-ws-oldname") as HTMLInputElement | null;
  const newNameInput = document.getElementById("nkd-ws-newname") as HTMLInputElement | null;
  const soulEl = document.getElementById("nkd-ws-soul") as HTMLTextAreaElement | null;
  const identityEl = document.getElementById("nkd-ws-identity") as HTMLTextAreaElement | null;

  const oldName = oldNameInput?.value?.trim();
  const newName = newNameInput?.value?.trim();

  if (!oldName || !newName) {
    nkdToast("⚠️ Nhập cả tên cũ và tên mới!", true);
    return;
  }
  if (oldName === newName) {
    nkdToast("Tên cũ và mới giống nhau!", true);
    return;
  }

  let count = 0;
  const re = new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

  if (soulEl && soulEl.value) {
    const before = soulEl.value;
    soulEl.value = soulEl.value.replace(re, newName);
    if (soulEl.value !== before) { count++; }
  }
  if (identityEl && identityEl.value) {
    const before = identityEl.value;
    identityEl.value = identityEl.value.replace(re, newName);
    if (identityEl.value !== before) { count++; }
  }

  if (count > 0) {
    nkdToast(`✅ Đã thay "${oldName}" → "${newName}" trong ${count} file(s). Nhớ bấm Lưu!`);
  } else {
    nkdToast(`⚠️ Không tìm thấy "${oldName}" trong SOUL/IDENTITY`, true);
  }
}

async function nkdLoadSoul(): Promise<void> {
  const el = document.getElementById("nkd-ws-soul") as HTMLTextAreaElement;
  if (!el) return;
  try {
    const d = await rpc("nkd.workspace.soul");
    el.value = d.content || "";
  } catch (err: any) {
    el.value = `⚠️ Lỗi tải SOUL.md: ${err.message}`;
  }
}

async function nkdLoadIdentity(): Promise<void> {
  const el = document.getElementById("nkd-ws-identity") as HTMLTextAreaElement;
  if (!el) return;
  try {
    const d = await rpc("nkd.workspace.identity");
    el.value = d.content || "";
  } catch (err: any) {
    el.value = `⚠️ Lỗi tải IDENTITY.md: ${err.message}`;
  }
}

async function nkdSaveSoul(): Promise<void> {
  const el = document.getElementById("nkd-ws-soul") as HTMLTextAreaElement;
  if (!el) return;
  const content = el.value;
  if (!content.trim()) {
    nkdToast("SOUL.md không được để trống!", true);
    return;
  }
  try {
    await rpc("nkd.workspace.soulSave", { content });
    nkdToast("💾 Đã lưu SOUL.md — bot sẽ dùng từ tin nhắn tiếp theo");
  } catch (err: any) {
    nkdToast(`❌ Lưu SOUL.md thất bại: ${err.message}`, true);
  }
}

async function nkdSaveIdentity(): Promise<void> {
  const el = document.getElementById("nkd-ws-identity") as HTMLTextAreaElement;
  if (!el) return;
  const content = el.value;
  if (!content.trim()) {
    nkdToast("IDENTITY.md không được để trống!", true);
    return;
  }
  try {
    await rpc("nkd.workspace.identitySave", { content });
    nkdToast("💾 Đã lưu IDENTITY.md — bot sẽ dùng từ tin nhắn tiếp theo");
  } catch (err: any) {
    nkdToast(`❌ Lưu IDENTITY.md thất bại: ${err.message}`, true);
  }
}

// Expose workspace functions to inline handlers
(window as Record<string, unknown>).nkdLoadWorkspace = nkdLoadWorkspace;
(window as Record<string, unknown>).nkdLoadSoul = nkdLoadSoul;
(window as Record<string, unknown>).nkdLoadIdentity = nkdLoadIdentity;
(window as Record<string, unknown>).nkdSaveSoul = nkdSaveSoul;
(window as Record<string, unknown>).nkdSaveIdentity = nkdSaveIdentity;
(window as Record<string, unknown>).nkdReplaceBotName = nkdReplaceBotName;
(window as Record<string, unknown>).nkdLoadAgentName = nkdLoadAgentName;

// ---------------------------------------------------------------------------
// Auto-init
// ---------------------------------------------------------------------------

let nkdInitialized = false;

export function initNkdCustom(state?: AppViewState): void {
  if (state) _state = state;
  if (nkdInitialized) return;
  nkdInitialized = true;
  setTimeout(() => {
    nkdRefreshKB();
  }, 300);
}
