/**
 * AI Helpdesk FinViet - Knowledge Base Module
 *
 * Module quản lý tài liệu IT nội bộ. Hỗ trợ:
 * - Import file .txt, .md, .pdf, .docx, .xlsx, .csv, .json
 * - Parse PDF (pdf-parse), Word (mammoth), Excel (xlsx/SheetJS)
 * - Xử lý encoding UTF-8, fix Vietnamese mojibake
 * - Tìm kiếm full-text + keyword matching
 * - Phân loại theo category
 * - Export/backup dữ liệu
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { createHash } from "node:crypto";
import { parseFile, parseBuffer, parseRawText, normalizeEncoding, isSupportedFormat, SUPPORTED_FORMATS, type ParseOptions } from "./file-parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KBCategory =
  | "network"       // Mạng, WiFi, VPN
  | "hardware"      // Phần cứng, máy tính, in ấn
  | "software"      // Phần mềm, cài đặt
  | "account"       // Tài khoản, mật khẩu
  | "email"         // Email, Office 365, Google Workspace
  | "security"      // Bảo mật, virus, firewall
  | "internal-app"  // Phần mềm nội bộ FinViet
  | "general";      // Chung

export type KBDocument = {
  id: string;
  title: string;
  content: string;
  category: KBCategory;
  tags: string[];
  source: string;        // Tên file gốc
  importedAt: string;    // ISO timestamp
  updatedAt: string;
  hash: string;          // SHA-256 nội dung (chống trùng)
  charCount: number;
};

export type KBIndex = {
  version: number;
  documents: KBDocument[];
  lastUpdated: string;
  totalDocuments: number;
  totalChars: number;
};

export type KBSearchResult = {
  document: KBDocument;
  relevanceScore: number;
  matchedKeywords: string[];
  snippet: string;        // Đoạn trích dẫn liên quan
};

export type KBImportResult = {
  success: boolean;
  documentId?: string;
  error?: string;
  duplicateOf?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KB_VERSION = 1;
const KB_INDEX_FILENAME = "kb-index.json";
const MAX_SNIPPET_LENGTH = 500;

// Vietnamese stop words (bỏ qua khi tìm kiếm)
const STOP_WORDS_VI = new Set([
  "và", "hoặc", "của", "cho", "với", "trong", "ngoài", "là", "có", "không",
  "được", "để", "từ", "đến", "này", "đó", "các", "một", "những", "thì",
  "nhưng", "nếu", "khi", "như", "đã", "sẽ", "đang", "rất", "cũng",
  "vì", "do", "bởi", "tại", "về", "theo", "qua", "lại", "ra", "vào",
]);

// ---------------------------------------------------------------------------
// Knowledge Base class
// ---------------------------------------------------------------------------

export class KnowledgeBase {
  private dataDir: string;
  private index: KBIndex;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    this.index = this.loadIndex();
  }

  // -------------------------------------------------------------------------
  // Index management
  // -------------------------------------------------------------------------

  private getIndexPath(): string {
    return join(this.dataDir, KB_INDEX_FILENAME);
  }

  private loadIndex(): KBIndex {
    const indexPath = this.getIndexPath();
    if (existsSync(indexPath)) {
      const raw = readFileSync(indexPath, "utf-8");
      return JSON.parse(raw) as KBIndex;
    }
    return {
      version: KB_VERSION,
      documents: [],
      lastUpdated: new Date().toISOString(),
      totalDocuments: 0,
      totalChars: 0,
    };
  }

  private saveIndex(): void {
    const indexPath = this.getIndexPath();
    this.index.lastUpdated = new Date().toISOString();
    this.index.totalDocuments = this.index.documents.length;
    this.index.totalChars = this.index.documents.reduce((sum, doc) => sum + doc.charCount, 0);
    writeFileSync(indexPath, JSON.stringify(this.index, null, 2), "utf-8");
  }

  // -------------------------------------------------------------------------
  // Import documents
  // -------------------------------------------------------------------------

  importFile(filePath: string, category: KBCategory, tags: string[] = []): KBImportResult {
    const ext = extname(filePath).toLowerCase();

    if (!isSupportedFormat(ext)) {
      const supported = [...SUPPORTED_FORMATS.entries()].map(([k, v]) => `${k} (${v})`).join(", ");
      return { success: false, error: `Định dạng file không hỗ trợ: ${ext}. Hỗ trợ: ${supported}` };
    }

    if (!existsSync(filePath)) {
      return { success: false, error: `File không tồn tại: ${filePath}` };
    }

    // Với các file text-based đơn giản, đọc trực tiếp (sync)
    // Với PDF/Word/Excel, dùng importFileAsync
    if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
      const raw = readFileSync(filePath, "utf-8");
      const content = normalizeEncoding(raw);
      return this.addDocument(content, basename(filePath), category, tags);
    }

    // Với PDF/Word/Excel, trả về instruction để dùng async method
    return {
      success: false,
      error: `File ${ext} cần dùng importFileAsync(). Gọi: await kb.importFileAsync("${filePath}", "${category}")`,
    };
  }

  /**
   * Import file bất kỳ format (PDF, Word, Excel, text...) - async version.
   * Đây là method chính nên dùng cho tất cả file imports.
   */
  async importFileAsync(
    filePath: string,
    category: KBCategory,
    tags: string[] = [],
    parseOptions?: ParseOptions,
  ): Promise<KBImportResult> {
    const ext = extname(filePath).toLowerCase();

    if (!isSupportedFormat(ext)) {
      const supported = [...SUPPORTED_FORMATS.entries()].map(([k, v]) => `${k} (${v})`).join(", ");
      return { success: false, error: `Định dạng file không hỗ trợ: ${ext}. Hỗ trợ: ${supported}` };
    }

    if (!existsSync(filePath)) {
      return { success: false, error: `File không tồn tại: ${filePath}` };
    }

    const parsed = await parseFile(filePath, parseOptions);

    if (parsed.warnings.length > 0) {
      // Check for fatal warnings (empty content)
      if (!parsed.text.trim()) {
        return {
          success: false,
          error: `Không thể extract text từ file. ${parsed.warnings.join("; ")}`,
        };
      }
    }

    const result = this.addDocument(parsed.text, basename(filePath), category, tags);

    // Attach metadata to result
    if (result.success && parsed.warnings.length > 0) {
      (result as any).warnings = parsed.warnings;
    }
    if (result.success && parsed.metadata) {
      (result as any).metadata = parsed.metadata;
    }

    return result;
  }

  /**
   * Import từ Buffer (file upload qua dashboard).
   * Parse buffer → text UTF-8 → add vào KB.
   */
  async importBuffer(
    buffer: Buffer,
    originalFilename: string,
    category: KBCategory,
    tags: string[] = [],
    parseOptions?: ParseOptions,
  ): Promise<KBImportResult> {
    const parsed = await parseBuffer(buffer, originalFilename, parseOptions);

    if (!parsed.text.trim()) {
      return {
        success: false,
        error: `Không thể extract text từ file "${originalFilename}". ${parsed.warnings.join("; ")}`,
      };
    }

    const result = this.addDocument(parsed.text, originalFilename, category, tags);

    if (result.success && parsed.warnings.length > 0) {
      (result as any).warnings = parsed.warnings;
    }
    if (result.success && parsed.metadata) {
      (result as any).metadata = parsed.metadata;
    }

    return result;
  }

  /**
   * Internal: thêm document vào index (đã có text UTF-8).
   */
  private addDocument(content: string, source: string, category: KBCategory, tags: string[]): KBImportResult {
    const hash = createHash("sha256").update(content).digest("hex");

    const existing = this.index.documents.find((doc) => doc.hash === hash);
    if (existing) {
      return { success: false, error: "Tài liệu đã tồn tại (nội dung trùng)", duplicateOf: existing.id };
    }

    const title = this.extractTitle(content, source);
    const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const doc: KBDocument = {
      id,
      title,
      content,
      category,
      tags,
      source,
      importedAt: now,
      updatedAt: now,
      hash,
      charCount: content.length,
    };

    this.index.documents.push(doc);
    this.saveIndex();

    return { success: true, documentId: id };
  }

  importDirectory(dirPath: string, category: KBCategory, tags: string[] = []): KBImportResult[] {
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      return [{ success: false, error: `Thư mục không tồn tại: ${dirPath}` }];
    }

    const results: KBImportResult[] = [];
    const files = readdirSync(dirPath);

    for (const file of files) {
      const fullPath = join(dirPath, file);
      if (statSync(fullPath).isFile()) {
        results.push(this.importFile(fullPath, category, tags));
      }
    }

    return results;
  }

  /**
   * Import tất cả file trong thư mục (async - hỗ trợ PDF/Word/Excel).
   */
  async importDirectoryAsync(
    dirPath: string,
    category: KBCategory,
    tags: string[] = [],
    parseOptions?: ParseOptions,
  ): Promise<KBImportResult[]> {
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      return [{ success: false, error: `Thư mục không tồn tại: ${dirPath}` }];
    }

    const results: KBImportResult[] = [];
    const files = readdirSync(dirPath);

    for (const file of files) {
      const fullPath = join(dirPath, file);
      if (statSync(fullPath).isFile() && isSupportedFormat(extname(file).toLowerCase())) {
        const result = await this.importFileAsync(fullPath, category, tags, parseOptions);
        results.push(result);
      }
    }

    return results;
  }

  importText(title: string, content: string, category: KBCategory, tags: string[] = []): KBImportResult {
    // Chuẩn hóa encoding UTF-8 trước khi lưu
    const normalizedContent = normalizeEncoding(content);
    const normalizedTitle = normalizeEncoding(title);

    const hash = createHash("sha256").update(normalizedContent).digest("hex");

    const existing = this.index.documents.find((doc) => doc.hash === hash);
    if (existing) {
      return { success: false, error: "Tài liệu đã tồn tại", duplicateOf: existing.id };
    }

    const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const doc: KBDocument = {
      id,
      title: normalizedTitle,
      content: normalizedContent,
      category,
      tags,
      source: "manual-input",
      importedAt: now,
      updatedAt: now,
      hash,
      charCount: normalizedContent.length,
    };

    this.index.documents.push(doc);
    this.saveIndex();

    return { success: true, documentId: id };
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  search(query: string, options?: { category?: KBCategory; maxResults?: number }): KBSearchResult[] {
    const maxResults = options?.maxResults ?? 5;
    const keywords = this.tokenize(query);

    if (keywords.length === 0) return [];

    const results: KBSearchResult[] = [];

    for (const doc of this.index.documents) {
      // Lọc theo category nếu có
      if (options?.category && doc.category !== options.category) continue;

      const { score, matchedKeywords } = this.calculateRelevance(keywords, doc);

      if (score > 0) {
        results.push({
          document: doc,
          relevanceScore: score,
          matchedKeywords,
          snippet: this.extractSnippet(doc.content, matchedKeywords),
        });
      }
    }

    // Sắp xếp theo điểm giảm dần
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, maxResults);
  }

  searchByCategory(category: KBCategory): KBDocument[] {
    return this.index.documents.filter((doc) => doc.category === category);
  }

  getDocument(id: string): KBDocument | undefined {
    return this.index.documents.find((doc) => doc.id === id);
  }

  // -------------------------------------------------------------------------
  // Document management
  // -------------------------------------------------------------------------

  updateDocument(id: string, updates: Partial<Pick<KBDocument, "title" | "content" | "category" | "tags">>): boolean {
    const doc = this.index.documents.find((d) => d.id === id);
    if (!doc) return false;

    if (updates.title) doc.title = updates.title;
    if (updates.content) {
      doc.content = updates.content;
      doc.hash = createHash("sha256").update(updates.content).digest("hex");
      doc.charCount = updates.content.length;
    }
    if (updates.category) doc.category = updates.category;
    if (updates.tags) doc.tags = updates.tags;

    doc.updatedAt = new Date().toISOString();
    this.saveIndex();

    return true;
  }

  deleteDocument(id: string): boolean {
    const idx = this.index.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;

    this.index.documents.splice(idx, 1);
    this.saveIndex();

    return true;
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  getStats(): {
    totalDocuments: number;
    totalChars: number;
    byCategory: Record<string, number>;
    lastUpdated: string;
  } {
    const byCategory: Record<string, number> = {};
    for (const doc of this.index.documents) {
      byCategory[doc.category] = (byCategory[doc.category] ?? 0) + 1;
    }

    return {
      totalDocuments: this.index.totalDocuments,
      totalChars: this.index.totalChars,
      byCategory,
      lastUpdated: this.index.lastUpdated,
    };
  }

  listDocuments(): Pick<KBDocument, "id" | "title" | "category" | "tags" | "source" | "importedAt" | "charCount">[] {
    return this.index.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      tags: doc.tags,
      source: doc.source,
      importedAt: doc.importedAt,
      charCount: doc.charCount,
    }));
  }

  // -------------------------------------------------------------------------
  // Export / Backup
  // -------------------------------------------------------------------------

  exportAll(): string {
    return JSON.stringify(this.index, null, 2);
  }

  exportToFile(outputPath: string): void {
    writeFileSync(outputPath, this.exportAll(), "utf-8");
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private extractTitle(content: string, filePath: string): string {
    // Thử lấy heading markdown
    const mdHeading = content.match(/^#\s+(.+)$/m);
    if (mdHeading) return mdHeading[1].trim();

    // Thử lấy dòng đầu tiên
    const firstLine = content.split("\n").find((line) => line.trim().length > 0);
    if (firstLine && firstLine.trim().length <= 100) return firstLine.trim();

    // Dùng tên file
    return basename(filePath, extname(filePath));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 2 && !STOP_WORDS_VI.has(word));
  }

  private calculateRelevance(queryTokens: string[], doc: KBDocument): { score: number; matchedKeywords: string[] } {
    const docText = `${doc.title} ${doc.content} ${doc.tags.join(" ")}`.toLowerCase();
    const docTokens = this.tokenize(docText);
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const qToken of queryTokens) {
      // Exact match trong title → điểm cao
      if (doc.title.toLowerCase().includes(qToken)) {
        score += 10;
        matchedKeywords.push(qToken);
      }
      // Exact match trong tags
      else if (doc.tags.some((tag) => tag.toLowerCase().includes(qToken))) {
        score += 7;
        matchedKeywords.push(qToken);
      }
      // Match trong content
      else if (docTokens.includes(qToken)) {
        score += 3;
        matchedKeywords.push(qToken);
      }
      // Partial match (substring)
      else {
        const partial = docTokens.find((dt) => dt.includes(qToken) || qToken.includes(dt));
        if (partial) {
          score += 1;
          matchedKeywords.push(qToken);
        }
      }
    }

    // Bonus: nhiều keyword match cùng lúc
    const matchRatio = matchedKeywords.length / queryTokens.length;
    score *= 1 + matchRatio;

    // Bonus: category match (nếu query chứa keyword category)
    const categoryKeywords: Record<string, string[]> = {
      network: ["mạng", "wifi", "vpn", "internet", "lan", "ip", "dns"],
      hardware: ["máy tính", "laptop", "màn hình", "chuột", "bàn phím", "in", "printer", "máy in"],
      software: ["phần mềm", "cài đặt", "update", "install", "app", "ứng dụng"],
      account: ["tài khoản", "mật khẩu", "password", "đăng nhập", "login", "reset"],
      email: ["email", "outlook", "gmail", "office", "365"],
      security: ["bảo mật", "virus", "malware", "firewall", "antivirus"],
      "internal-app": ["finviet", "nội bộ", "hệ thống"],
    };

    for (const [cat, kws] of Object.entries(categoryKeywords)) {
      if (doc.category === cat && queryTokens.some((qt) => kws.some((kw) => kw.includes(qt) || qt.includes(kw)))) {
        score *= 1.5;
        break;
      }
    }

    return { score, matchedKeywords: [...new Set(matchedKeywords)] };
  }

  private extractSnippet(content: string, keywords: string[]): string {
    if (keywords.length === 0) return content.slice(0, MAX_SNIPPET_LENGTH);

    // Tìm vị trí keyword đầu tiên
    const lowerContent = content.toLowerCase();
    let bestPos = -1;

    for (const kw of keywords) {
      const pos = lowerContent.indexOf(kw.toLowerCase());
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
        bestPos = pos;
      }
    }

    if (bestPos === -1) return content.slice(0, MAX_SNIPPET_LENGTH);

    const start = Math.max(0, bestPos - 100);
    const end = Math.min(content.length, bestPos + MAX_SNIPPET_LENGTH - 100);
    let snippet = content.slice(start, end).trim();

    if (start > 0) snippet = `...${snippet}`;
    if (end < content.length) snippet = `${snippet}...`;

    return snippet;
  }
}
