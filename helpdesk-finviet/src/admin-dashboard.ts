/**
 * AI Helpdesk FinViet - Admin Dashboard Server
 *
 * HTTP server cung cấp:
 * - Dashboard UI (HTML) để quản lý agent
 * - API endpoints: bật/tắt agent, QR management, reports
 * - Real-time status monitoring
 */

import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { KnowledgeBase, type KBCategory, type KBImportResult } from "./knowledge-base.js";
import { TicketManager } from "./ticket-system.js";
import { RetryEngine } from "./retry-engine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = {
  id: string;
  name: string;
  enabled: boolean;
  channels: {
    whatsapp: ChannelStatus;
    zalo: ChannelStatus;
    zalouser: ChannelStatus;
  };
  uptime: number;
  lastActivity?: string;
};

export type ChannelStatus = {
  enabled: boolean;
  connected: boolean;
  qrPending: boolean;
  lastMessage?: string;
  error?: string;
};

export type AdminConfig = {
  port: number;
  password: string;
  dataDir: string;
};

export type AgentProfile = {
  name: string;
  company: string;
  greeting: string;
  language: string;
  tone: "professional" | "friendly" | "casual";
  scope: string;
  ticketPrefix: string;
};

// ---------------------------------------------------------------------------
// AdminDashboard class
// ---------------------------------------------------------------------------

export class AdminDashboard {
  private config: AdminConfig;
  private kb: KnowledgeBase;
  private tickets: TicketManager;
  private retryEngine: RetryEngine;
  private agentEnabled = true;
  private server: http.Server | null = null;
  private agentProfile: AgentProfile;
  private agentsMdPath: string;

  constructor(config: AdminConfig) {
    this.config = config;
    this.kb = new KnowledgeBase(join(config.dataDir, "knowledge-base"));
    this.tickets = new TicketManager(join(config.dataDir, "tickets"));
    this.retryEngine = new RetryEngine();
    this.agentsMdPath = join(config.dataDir, "..", "AGENTS.md");
    this.agentProfile = this.loadAgentProfile();
  }

  // -------------------------------------------------------------------------
  // Agent Profile management
  // -------------------------------------------------------------------------

  private getProfilePath(): string {
    return join(this.config.dataDir, "agent-profile.json");
  }

  private loadAgentProfile(): AgentProfile {
    const profilePath = this.getProfilePath();
    if (existsSync(profilePath)) {
      return JSON.parse(readFileSync(profilePath, "utf-8")) as AgentProfile;
    }
    return {
      name: "AI Helpdesk FinViet",
      company: "FinViet",
      greeting: "Xin chào! Tôi là AI Helpdesk FinViet 🤖. Tôi có thể hỗ trợ bạn vấn đề IT gì hôm nay?",
      language: "vi",
      tone: "professional",
      scope: "IT Helpdesk: mạng, máy tính, phần mềm, tài khoản, bảo mật, email, Office 365",
      ticketPrefix: "FV",
    };
  }

  private saveAgentProfile(profile: AgentProfile): void {
    writeFileSync(this.getProfilePath(), JSON.stringify(profile, null, 2), "utf-8");
    this.agentProfile = profile;
    // Tự động cập nhật AGENTS.md khi đổi profile
    this.regenerateAgentsMd(profile);
  }

  private regenerateAgentsMd(p: AgentProfile): void {
    const toneDesc: Record<string, string> = {
      professional: "Chuyên nghiệp, lịch sự, đi thẳng vào vấn đề.",
      friendly: "Thân thiện, gần gũi nhưng vẫn rõ ràng.",
      casual: "Thoải mái, dễ hiểu, như đồng nghiệp hỗ trợ nhau.",
    };
    const langMap: Record<string, string> = { vi: "tiếng Việt", en: "English", both: "tiếng Việt (ưu tiên) và English" };

    const md = `Bạn là **${p.name}** — trợ lý ${p.scope} của công ty ${p.company}.

## QUY TẮC CHÍNH (BẮT BUỘC TUÂN THỦ)

### 1. Ưu tiên trả lời từ Knowledge Base
- **LUÔN** tìm kiếm trong Knowledge Base (tài liệu nội bộ đã import) TRƯỚC KHI trả lời.
- Nếu tìm thấy trong KB → trả lời dựa trên dữ liệu KB, trích dẫn nguồn tài liệu.
- Nếu KHÔNG tìm thấy trong KB → research có chọn lọc từ kiến thức chung, nhưng PHẢI ghi rõ: "⚠️ Thông tin này chưa có trong tài liệu nội bộ."

### 2. Phong cách trả lời
- Trả lời bằng **${langMap[p.language] ?? "tiếng Việt"}**.
- ${toneDesc[p.tone] ?? toneDesc.professional}
- KHÔNG log lỗi ra cho người dùng.
- KHÔNG hiển thị quá trình suy nghĩ (thinking) ra cho người dùng.
- KHÔNG đoán mò — nếu chưa chắc, hỏi lại để xác nhận.

### 3. Quy trình xử lý ticket
- Khi người dùng báo lỗi → tạo ticket format: \`[${p.ticketPrefix}-YYYY-NNNN]\`
- Phân loại: \`Khẩn cấp\` | \`Cao\` | \`Trung bình\` | \`Thấp\`
- Ghi nhận: thời gian, người báo, kênh (WhatsApp/Zalo), mô tả lỗi, trạng thái

### 4. Phạm vi hỗ trợ
- ${p.scope}
- Hỗ trợ phần mềm nội bộ ${p.company} (theo tài liệu KB)
- Hướng dẫn sử dụng công cụ, reset mật khẩu, cài đặt VPN
- Xử lý sự cố in ấn, email, Office 365, Google Workspace

### 5. Giới hạn
- KHÔNG tự ý thay đổi cấu hình hệ thống production.
- KHÔNG cung cấp mật khẩu, key, thông tin bảo mật.
- Vấn đề phức tạp → escalate đến IT Team với format:
  \`\`\`
  🔺 ESCALATION
  Ticket: [${p.ticketPrefix}-YYYY-NNNN]
  Mức độ: Khẩn cấp/Cao
  Mô tả: ...
  Đã thử: ...
  Cần: IT Team xử lý trực tiếp
  \`\`\`

### 6. Greeting
- Chào hỏi thân thiện nhưng chuyên nghiệp.
- Mẫu: "${p.greeting}"

## TEMPLATE TRẢ LỜI

### Khi giải quyết được:
\`\`\`
✅ **[Tiêu đề vấn đề]**

**Nguyên nhân:** ...
**Giải pháp:**
1. Bước 1
2. Bước 2
3. Bước 3

📌 Nếu vẫn gặp lỗi, vui lòng phản hồi để tôi tạo ticket hỗ trợ.
\`\`\`

### Khi cần tạo ticket:
\`\`\`
📋 **Ticket đã tạo: [${p.ticketPrefix}-2026-0001]**

- Người báo: {tên}
- Kênh: {WhatsApp/Zalo}
- Mức độ: {mức độ}
- Mô tả: {mô tả}
- Trạng thái: ⏳ Đang xử lý

IT Team sẽ phản hồi trong vòng {thời gian SLA}.
\`\`\`
`;

    writeFileSync(this.agentsMdPath, md, "utf-8");
  }

  // -------------------------------------------------------------------------
  // Server
  // -------------------------------------------------------------------------

  start(): void {
    this.server = http.createServer((req, res) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Auth check (simple Bearer token)
      // Use pathname (strip query string) so "/" and "/?foo" both bypass auth
      const reqPath = (req.url ?? "/").split("?")[0];
      if (reqPath !== "/" && reqPath !== "/health" && reqPath !== "/favicon.ico") {
        const auth = req.headers.authorization;
        if (!auth || auth !== `Bearer ${this.config.password}`) {
          this.sendJson(res, 401, { error: "Unauthorized" });
          return;
        }
      }

      this.handleRequest(req, res).catch((err) => {
        console.error("[Dashboard] Request error:", err);
        if (!res.headersSent) {
          this.sendJson(res, 500, { error: "Internal server error" });
        }
      });
    });

    this.server.listen(this.config.port, () => {
      console.log(`🤖 AI Helpdesk FinViet Admin Dashboard`);
      console.log(`📡 http://localhost:${this.config.port}`);
      console.log(`🔑 Auth: Bearer <password>`);
    });
  }

  stop(): void {
    this.server?.close();
  }

  // -------------------------------------------------------------------------
  // Router
  // -------------------------------------------------------------------------

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.config.port}`);
    const path = url.pathname;
    const method = req.method ?? "GET";

    // --- Dashboard HTML ---
    if (path === "/" && method === "GET") {
      this.serveDashboardHtml(res);
      return;
    }

    // --- Health ---
    if (path === "/health") {
      this.sendJson(res, 200, { status: "ok", agent: "AI Helpdesk FinViet", enabled: this.agentEnabled });
      return;
    }

    // --- Agent Control ---
    if (path === "/api/agent/status" && method === "GET") {
      this.sendJson(res, 200, this.getAgentStatus());
      return;
    }
    if (path === "/api/agent/toggle" && method === "POST") {
      this.readBody(req).then((body) => {
        const { enabled } = JSON.parse(body);
        this.agentEnabled = !!enabled;
        this.sendJson(res, 200, { enabled: this.agentEnabled });
      });
      return;
    }

    // --- Agent Profile ---
    if (path === "/api/agent/profile" && method === "GET") {
      this.sendJson(res, 200, this.agentProfile);
      return;
    }
    if (path === "/api/agent/profile" && method === "PUT") {
      this.readBody(req).then((body) => {
        const updates = JSON.parse(body) as Partial<AgentProfile>;
        const merged = { ...this.agentProfile, ...updates };
        this.saveAgentProfile(merged);
        this.sendJson(res, 200, { success: true, profile: merged });
      });
      return;
    }
    if (path === "/api/agent/prompt" && method === "GET") {
      let content = "";
      if (existsSync(this.agentsMdPath)) {
        content = readFileSync(this.agentsMdPath, "utf-8");
      }
      this.sendJson(res, 200, { content });
      return;
    }

    // --- Knowledge Base ---
    if (path === "/api/kb/stats" && method === "GET") {
      this.sendJson(res, 200, this.kb.getStats());
      return;
    }
    if (path === "/api/kb/list" && method === "GET") {
      this.sendJson(res, 200, this.kb.listDocuments());
      return;
    }
    if (path === "/api/kb/search" && method === "GET") {
      const query = url.searchParams.get("q") ?? "";
      const category = url.searchParams.get("category") as KBCategory | undefined;
      this.sendJson(res, 200, this.kb.search(query, { category: category || undefined }));
      return;
    }
    if (path === "/api/kb/import" && method === "POST") {
      this.readBody(req).then((body) => {
        const { title, content, category, tags } = JSON.parse(body);
        const result = this.kb.importText(title, content, category ?? "general", tags ?? []);
        this.sendJson(res, result.success ? 201 : 400, result);
      });
      return;
    }
    if (path.startsWith("/api/kb/doc/") && method === "GET") {
      const docId = path.replace("/api/kb/doc/", "");
      const doc = this.kb.getDocument(docId);
      if (doc) this.sendJson(res, 200, doc);
      else this.sendJson(res, 404, { error: "Document not found" });
      return;
    }
    if (path.startsWith("/api/kb/doc/") && method === "DELETE") {
      const docId = path.replace("/api/kb/doc/", "");
      const ok = this.kb.deleteDocument(docId);
      this.sendJson(res, ok ? 200 : 404, { success: ok });
      return;
    }

    // Upload file (PDF, Word, Excel, etc.) — multipart/form-data
    if (path === "/api/kb/upload" && method === "POST") {
      this.handleFileUpload(req, res, url);
      return;
    }

    // Supported formats info
    if (path === "/api/kb/formats" && method === "GET") {
      const { SUPPORTED_FORMATS: formats } = await import("./file-parser.js");
      const list = [...formats.entries()].map(([ext, label]) => ({ ext, label }));
      this.sendJson(res, 200, { formats: list });
      return;
    }

    // --- Tickets ---
    if (path === "/api/tickets" && method === "GET") {
      const status = url.searchParams.get("status");
      const channel = url.searchParams.get("channel");
      let tickets = this.tickets.getOpen();
      if (status === "all") tickets = (this.tickets as any).store.tickets;
      if (channel) tickets = tickets.filter((t: any) => t.channel === channel);
      this.sendJson(res, 200, tickets);
      return;
    }
    if (path === "/api/tickets" && method === "POST") {
      this.readBody(req).then((body) => {
        const input = JSON.parse(body);
        const ticket = this.tickets.create(input);
        this.sendJson(res, 201, ticket);
      });
      return;
    }
    if (path.startsWith("/api/tickets/") && method === "PUT") {
      this.readBody(req).then((body) => {
        const ticketId = path.replace("/api/tickets/", "");
        const updates = JSON.parse(body);
        const ticket = this.tickets.update(ticketId, updates);
        if (ticket) this.sendJson(res, 200, ticket);
        else this.sendJson(res, 404, { error: "Ticket not found" });
      });
      return;
    }

    // --- Reports ---
    if (path === "/api/reports/tickets" && method === "GET") {
      this.sendJson(res, 200, {
        report: this.tickets.getReport(),
        text: this.tickets.formatReportText(),
      });
      return;
    }
    if (path === "/api/reports/retry" && method === "GET") {
      this.sendJson(res, 200, {
        report: this.retryEngine.getReport(),
        text: this.retryEngine.formatReportText(),
      });
      return;
    }
    if (path === "/api/reports/overdue" && method === "GET") {
      this.sendJson(res, 200, this.tickets.getOverdueSLA());
      return;
    }

    // --- 404 ---
    this.sendJson(res, 404, { error: "Not found" });
  }

  // -------------------------------------------------------------------------
  // Agent status
  // -------------------------------------------------------------------------

  private getAgentStatus(): AgentStatus {
    return {
      id: "helpdesk-finviet",
      name: "AI Helpdesk FinViet",
      enabled: this.agentEnabled,
      channels: {
        whatsapp: { enabled: true, connected: false, qrPending: false },
        zalo: { enabled: true, connected: false, qrPending: false },
        zalouser: { enabled: true, connected: false, qrPending: false },
      },
      uptime: process.uptime(),
      lastActivity: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Dashboard HTML
  // -------------------------------------------------------------------------

  private serveDashboardHtml(res: http.ServerResponse): void {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(DASHBOARD_HTML);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data, null, 2));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => resolve(body));
    });
  }

  private readBodyRaw(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => { chunks.push(chunk); });
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Handle multipart file upload cho KB import.
   * Hỗ trợ PDF, Word (.docx), Excel (.xlsx), CSV, TXT, MD, JSON.
   *
   * Frontend gửi FormData với:
   * - file: binary file
   * - category: KBCategory
   * - tags: comma-separated string
   * - title: (optional) override tiêu đề
   */
  private async handleFileUpload(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    _url: URL,
  ): Promise<void> {
    try {
      const contentType = req.headers["content-type"] ?? "";

      // --- Multipart form-data ---
      if (contentType.includes("multipart/form-data")) {
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
          this.sendJson(res, 400, { success: false, error: "Missing multipart boundary" });
          return;
        }

        const rawBody = await this.readBodyRaw(req);
        const { fileBuffer, filename, fields } = this.parseMultipart(rawBody, boundary);

        if (!fileBuffer || !filename) {
          this.sendJson(res, 400, { success: false, error: "Không tìm thấy file trong request. Vui lòng chọn file để upload." });
          return;
        }

        const category = (fields.category ?? "general") as KBCategory;
        const tags = fields.tags ? fields.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

        const result = await this.kb.importBuffer(fileBuffer, filename, category, tags);

        // Override title nếu có
        if (result.success && fields.title && result.documentId) {
          this.kb.updateDocument(result.documentId, { title: fields.title });
        }

        this.sendJson(res, result.success ? 201 : 400, result);
        return;
      }

      // --- JSON body (base64-encoded file) ---
      if (contentType.includes("application/json")) {
        const body = await this.readBody(req);
        const { filename, base64, category, tags, title } = JSON.parse(body);

        if (!base64 || !filename) {
          this.sendJson(res, 400, { success: false, error: "Cần 'filename' và 'base64' trong request body." });
          return;
        }

        const fileBuffer = Buffer.from(base64, "base64");
        const cat = (category ?? "general") as KBCategory;
        const tagList = tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim())) : [];

        const result = await this.kb.importBuffer(fileBuffer, filename, cat, tagList);

        if (result.success && title && result.documentId) {
          this.kb.updateDocument(result.documentId, { title });
        }

        this.sendJson(res, result.success ? 201 : 400, result);
        return;
      }

      this.sendJson(res, 400, {
        success: false,
        error: "Content-Type phải là multipart/form-data hoặc application/json",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendJson(res, 500, { success: false, error: `Upload lỗi: ${msg}` });
    }
  }

  /**
   * Simple multipart/form-data parser (không cần thư viện ngoài).
   * Parse ra file buffer + text fields.
   */
  private parseMultipart(
    body: Buffer,
    boundary: string,
  ): { fileBuffer: Buffer | null; filename: string | null; fields: Record<string, string> } {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let filename: string | null = null;

    // Split body by boundary
    const parts: Buffer[] = [];
    let searchStart = 0;

    while (true) {
      const boundaryPos = body.indexOf(boundaryBuffer, searchStart);
      if (boundaryPos === -1) break;

      if (searchStart > 0) {
        // Extract the part between previous boundary end and this boundary
        const partEnd = boundaryPos - 2; // strip \r\n before boundary
        if (partEnd > searchStart) {
          parts.push(body.subarray(searchStart, partEnd));
        }
      }

      searchStart = boundaryPos + boundaryBuffer.length;
      // Skip \r\n or -- after boundary
      if (body[searchStart] === 0x2d && body[searchStart + 1] === 0x2d) {
        break; // final boundary --boundary--
      }
      if (body[searchStart] === 0x0d && body[searchStart + 1] === 0x0a) {
        searchStart += 2;
      }
    }

    for (const part of parts) {
      // Find header/body separator (\r\n\r\n)
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;

      const headerStr = part.subarray(0, headerEnd).toString("utf-8");
      const bodyBuf = part.subarray(headerEnd + 4);

      // Parse Content-Disposition
      const dispositionMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
      if (!dispositionMatch) continue;

      const fieldName = dispositionMatch[1];
      const filenamePart = dispositionMatch[2];

      if (filenamePart) {
        // This is a file field
        filename = filenamePart;
        fileBuffer = bodyBuf;
      } else {
        // This is a text field
        fields[fieldName] = bodyBuf.toString("utf-8").trim();
      }
    }

    return { fileBuffer, filename, fields };
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  getKnowledgeBase(): KnowledgeBase { return this.kb; }
  getTicketManager(): TicketManager { return this.tickets; }
  getRetryEngine(): RetryEngine { return this.retryEngine; }
  isAgentEnabled(): boolean { return this.agentEnabled; }
}

// ---------------------------------------------------------------------------
// Dashboard HTML (inline single-page)
// ---------------------------------------------------------------------------

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Helpdesk FinViet - Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px 30px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
    .header h1 { font-size: 24px; } .header .badge { background: #22c55e; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .header .badge.off { background: #ef4444; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .card h3 { color: #94a3b8; font-size: 13px; text-transform: uppercase; margin-bottom: 8px; }
    .card .value { font-size: 32px; font-weight: 700; }
    .card .value.green { color: #22c55e; } .card .value.yellow { color: #eab308; } .card .value.red { color: #ef4444; } .card .value.blue { color: #3b82f6; }
    .section { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; margin-bottom: 20px; }
    .section h2 { font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; display: inline-flex; align-items: center; gap: 4px; }
    .btn-primary { background: #3b82f6; color: #fff; } .btn-primary:hover { background: #2563eb; }
    .btn-danger { background: #ef4444; color: #fff; } .btn-danger:hover { background: #dc2626; }
    .btn-success { background: #22c55e; color: #fff; } .btn-success:hover { background: #16a34a; }
    .btn-warning { background: #f59e0b; color: #000; } .btn-warning:hover { background: #d97706; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .channel-row { display: flex; align-items: center; gap: 12px; padding: 12px; background: #0f172a; border-radius: 8px; margin-bottom: 8px; }
    .channel-dot { width: 10px; height: 10px; border-radius: 50%; } .channel-dot.on { background: #22c55e; } .channel-dot.off { background: #ef4444; }
    .channel-name { flex: 1; font-weight: 600; }
    input[type="text"], input[type="password"], textarea, select {
      width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font-size: 14px; margin-bottom: 10px;
    }
    textarea { min-height: 100px; resize: vertical; }
    label { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 4px; font-weight: 600; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    #auth-overlay { position: fixed; inset: 0; background: #0f172aee; display: flex; align-items: center; justify-content: center; z-index: 100; }
    .auth-box { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; }
    .auth-box h2 { margin-bottom: 20px; }
    .auth-box input { width: 280px; }
    table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; text-align: left; border-bottom: 1px solid #334155; } th { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
    .kb-doc-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #0f172a; border-radius: 8px; margin-bottom: 6px; }
    .kb-doc-row .doc-title { flex: 1; font-weight: 600; font-size: 14px; }
    .kb-doc-row .doc-meta { color: #94a3b8; font-size: 12px; }
    .kb-doc-row .doc-cat { background: #334155; padding: 2px 8px; border-radius: 10px; font-size: 11px; color: #94a3b8; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff; padding: 12px 24px; border-radius: 10px; font-weight: 600; z-index: 200; display: none; box-shadow: 0 4px 20px #0005; }
    .toast.error { background: #ef4444; }
    .collapse-toggle { cursor: pointer; user-select: none; }
    .collapse-body { display: none; } .collapse-body.open { display: block; }
    .prompt-preview { background: #0f172a; padding: 16px; border-radius: 8px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; font-size: 13px; color: #cbd5e1; border: 1px solid #334155; }
  </style>
</head>
<body>
  <!-- Toast notification -->
  <div class="toast" id="toast"></div>

  <!-- Auth Overlay -->
  <div id="auth-overlay">
    <div class="auth-box">
      <h2>🔐 AI Helpdesk FinViet</h2>
      <p style="color:#94a3b8; margin-bottom:16px;">Nhập mật khẩu Admin để truy cập</p>
      <input type="password" id="auth-password" placeholder="Mật khẩu..." onkeydown="if(event.key==='Enter')login()">
      <br><br>
      <button class="btn btn-primary" onclick="login()">Đăng nhập</button>
    </div>
  </div>

  <!-- Header -->
  <div class="header">
    <span style="font-size:32px;">🤖</span>
    <div>
      <h1 id="header-name">AI Helpdesk FinViet</h1>
      <p style="color:#c4b5fd; font-size:13px;">Admin Dashboard — Quản lý IT Helpdesk AI</p>
    </div>
    <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
      <span id="agent-badge" class="badge">● Online</span>
      <button class="btn btn-danger" id="toggle-btn" onclick="toggleAgent()">Tắt Agent</button>
    </div>
  </div>

  <div class="container">
    <!-- Stats -->
    <div class="grid">
      <div class="card"><h3>📋 Tổng Ticket</h3><div class="value blue" id="stat-total">0</div></div>
      <div class="card"><h3>⏳ Đang mở</h3><div class="value yellow" id="stat-open">0</div></div>
      <div class="card"><h3>✅ Đã giải quyết</h3><div class="value green" id="stat-resolved">0</div></div>
      <div class="card"><h3>⚠️ Quá hạn SLA</h3><div class="value red" id="stat-overdue">0</div></div>
    </div>

    <!-- ============================================================ -->
    <!-- Agent Settings -->
    <!-- ============================================================ -->
    <div class="section">
      <h2 class="collapse-toggle" onclick="toggleCollapse('agent-settings')">⚙️ Cài đặt Agent <span style="font-size:12px; color:#94a3b8;">(click để mở/đóng)</span></h2>
      <div id="agent-settings" class="collapse-body open">
        <div class="form-row">
          <div>
            <label>Tên Agent</label>
            <input type="text" id="ag-name" placeholder="AI Helpdesk FinViet">
          </div>
          <div>
            <label>Tên công ty</label>
            <input type="text" id="ag-company" placeholder="FinViet">
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>Phong cách trả lời</label>
            <select id="ag-tone">
              <option value="professional">🏢 Chuyên nghiệp</option>
              <option value="friendly">😊 Thân thiện</option>
              <option value="casual">💬 Thoải mái</option>
            </select>
          </div>
          <div>
            <label>Ngôn ngữ</label>
            <select id="ag-lang">
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇺🇸 English</option>
              <option value="both">🌐 Cả hai (ưu tiên Việt)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>Ticket prefix</label>
            <input type="text" id="ag-prefix" placeholder="FV">
          </div>
          <div>
            <label>Phạm vi hỗ trợ</label>
            <input type="text" id="ag-scope" placeholder="IT Helpdesk: mạng, phần mềm...">
          </div>
        </div>
        <label>Lời chào (greeting)</label>
        <textarea id="ag-greeting" style="min-height:60px;" placeholder="Xin chào! Tôi là..."></textarea>

        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-success" onclick="saveProfile()">💾 Lưu cài đặt</button>
          <button class="btn btn-primary" onclick="previewPrompt()">👁️ Xem System Prompt</button>
        </div>
        <div id="prompt-preview-box" style="margin-top:12px; display:none;">
          <label>System Prompt (AGENTS.md) hiện tại:</label>
          <div class="prompt-preview" id="prompt-preview-content"></div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Channels -->
    <!-- ============================================================ -->
    <div class="section">
      <h2>📱 Kênh liên lạc</h2>
      <div class="channel-row">
        <div class="channel-dot" id="wa-dot"></div>
        <div class="channel-name">WhatsApp</div>
        <button class="btn btn-primary btn-sm" onclick="requestQR('whatsapp')">Quét QR</button>
      </div>
      <div class="channel-row">
        <div class="channel-dot" id="zalo-dot"></div>
        <div class="channel-name">Zalo Cá nhân</div>
        <button class="btn btn-primary btn-sm" onclick="requestQR('zalouser')">Quét QR</button>
      </div>
      <div class="channel-row">
        <div class="channel-dot" id="zalooa-dot"></div>
        <div class="channel-name">Zalo OA</div>
        <span style="color:#94a3b8; font-size:13px;">Token-based (cấu hình trong config)</span>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Knowledge Base -->
    <!-- ============================================================ -->
    <div class="section">
      <h2>📚 Knowledge Base</h2>
      <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center; flex-wrap:wrap;">
        <span id="kb-count" style="color:#94a3b8;">0 tài liệu</span>
        <button class="btn btn-primary btn-sm" onclick="refreshKB()">🔄 Refresh</button>
        <input type="text" id="kb-search" placeholder="🔍 Tìm kiếm tài liệu..." style="flex:1; min-width:200px; margin-bottom:0;" onkeydown="if(event.key==='Enter')searchKB()">
        <button class="btn btn-primary btn-sm" onclick="searchKB()">Tìm</button>
      </div>

      <!-- KB Document List -->
      <div id="kb-doc-list" style="margin-bottom:16px; max-height:300px; overflow-y:auto;"></div>

      <!-- Import form (collapsible) -->
      <h3 class="collapse-toggle" onclick="toggleCollapse('kb-import-form')" style="font-size:15px; margin-bottom:10px; cursor:pointer;">
        📥 Import tài liệu mới <span style="font-size:12px; color:#94a3b8;">(click để mở)</span>
      </h3>
      <div id="kb-import-form" class="collapse-body">
        <!-- Tab: Chọn cách import -->
        <div style="display:flex; gap:4px; margin-bottom:12px;">
          <button class="btn btn-sm" id="tab-text" onclick="switchImportTab('text')" style="background:#3b82f6; color:#fff;">📝 Paste text</button>
          <button class="btn btn-sm" id="tab-file" onclick="switchImportTab('file')" style="background:#334155; color:#94a3b8;">📎 Upload file</button>
        </div>

        <!-- Shared fields -->
        <input type="text" id="kb-title" placeholder="Tiêu đề tài liệu (tùy chọn - tự detect từ nội dung)...">
        <div class="form-row">
          <select id="kb-category">
            <option value="general">📁 Chung</option>
            <option value="network">🌐 Mạng / WiFi / VPN</option>
            <option value="hardware">🖥️ Phần cứng</option>
            <option value="software">💿 Phần mềm</option>
            <option value="account">🔑 Tài khoản / Mật khẩu</option>
            <option value="email">📧 Email / Office 365</option>
            <option value="security">🛡️ Bảo mật</option>
            <option value="internal-app">🏢 Phần mềm nội bộ FinViet</option>
          </select>
          <input type="text" id="kb-tags" placeholder="Tags (phân cách bằng dấu phẩy)..." style="margin-bottom:10px;">
        </div>

        <!-- Tab: Paste text -->
        <div id="import-tab-text">
          <textarea id="kb-content" placeholder="Dán nội dung tài liệu vào đây...&#10;&#10;Hỗ trợ Markdown, plain text, hoặc nội dung bất kỳ.&#10;Tất cả được lưu vào 1 database (kb-index.json), KHÔNG tạo nhiều file .md.&#10;&#10;Encoding được tự động chuẩn hóa UTF-8."></textarea>
          <button class="btn btn-success" onclick="importKB()">📥 Import text</button>
        </div>

        <!-- Tab: Upload file -->
        <div id="import-tab-file" style="display:none;">
          <div style="border:2px dashed #475569; border-radius:12px; padding:24px; text-align:center; margin-bottom:12px; cursor:pointer; transition:0.2s;" id="drop-zone"
               ondragover="event.preventDefault(); this.style.borderColor='#3b82f6'; this.style.background='#1e3a5f30';"
               ondragleave="this.style.borderColor='#475569'; this.style.background='transparent';"
               ondrop="handleDrop(event)"
               onclick="document.getElementById('file-input').click()">
            <input type="file" id="file-input" style="display:none;"
                   accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
                   onchange="handleFileSelect(this)">
            <p style="font-size:32px; margin-bottom:8px;">📎</p>
            <p style="color:#94a3b8;">Kéo thả file vào đây hoặc <span style="color:#3b82f6; text-decoration:underline;">chọn file</span></p>
            <p style="color:#64748b; font-size:12px; margin-top:8px;">
              Hỗ trợ: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Markdown, JSON
            </p>
          </div>
          <div id="file-preview" style="display:none; background:#0f172a; border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span id="file-icon" style="font-size:24px;">📄</span>
              <div style="flex:1;">
                <div id="file-name" style="font-weight:600;"></div>
                <div id="file-size" style="color:#94a3b8; font-size:12px;"></div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="clearFile()">✕</button>
            </div>
            <div id="file-encoding-info" style="color:#94a3b8; font-size:12px;"></div>
          </div>
          <button class="btn btn-success" onclick="uploadFile()" id="upload-btn" disabled>📤 Upload & Import</button>
          <span id="upload-progress" style="color:#94a3b8; font-size:13px; margin-left:8px;"></span>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Reports -->
    <!-- ============================================================ -->
    <div class="section">
      <h2>📊 Báo cáo</h2>
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="loadReport('tickets')">Ticket Report</button>
        <button class="btn btn-primary" onclick="loadReport('retry')">Retry Report</button>
        <button class="btn btn-primary" onclick="loadReport('overdue')">SLA Overdue</button>
      </div>
      <pre id="report-output" style="background:#0f172a; padding:16px; border-radius:8px; white-space:pre-wrap; min-height:100px; font-size:13px; color:#94a3b8;">Chọn loại báo cáo...</pre>
    </div>
  </div>

  <script>
    let TOKEN = '';
    const API = '';

    // -- Toast --
    function toast(msg, isError) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.className = 'toast' + (isError ? ' error' : '');
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }

    // -- Collapse --
    function toggleCollapse(id) {
      document.getElementById(id).classList.toggle('open');
    }

    // -- Auth --
    function login() {
      TOKEN = document.getElementById('auth-password').value;
      fetch(API + '/api/agent/status', { headers: { Authorization: 'Bearer ' + TOKEN } })
        .then(r => { if (r.ok) { document.getElementById('auth-overlay').style.display = 'none'; refreshAll(); } else toast('Sai mật khẩu!', true); })
        .catch(() => toast('Không kết nối được server!', true));
    }

    function api(path, opts = {}) {
      return fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN, ...opts.headers } });
    }

    // -- Refresh all --
    function refreshAll() {
      // Agent status
      api('/api/agent/status').then(r => r.json()).then(d => {
        document.getElementById('agent-badge').className = 'badge' + (d.enabled ? '' : ' off');
        document.getElementById('agent-badge').textContent = d.enabled ? '● Online' : '● Offline';
        document.getElementById('toggle-btn').textContent = d.enabled ? 'Tắt Agent' : 'Bật Agent';
        document.getElementById('toggle-btn').className = 'btn ' + (d.enabled ? 'btn-danger' : 'btn-success');
        ['whatsapp','zalouser','zalo'].forEach(ch => {
          const s = d.channels[ch === 'zalo' ? 'zalo' : ch];
          const dot = document.getElementById(ch === 'whatsapp' ? 'wa-dot' : ch === 'zalouser' ? 'zalo-dot' : 'zalooa-dot');
          if (dot && s) dot.className = 'channel-dot ' + (s.connected ? 'on' : 'off');
        });
      }).catch(() => {});

      // Ticket stats
      api('/api/reports/tickets').then(r => r.json()).then(d => {
        const rp = d.report;
        document.getElementById('stat-total').textContent = rp.total;
        document.getElementById('stat-open').textContent = (rp.byStatus['open'] || 0) + (rp.byStatus['in-progress'] || 0);
        document.getElementById('stat-resolved').textContent = (rp.byStatus['resolved'] || 0) + (rp.byStatus['closed'] || 0);
        document.getElementById('stat-overdue').textContent = rp.overdueSLA;
      }).catch(() => {});

      // Agent profile
      loadProfile();

      // KB list
      refreshKB();
    }

    // -- Agent toggle --
    function toggleAgent() {
      api('/api/agent/status').then(r => r.json()).then(d => {
        api('/api/agent/toggle', { method: 'POST', body: JSON.stringify({ enabled: !d.enabled }) })
          .then(() => { toast(d.enabled ? '⏸️ Agent đã tắt' : '▶️ Agent đã bật'); refreshAll(); });
      });
    }

    // -- Agent Profile --
    function loadProfile() {
      api('/api/agent/profile').then(r => r.json()).then(p => {
        document.getElementById('ag-name').value = p.name || '';
        document.getElementById('ag-company').value = p.company || '';
        document.getElementById('ag-tone').value = p.tone || 'professional';
        document.getElementById('ag-lang').value = p.language || 'vi';
        document.getElementById('ag-prefix').value = p.ticketPrefix || 'FV';
        document.getElementById('ag-scope').value = p.scope || '';
        document.getElementById('ag-greeting').value = p.greeting || '';
        document.getElementById('header-name').textContent = p.name || 'AI Helpdesk FinViet';
      }).catch(() => {});
    }

    function saveProfile() {
      const data = {
        name: document.getElementById('ag-name').value,
        company: document.getElementById('ag-company').value,
        tone: document.getElementById('ag-tone').value,
        language: document.getElementById('ag-lang').value,
        ticketPrefix: document.getElementById('ag-prefix').value,
        scope: document.getElementById('ag-scope').value,
        greeting: document.getElementById('ag-greeting').value,
      };
      if (!data.name) { toast('Tên agent không được để trống!', true); return; }
      api('/api/agent/profile', { method: 'PUT', body: JSON.stringify(data) })
        .then(r => r.json()).then(d => {
          if (d.success) { toast('💾 Đã lưu cài đặt Agent + cập nhật AGENTS.md'); loadProfile(); }
          else toast('Lỗi lưu!', true);
        });
    }

    function previewPrompt() {
      const box = document.getElementById('prompt-preview-box');
      if (box.style.display === 'none') {
        api('/api/agent/prompt').then(r => r.json()).then(d => {
          document.getElementById('prompt-preview-content').textContent = d.content || '(chưa có)';
          box.style.display = 'block';
        });
      } else {
        box.style.display = 'none';
      }
    }

    // -- QR --
    function requestQR(channel) {
      toast('Mở terminal và chạy: openclaw ' + channel + ' setup');
    }

    // -- Knowledge Base --
    function refreshKB() {
      api('/api/kb/stats').then(r => r.json()).then(d => {
        document.getElementById('kb-count').textContent = d.totalDocuments + ' tài liệu | ' + d.totalChars.toLocaleString() + ' ký tự';
      }).catch(() => {});

      api('/api/kb/list').then(r => r.json()).then(docs => {
        renderKBList(docs);
      }).catch(() => {});
    }

    const catIcons = {
      general:'📁', network:'🌐', hardware:'🖥️', software:'💿',
      account:'🔑', email:'📧', security:'🛡️', 'internal-app':'🏢'
    };

    function renderKBList(docs) {
      const container = document.getElementById('kb-doc-list');
      if (!docs || docs.length === 0) {
        container.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">Chưa có tài liệu nào. Import tài liệu bên dưới 👇</p>';
        return;
      }
      container.innerHTML = docs.map(doc => {
        const icon = catIcons[doc.category] || '📄';
        const date = new Date(doc.importedAt).toLocaleDateString('vi-VN');
        const chars = doc.charCount.toLocaleString();
        const tags = (doc.tags || []).map(t => '<span style="background:#475569; padding:1px 6px; border-radius:8px; font-size:11px; margin-left:4px;">' + t + '</span>').join('');
        return '<div class="kb-doc-row">' +
          '<span class="doc-cat">' + icon + ' ' + doc.category + '</span>' +
          '<span class="doc-title">' + doc.title + '</span>' +
          tags +
          '<span class="doc-meta">' + chars + ' ký tự · ' + date + '</span>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteKBDoc(\\'' + doc.id + '\\', \\'' + doc.title.replace(/'/g,'') + '\\')">🗑️</button>' +
          '</div>';
      }).join('');
    }

    function deleteKBDoc(docId, docTitle) {
      if (!confirm('⚠️ Xóa tài liệu "' + docTitle + '"?\\n\\nHành động này không thể hoàn tác.')) return;
      api('/api/kb/doc/' + docId, { method: 'DELETE' }).then(r => r.json()).then(d => {
        if (d.success) { toast('🗑️ Đã xóa: ' + docTitle); refreshKB(); }
        else toast('Lỗi xóa tài liệu!', true);
      });
    }

    function searchKB() {
      const q = document.getElementById('kb-search').value.trim();
      if (!q) { refreshKB(); return; }
      api('/api/kb/search?q=' + encodeURIComponent(q)).then(r => r.json()).then(results => {
        const docs = results.map(r => ({ ...r.document, _score: r.relevanceScore, _snippet: r.snippet }));
        renderKBList(docs);
        toast('🔍 Tìm thấy ' + docs.length + ' kết quả');
      });
    }

    function importKB() {
      const data = {
        title: document.getElementById('kb-title').value,
        content: document.getElementById('kb-content').value,
        category: document.getElementById('kb-category').value,
        tags: document.getElementById('kb-tags').value.split(',').map(t => t.trim()).filter(Boolean)
      };
      if (!data.content) { toast('Vui lòng nhập nội dung!', true); return; }
      api('/api/kb/import', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()).then(d => {
        if (d.success) {
          toast('✅ Import thành công! ID: ' + d.documentId);
          document.getElementById('kb-title').value = '';
          document.getElementById('kb-content').value = '';
          document.getElementById('kb-tags').value = '';
          refreshKB();
        } else toast('❌ ' + d.error, true);
      });
    }

    // -- Import tab switch --
    function switchImportTab(tab) {
      document.getElementById('import-tab-text').style.display = tab === 'text' ? 'block' : 'none';
      document.getElementById('import-tab-file').style.display = tab === 'file' ? 'block' : 'none';
      document.getElementById('tab-text').style.background = tab === 'text' ? '#3b82f6' : '#334155';
      document.getElementById('tab-text').style.color = tab === 'text' ? '#fff' : '#94a3b8';
      document.getElementById('tab-file').style.background = tab === 'file' ? '#3b82f6' : '#334155';
      document.getElementById('tab-file').style.color = tab === 'file' ? '#fff' : '#94a3b8';
    }

    // -- File upload --
    let selectedFile = null;

    const fileIcons = {
      '.pdf': '📕', '.docx': '📘', '.doc': '📘',
      '.xlsx': '📗', '.xls': '📗', '.csv': '📊',
      '.txt': '📄', '.md': '📝', '.json': '📋'
    };

    function handleFileSelect(input) {
      if (input.files && input.files[0]) {
        showFilePreview(input.files[0]);
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      const dz = document.getElementById('drop-zone');
      dz.style.borderColor = '#475569';
      dz.style.background = 'transparent';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        showFilePreview(e.dataTransfer.files[0]);
      }
    }

    function showFilePreview(file) {
      selectedFile = file;
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const sizeKB = (file.size / 1024).toFixed(1);
      const sizeMB = (file.size / 1048576).toFixed(2);
      const sizeStr = file.size > 1048576 ? sizeMB + ' MB' : sizeKB + ' KB';

      document.getElementById('file-icon').textContent = fileIcons[ext] || '📄';
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-size').textContent = sizeStr + ' · ' + ext.toUpperCase().slice(1);
      document.getElementById('file-encoding-info').textContent = '⚡ Encoding sẽ được tự động detect và chuẩn hóa UTF-8';
      document.getElementById('file-preview').style.display = 'block';
      document.getElementById('upload-btn').disabled = false;

      // Auto-fill title from filename (without extension)
      if (!document.getElementById('kb-title').value) {
        const nameNoExt = file.name.replace(/\\.[^.]+$/, '');
        document.getElementById('kb-title').value = nameNoExt;
      }
    }

    function clearFile() {
      selectedFile = null;
      document.getElementById('file-preview').style.display = 'none';
      document.getElementById('upload-btn').disabled = true;
      document.getElementById('file-input').value = '';
      document.getElementById('upload-progress').textContent = '';
    }

    async function uploadFile() {
      if (!selectedFile) { toast('Chọn file trước!', true); return; }

      const progress = document.getElementById('upload-progress');
      const btn = document.getElementById('upload-btn');
      btn.disabled = true;
      progress.textContent = '⏳ Đang xử lý...';

      try {
        // Convert file to base64 (compatible with all browsers)
        const base64 = await fileToBase64(selectedFile);
        const data = {
          filename: selectedFile.name,
          base64: base64,
          category: document.getElementById('kb-category').value,
          tags: document.getElementById('kb-tags').value,
          title: document.getElementById('kb-title').value || undefined,
        };

        progress.textContent = '⏳ Đang parse và import...';

        const resp = await api('/api/kb/upload', { method: 'POST', body: JSON.stringify(data) });
        const result = await resp.json();

        if (result.success) {
          let msg = '✅ Upload thành công! ID: ' + result.documentId;
          if (result.metadata) {
            msg += ' (' + result.metadata.format.toUpperCase();
            if (result.metadata.pageCount) msg += ', ' + result.metadata.pageCount + ' trang';
            if (result.metadata.sheetNames) msg += ', sheets: ' + result.metadata.sheetNames.join(', ');
            msg += ', ' + result.metadata.extractedChars.toLocaleString() + ' ký tự)';
          }
          toast(msg);
          if (result.warnings && result.warnings.length > 0) {
            progress.textContent = '⚠️ ' + result.warnings.join(' | ');
            progress.style.color = '#eab308';
          } else {
            progress.textContent = '';
          }
          clearFile();
          document.getElementById('kb-title').value = '';
          document.getElementById('kb-tags').value = '';
          refreshKB();
        } else {
          toast('❌ ' + result.error, true);
          progress.textContent = '❌ Lỗi: ' + result.error;
          progress.style.color = '#ef4444';
        }
      } catch (err) {
        toast('❌ Upload lỗi: ' + err.message, true);
        progress.textContent = '';
      } finally {
        btn.disabled = false;
      }
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Remove data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // -- Reports --
    function loadReport(type) {
      const out = document.getElementById('report-output');
      out.textContent = 'Đang tải...';
      api('/api/reports/' + type).then(r => r.json()).then(d => {
        out.textContent = d.text || JSON.stringify(d, null, 2);
      });
    }

    // -- Auto refresh --
    setInterval(refreshAll, 30000);
  </script>
</body>
</html>`;
