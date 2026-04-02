/**
 * NKD Custom gateway handlers — Knowledge Base, Agent Profile, Reports.
 *
 * All data lives under `helpdesk-finviet/data/` relative to the repo root.
 * Operates directly on JSON files; no external HTTP server needed.
 */

import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatForLog } from "../ws-log.js";
import type { GatewayRequestHandlers } from "./types.js";

// ---------------------------------------------------------------------------
// Data paths — resolve relative to process.cwd() (repo root)
// ---------------------------------------------------------------------------

function dataDir(): string {
  const d = join(process.cwd(), "helpdesk-finviet", "data");
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function kbDir(): string {
  const d = join(dataDir(), "knowledge-base");
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function kbIndexPath(): string {
  return join(kbDir(), "kb-index.json");
}

function agentProfilePath(): string {
  return join(dataDir(), "agent-profile.json");
}

function agentsMdPath(): string {
  return join(process.cwd(), "helpdesk-finviet", "AGENTS.md");
}

// Path to the REAL workspace AGENTS.md that the bot reads at runtime
function workspaceAgentsMdPath(): string {
  // Check dev workspace first, fallback to production
  const devPath = join(homedir(), ".openclaw-dev", "workspace", "AGENTS.md");
  const prodPath = join(homedir(), ".openclaw", "workspace", "AGENTS.md");
  // Prefer the one that exists; default to production
  if (existsSync(devPath)) return devPath;
  return prodPath;
}

/**
 * Sync all KB documents into the workspace AGENTS.md that the bot reads.
 * The AGENTS.md will contain:
 *   1. Rules/instructions header from helpdesk-finviet/AGENTS.md (if it has rules)
 *   2. All KB documents concatenated as structured sections
 *
 * This is called after every KB mutation (import, upload, delete).
 */
function syncKbToWorkspace(): void {
  try {
    const idx = loadKbIndex();
    const profile = loadProfile();
    const toneDesc: Record<string, string> = {
      professional: "Chuyên nghiệp, lịch sự, đi thẳng vào vấn đề.",
      friendly: "Thân thiện, gần gũi nhưng vẫn rõ ràng.",
      casual: "Thoải mái, dễ hiểu, như đồng nghiệp hỗ trợ nhau.",
    };

    // Build the workspace AGENTS.md
    const parts: string[] = [];

    // Header — agent instructions
    parts.push(`# AGENTS

Bạn là **${profile.name}** — bot hỗ trợ Helpdesk IT của công ty **${profile.company}**.

## QUY TẮC TRẢ LỜI
- LUÔN ưu tiên trả lời dựa trên kiến thức bên dưới (Knowledge Base).
- Nếu câu hỏi nằm trong KB: trả lời chính xác theo KB.
- Nếu câu hỏi KHÔNG có trong KB: hướng dẫn liên hệ IT Support.
- ${toneDesc[profile.tone] ?? toneDesc.professional}
- Greeting: "${profile.greeting}"
`);

    // KB documents as knowledge sections
    if (idx.documents.length > 0) {
      parts.push(`## Kiến thức xử lý sự cố IT\n`);
      for (let i = 0; i < idx.documents.length; i++) {
        const doc = idx.documents[i];
        // Skip documents that are clearly raw binary (PDF not extracted)
        if (doc.content.startsWith("%PDF")) continue;
        parts.push(`---\n`);
        parts.push(`### ${i + 1}. ${doc.title}\n`);
        if (doc.tags.length > 0) {
          parts.push(`Tags: ${doc.tags.join(", ")}\n`);
        }
        parts.push(`${doc.content}\n`);
      }
    }

    // Contact info
    parts.push(`---

## Thông tin liên hệ IT Support

- **Email:** it.support@finviet.com.vn
- **Service Portal:** https://hotro.finviet.com.vn
- **Tự reset/unlock:** https://user.finviet.com.vn (cần wifi Finviet_Corp)
`);

    const finalContent = parts.join("\n");

    // Write to workspace AGENTS.md
    const wPath = workspaceAgentsMdPath();
    const wDir = join(wPath, "..");
    if (!existsSync(wDir)) mkdirSync(wDir, { recursive: true });
    writeFileSync(wPath, finalContent, "utf-8");

    // Also write to helpdesk-finviet/AGENTS.md for reference
    writeFileSync(agentsMdPath(), finalContent, "utf-8");

    console.log(
      `[nkd] ✓ Synced ${idx.documents.length} KB docs → workspace AGENTS.md (${finalContent.length} chars)`,
    );
  } catch (err) {
    console.error("[nkd] ✗ Failed to sync KB to workspace:", err);
  }
}

// ---------------------------------------------------------------------------
// KB index helpers
// ---------------------------------------------------------------------------

type KBDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  importedAt: string;
  updatedAt: string;
  hash: string;
  charCount: number;
};

type KBIndex = {
  version: number;
  documents: KBDocument[];
  lastUpdated: string;
  totalDocuments: number;
  totalChars: number;
};

function loadKbIndex(): KBIndex {
  const p = kbIndexPath();
  if (existsSync(p)) {
    return JSON.parse(readFileSync(p, "utf-8")) as KBIndex;
  }
  return {
    version: 1,
    documents: [],
    lastUpdated: new Date().toISOString(),
    totalDocuments: 0,
    totalChars: 0,
  };
}

function saveKbIndex(idx: KBIndex): void {
  idx.lastUpdated = new Date().toISOString();
  idx.totalDocuments = idx.documents.length;
  idx.totalChars = idx.documents.reduce((s, d) => s + d.charCount, 0);
  writeFileSync(kbIndexPath(), JSON.stringify(idx, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Agent profile helpers
// ---------------------------------------------------------------------------

type AgentProfile = {
  name: string;
  company: string;
  greeting: string;
  language: string;
  tone: string;
  scope: string;
  ticketPrefix: string;
};

function loadProfile(): AgentProfile {
  const p = agentProfilePath();
  if (existsSync(p)) {
    return JSON.parse(readFileSync(p, "utf-8")) as AgentProfile;
  }
  return {
    name: "AI Helpdesk FinViet",
    company: "FinViet",
    greeting:
      "Xin chào! Tôi là AI Helpdesk FinViet 🤖. Tôi có thể hỗ trợ bạn vấn đề IT gì hôm nay?",
    language: "vi",
    tone: "professional",
    scope: "IT Helpdesk: mạng, máy tính, phần mềm, tài khoản, bảo mật, email, Office 365",
    ticketPrefix: "FV",
  };
}

function saveProfile(profile: AgentProfile): void {
  writeFileSync(agentProfilePath(), JSON.stringify(profile, null, 2), "utf-8");
  // Sync to workspace — regenerates AGENTS.md with KB + profile
  syncKbToWorkspace();
}

// Legacy function kept for compatibility — now delegates to syncKbToWorkspace
function regenerateAgentsMd(_p: AgentProfile): void {
  syncKbToWorkspace();
}

// ---------------------------------------------------------------------------
// Search helpers (Vietnamese stop words, tokenizer, relevance)
// ---------------------------------------------------------------------------

const STOP_WORDS_VI = new Set([
  "và",
  "hoặc",
  "của",
  "cho",
  "với",
  "trong",
  "ngoài",
  "là",
  "có",
  "không",
  "được",
  "để",
  "từ",
  "đến",
  "này",
  "đó",
  "các",
  "một",
  "những",
  "thì",
  "nhưng",
  "nếu",
  "khi",
  "như",
  "đã",
  "sẽ",
  "đang",
  "rất",
  "cũng",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS_VI.has(w));
}

function searchDocs(
  docs: KBDocument[],
  query: string,
  category?: string,
  maxResults = 10,
): { document: KBDocument; score: number; snippet: string }[] {
  const keywords = tokenize(query);
  if (keywords.length === 0) return [];

  const results: { document: KBDocument; score: number; snippet: string }[] = [];

  for (const doc of docs) {
    if (category && doc.category !== category) continue;
    let score = 0;
    for (const kw of keywords) {
      if (doc.title.toLowerCase().includes(kw)) score += 10;
      else if (doc.tags.some((t) => t.toLowerCase().includes(kw))) score += 7;
      else if (doc.content.toLowerCase().includes(kw)) score += 3;
    }
    if (score > 0) {
      const pos = doc.content.toLowerCase().indexOf(keywords[0]);
      const start = Math.max(0, pos - 80);
      const snippet = doc.content.slice(start, start + 300).trim();
      results.push({ document: doc, score, snippet });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Ticket stats (read-only from tickets dir)
// ---------------------------------------------------------------------------

function loadTicketStats(): {
  total: number;
  open: number;
  closed: number;
  byChannel: Record<string, number>;
} {
  const ticketsDir = join(dataDir(), "tickets");
  const storePath = join(ticketsDir, "tickets.json");
  if (!existsSync(storePath)) {
    return { total: 0, open: 0, closed: 0, byChannel: {} };
  }
  try {
    const store = JSON.parse(readFileSync(storePath, "utf-8"));
    const tickets: any[] = store.tickets ?? [];
    const open = tickets.filter((t) => t.status === "open" || t.status === "in-progress").length;
    const byChannel: Record<string, number> = {};
    for (const t of tickets) {
      byChannel[t.channel ?? "unknown"] = (byChannel[t.channel ?? "unknown"] ?? 0) + 1;
    }
    return { total: tickets.length, open, closed: tickets.length - open, byChannel };
  } catch {
    return { total: 0, open: 0, closed: 0, byChannel: {} };
  }
}

// ---------------------------------------------------------------------------
// Session management helpers
// ---------------------------------------------------------------------------

function sessionsDir(): string {
  return join(homedir(), ".openclaw", "agents", "main", "sessions");
}

type SessionInfo = {
  id: string;
  sizeKB: number;
  lines: number;
  lastModified: string;
  ageMinutes: number;
};

function listSessions(): SessionInfo[] {
  const dir = sessionsDir();
  if (!existsSync(dir)) {
    return [];
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const now = Date.now();
  return files.map((f) => {
    const fullPath = join(dir, f);
    const stat = statSync(fullPath);
    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim()).length;
    return {
      id: f.replace(".jsonl", ""),
      sizeKB: Math.round((stat.size / 1024) * 10) / 10,
      lines,
      lastModified: stat.mtime.toISOString(),
      ageMinutes: Math.round((now - stat.mtime.getTime()) / 60000),
    };
  });
}

function clearAllSessions(): { deletedCount: number; freedKB: number } {
  const dir = sessionsDir();
  if (!existsSync(dir)) {
    return { deletedCount: 0, freedKB: 0 };
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl") || f.endsWith(".lock"));
  let freedBytes = 0;
  let count = 0;
  for (const f of files) {
    const fullPath = join(dir, f);
    try {
      const stat = statSync(fullPath);
      freedBytes += stat.size;
      unlinkSync(fullPath);
      count++;
    } catch {
      /* ignore locked files */
    }
  }
  console.log(`[nkd] ✓ Cleared ${count} session files (${Math.round(freedBytes / 1024)} KB freed)`);
  return { deletedCount: count, freedKB: Math.round(freedBytes / 1024) };
}

function clearSession(sessionId: string): boolean {
  const dir = sessionsDir();
  const filePath = join(dir, `${sessionId}.jsonl`);
  const lockPath = join(dir, `${sessionId}.jsonl.lock`);
  let deleted = false;
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    deleted = true;
  }
  if (existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
  if (deleted) {
    console.log(`[nkd] ✓ Cleared session: ${sessionId}`);
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Auth profiles (API key management) helpers
// ---------------------------------------------------------------------------

function authProfilesPath(): string {
  // Standard location: ~/.openclaw/agents/main/agent/auth-profiles.json
  const p = join(homedir(), ".openclaw", "agents", "main", "agent", "auth-profiles.json");
  return p;
}

type AuthProfile = {
  provider: string;
  profile: string;
  apiKey: string;
};

function loadAuthProfiles(): AuthProfile[] {
  const p = authProfilesPath();
  if (!existsSync(p)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, { apiKey?: string }>;
    const result: AuthProfile[] = [];
    for (const [key, value] of Object.entries(raw)) {
      const [provider, profile] = key.split(":");
      if (provider && profile && value?.apiKey) {
        // Mask the key for display: show first 8 and last 4 chars
        result.push({ provider, profile, apiKey: value.apiKey });
      }
    }
    return result;
  } catch {
    return [];
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return "***";
  }
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function saveAuthProfile(provider: string, profile: string, apiKey: string): void {
  const p = authProfilesPath();
  let raw: Record<string, { apiKey: string }> = {};
  if (existsSync(p)) {
    try {
      raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, { apiKey: string }>;
    } catch {
      /* start fresh */
    }
  }
  const key = `${provider}:${profile}`;
  raw[key] = { apiKey };
  // Ensure parent dir exists
  const dir = join(p, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(p, JSON.stringify(raw, null, 2), "utf-8");
  console.log(`[nkd] ✓ Saved API key for ${key}`);
}

function deleteAuthProfile(provider: string, profile: string): boolean {
  const p = authProfilesPath();
  if (!existsSync(p)) {
    return false;
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, { apiKey: string }>;
    const key = `${provider}:${profile}`;
    if (!(key in raw)) {
      return false;
    }
    delete raw[key];
    writeFileSync(p, JSON.stringify(raw, null, 2), "utf-8");
    console.log(`[nkd] ✓ Deleted API key for ${key}`);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Gateway RPC Handlers
// ---------------------------------------------------------------------------

export const nkdCustomHandlers: GatewayRequestHandlers = {
  // --- KB Stats ---
  "nkd.kb.stats": async ({ respond }) => {
    try {
      const idx = loadKbIndex();
      const byCategory: Record<string, number> = {};
      for (const d of idx.documents) {
        byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
      }
      respond(
        true,
        {
          totalDocuments: idx.totalDocuments,
          totalChars: idx.totalChars,
          byCategory,
          lastUpdated: idx.lastUpdated,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB List ---
  "nkd.kb.list": async ({ respond }) => {
    try {
      const idx = loadKbIndex();
      const docs = idx.documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        tags: d.tags,
        source: d.source,
        importedAt: d.importedAt,
        charCount: d.charCount,
      }));
      respond(true, docs, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Search ---
  "nkd.kb.search": async ({ params, respond }) => {
    try {
      const q = String((params as { q?: string }).q ?? "");
      const category = (params as { category?: string }).category;
      const idx = loadKbIndex();
      const results = searchDocs(idx.documents, q, category);
      respond(true, results, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Import Text ---
  "nkd.kb.importText": async ({ params, respond }) => {
    try {
      const { title, content, category, tags } = params as {
        title?: string;
        content?: string;
        category?: string;
        tags?: string[];
      };
      if (!content?.trim()) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "content is required"));
        return;
      }
      const idx = loadKbIndex();
      const hash = createHash("sha256").update(content).digest("hex");
      const existing = idx.documents.find((d) => d.hash === hash);
      if (existing) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "Tài liệu đã tồn tại (trùng nội dung)"),
        );
        return;
      }
      const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const doc: KBDocument = {
        id,
        title: title?.trim() || content.split("\n")[0]?.slice(0, 100) || "Untitled",
        content,
        category: category || "general",
        tags: tags ?? [],
        source: "manual-input",
        importedAt: now,
        updatedAt: now,
        hash,
        charCount: content.length,
      };
      idx.documents.push(doc);
      saveKbIndex(idx);
      syncKbToWorkspace();
      respond(true, { success: true, documentId: id }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Upload (base64 file) ---
  "nkd.kb.upload": async ({ params, respond }) => {
    try {
      const { filename, base64, category, tags, title } = params as {
        filename?: string;
        base64?: string;
        category?: string;
        tags?: string;
        title?: string;
      };
      if (!filename || !base64) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "filename and base64 are required"),
        );
        return;
      }

      // Decode base64 → text (for simple text-based files)
      const buf = Buffer.from(base64, "base64");
      const ext = (filename.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
      let text = "";

      if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
        text = buf.toString("utf-8");
      } else if (ext === ".pdf") {
        // Extract text from PDF using pdf-parse
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const result = await pdfParse(buf);
          text = (result.text || "").trim();
          if (!text) {
            respond(
              false,
              undefined,
              errorShape(
                ErrorCodes.INVALID_REQUEST,
                `PDF "${filename}" không chứa text (có thể là PDF scan/image). Hãy chuyển sang text trước khi import.`,
              ),
            );
            return;
          }
        } catch (pdfErr: any) {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              `Không thể đọc PDF "${filename}": ${pdfErr?.message || "pdf-parse error"}. Hãy copy text thủ công và dùng Import Text.`,
            ),
          );
          return;
        }
      } else if ([".docx", ".doc"].includes(ext)) {
        // Extract text from Word documents using mammoth
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer: buf });
          text = (result.value || "").trim();
          if (!text) {
            respond(
              false,
              undefined,
              errorShape(
                ErrorCodes.INVALID_REQUEST,
                `File Word "${filename}" không chứa text. Hãy copy text thủ công và dùng "Import Text".`,
              ),
            );
            return;
          }
        } catch (docErr: any) {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              `Không thể đọc file Word "${filename}": ${docErr?.message || "mammoth error"}. Hãy copy text thủ công và dùng "Import Text".`,
            ),
          );
          return;
        }
      } else if ([".xlsx", ".xls"].includes(ext)) {
        // Extract text from Excel spreadsheets using xlsx (SheetJS)
        try {
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(buf, { type: "buffer" });
          const sheetTexts: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
              continue;
            }
            const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", RS: "\n" });
            if (csv.trim()) {
              sheetTexts.push(`=== Sheet: ${sheetName} ===\n${csv.trim()}`);
            }
          }
          text = sheetTexts.join("\n\n");
          if (!text.trim()) {
            respond(
              false,
              undefined,
              errorShape(
                ErrorCodes.INVALID_REQUEST,
                `File Excel "${filename}" không chứa dữ liệu. Hãy copy text thủ công và dùng "Import Text".`,
              ),
            );
            return;
          }
        } catch (xlsErr: any) {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              `Không thể đọc file Excel "${filename}": ${xlsErr?.message || "xlsx error"}. Hãy copy text thủ công và dùng "Import Text".`,
            ),
          );
          return;
        }
      } else {
        // For other formats, try reading as UTF-8
        text = buf.toString("utf-8");
      }

      // Validate: reject if content looks like binary/PDF raw data
      if (text.startsWith("%PDF") || /[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 500))) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `File "${filename}" chứa dữ liệu binary, không phải text. Hãy copy text thủ công và dùng "Import Text".`,
          ),
        );
        return;
      }

      if (!text.trim()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Không thể extract text từ file "${filename}"`),
        );
        return;
      }

      const idx = loadKbIndex();
      const hash = createHash("sha256").update(text).digest("hex");
      const existing = idx.documents.find((d) => d.hash === hash);
      if (existing) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "Tài liệu đã tồn tại (trùng nội dung)"),
        );
        return;
      }

      const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const doc: KBDocument = {
        id,
        title: title?.trim() || text.split("\n")[0]?.slice(0, 100) || filename,
        content: text,
        category: category || "general",
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        source: filename,
        importedAt: now,
        updatedAt: now,
        hash,
        charCount: text.length,
      };
      idx.documents.push(doc);
      saveKbIndex(idx);
      syncKbToWorkspace();
      respond(
        true,
        {
          success: true,
          documentId: id,
          metadata: { format: ext.replace(".", ""), extractedChars: text.length },
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Delete ---
  "nkd.kb.delete": async ({ params, respond }) => {
    try {
      const docId = String((params as { id?: string }).id ?? "");
      if (!docId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }
      const idx = loadKbIndex();
      const i = idx.documents.findIndex((d) => d.id === docId);
      if (i === -1) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "Document not found"));
        return;
      }
      idx.documents.splice(i, 1);
      saveKbIndex(idx);
      syncKbToWorkspace();
      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Agent Profile Get ---
  "nkd.agent.profile": async ({ respond }) => {
    try {
      respond(true, loadProfile(), undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Agent Profile Save ---
  "nkd.agent.profileSave": async ({ params, respond }) => {
    try {
      const current = loadProfile();
      const updates = params as Partial<AgentProfile>;
      const merged = { ...current, ...updates };
      saveProfile(merged);
      respond(true, { success: true, profile: merged }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Agent Prompt (AGENTS.md content) ---
  "nkd.agent.prompt": async ({ respond }) => {
    try {
      const p = agentsMdPath();
      const content = existsSync(p) ? readFileSync(p, "utf-8") : "";
      respond(true, { content }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Agent Prompt Save (edit AGENTS.md directly) ---
  "nkd.agent.promptSave": async ({ params, respond }) => {
    try {
      const content = String((params as { content?: string }).content ?? "");
      if (!content.trim()) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "content is required"));
        return;
      }
      // Write to both helpdesk AGENTS.md and workspace AGENTS.md
      writeFileSync(agentsMdPath(), content, "utf-8");
      const wPath = workspaceAgentsMdPath();
      const wDir = join(wPath, "..");
      if (!existsSync(wDir)) mkdirSync(wDir, { recursive: true });
      writeFileSync(wPath, content, "utf-8");
      console.log(`[nkd] ✓ Saved prompt to workspace AGENTS.md (${content.length} chars)`);
      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Raw Data (full JSON for inspection) ---
  "nkd.kb.rawData": async ({ respond }) => {
    try {
      const idx = loadKbIndex();
      // Also gather agent profile and AGENTS.md
      const profile = loadProfile();
      const agentsMd = existsSync(agentsMdPath()) ? readFileSync(agentsMdPath(), "utf-8") : "";
      const ticketStats = loadTicketStats();
      respond(
        true,
        {
          kbIndex: idx,
          agentProfile: profile,
          agentsMd,
          ticketStats,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- KB Raw Data Save (edit JSON directly) ---
  "nkd.kb.rawDataSave": async ({ params, respond }) => {
    try {
      const data = params as {
        kbIndex?: KBIndex;
        agentProfile?: AgentProfile;
        agentsMd?: string;
      };
      // Save KB index if provided
      if (data.kbIndex) {
        const idx = data.kbIndex;
        idx.lastUpdated = new Date().toISOString();
        idx.totalDocuments = idx.documents?.length ?? 0;
        idx.totalChars = (idx.documents ?? []).reduce(
          (s, d) => s + (d.charCount ?? d.content?.length ?? 0),
          0,
        );
        writeFileSync(kbIndexPath(), JSON.stringify(idx, null, 2), "utf-8");
        console.log(`[nkd] ✓ Saved KB index: ${idx.totalDocuments} docs, ${idx.totalChars} chars`);
      }
      // Save agent profile if provided
      if (data.agentProfile) {
        writeFileSync(agentProfilePath(), JSON.stringify(data.agentProfile, null, 2), "utf-8");
        console.log("[nkd] ✓ Saved agent profile");
      }
      // Save AGENTS.md if provided
      if (typeof data.agentsMd === "string") {
        writeFileSync(agentsMdPath(), data.agentsMd, "utf-8");
        // Also write to workspace
        const wPath = workspaceAgentsMdPath();
        const wDir = join(wPath, "..");
        if (!existsSync(wDir)) mkdirSync(wDir, { recursive: true });
        writeFileSync(wPath, data.agentsMd, "utf-8");
        console.log(`[nkd] ✓ Saved AGENTS.md (${data.agentsMd.length} chars)`);
      }
      // Sync KB to workspace after any save
      syncKbToWorkspace();
      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Ticket Stats ---
  "nkd.reports.tickets": async ({ respond }) => {
    try {
      respond(true, loadTicketStats(), undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Sync KB to Workspace (manual trigger) ---
  "nkd.kb.syncWorkspace": async ({ respond }) => {
    try {
      syncKbToWorkspace();
      const wPath = workspaceAgentsMdPath();
      const content = existsSync(wPath) ? readFileSync(wPath, "utf-8") : "";
      respond(
        true,
        {
          success: true,
          workspacePath: wPath,
          chars: content.length,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Fix PDF raw documents: remove binary content from KB ---
  "nkd.kb.fixPdfRaw": async ({ respond }) => {
    try {
      const idx = loadKbIndex();
      const removed: string[] = [];
      idx.documents = idx.documents.filter((doc) => {
        if (doc.content.startsWith("%PDF")) {
          removed.push(doc.title);
          return false;
        }
        return true;
      });
      if (removed.length > 0) {
        saveKbIndex(idx);
        syncKbToWorkspace();
      }
      respond(
        true,
        {
          success: true,
          removedCount: removed.length,
          removedTitles: removed,
          remainingDocs: idx.documents.length,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Restart Gateway (apply config changes) ---
  "nkd.gateway.restart": async ({ respond }) => {
    try {
      const result = scheduleGatewaySigusr1Restart({
        delayMs: 1000,
        reason: "nkd.gateway.restart (UI button)",
      });
      console.log("[nkd] Gateway restart scheduled:", result);
      respond(
        true,
        {
          success: true,
          message: "Gateway restart đã được lên lịch. Gateway sẽ khởi động lại trong vài giây.",
          pid: result.pid,
          delayMs: result.delayMs,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- API Key List (masked) ---
  "nkd.apikey.list": async ({ respond }) => {
    try {
      const profiles = loadAuthProfiles();
      const masked = profiles.map((p) => ({
        provider: p.provider,
        profile: p.profile,
        maskedKey: maskApiKey(p.apiKey),
      }));
      respond(true, { profiles: masked, path: authProfilesPath() }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- API Key Update (set/change key for a provider) ---
  "nkd.apikey.set": async ({ params, respond }) => {
    try {
      const { provider, profile, apiKey } = params as {
        provider?: string;
        profile?: string;
        apiKey?: string;
      };
      if (!provider || !apiKey) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "provider and apiKey are required"),
        );
        return;
      }
      saveAuthProfile(provider, profile || "default", apiKey);
      respond(
        true,
        {
          success: true,
          message: `Đã cập nhật API key cho ${provider}:${profile || "default"}`,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- API Key Delete ---
  "nkd.apikey.delete": async ({ params, respond }) => {
    try {
      const { provider, profile } = params as {
        provider?: string;
        profile?: string;
      };
      if (!provider) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "provider is required"));
        return;
      }
      const deleted = deleteAuthProfile(provider, profile || "default");
      if (!deleted) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `Không tìm thấy API key cho ${provider}:${profile || "default"}`,
          ),
        );
        return;
      }
      respond(
        true,
        {
          success: true,
          message: `Đã xóa API key cho ${provider}:${profile || "default"}`,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Session List ---
  "nkd.session.list": async ({ respond }) => {
    try {
      const sessions = listSessions();
      respond(true, { sessions, sessionsDir: sessionsDir() }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Session Clear All (reset all conversations) ---
  "nkd.session.clearAll": async ({ respond }) => {
    try {
      const result = clearAllSessions();
      respond(
        true,
        {
          success: true,
          message: `Đã xóa ${result.deletedCount} session files (giải phóng ${result.freedKB} KB). Restart Gateway để áp dụng.`,
          ...result,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  // --- Session Clear One ---
  "nkd.session.clear": async ({ params, respond }) => {
    try {
      const sessionId = String((params as { id?: string }).id ?? "");
      if (!sessionId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }
      const deleted = clearSession(sessionId);
      if (!deleted) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Session ${sessionId} không tồn tại`),
        );
        return;
      }
      respond(
        true,
        { success: true, message: `Đã xóa session ${sessionId}` },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
