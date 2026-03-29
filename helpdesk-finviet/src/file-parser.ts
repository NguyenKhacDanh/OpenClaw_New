/**
 * AI Helpdesk FinViet - File Parser Module
 *
 * Parse nhiều định dạng file sang plain text UTF-8:
 * - PDF (.pdf)       → pdf-parse
 * - Word (.docx)     → mammoth
 * - Excel (.xlsx)    → xlsx (SheetJS)
 * - CSV (.csv)       → native parser
 * - Text (.txt, .md) → đọc trực tiếp
 * - JSON (.json)     → parse + extract text
 *
 * Tất cả output đều được chuẩn hóa UTF-8 + clean encoding trước khi add vào KB.
 */

import { readFileSync } from "node:fs";
import { extname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedDocument = {
  text: string;           // Nội dung đã extract (plain text UTF-8)
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
    sheetNames?: string[];
    format: string;       // pdf, docx, xlsx, csv, txt, md, json
    originalSize: number; // bytes
    extractedChars: number;
  };
  warnings: string[];     // Cảnh báo nếu có lỗi nhỏ (không fatal)
};

export type ParseOptions = {
  /** Với Excel: sheet cụ thể (mặc định: tất cả) */
  sheetName?: string;
  /** Với Excel: dấu phân cách giữa các ô (mặc định: " | ") */
  cellSeparator?: string;
  /** Với Excel: có include header row không (mặc định: true) */
  includeHeaders?: boolean;
  /** Max ký tự extract (mặc định: 500,000 = ~500KB text) */
  maxChars?: number;
};

// ---------------------------------------------------------------------------
// Supported formats
// ---------------------------------------------------------------------------

export const SUPPORTED_FORMATS = new Map<string, string>([
  [".pdf", "PDF"],
  [".docx", "Word (DOCX)"],
  [".doc", "Word (DOC - hạn chế)"],
  [".xlsx", "Excel (XLSX)"],
  [".xls", "Excel (XLS - hạn chế)"],
  [".csv", "CSV"],
  [".txt", "Text"],
  [".md", "Markdown"],
  [".json", "JSON"],
]);

export function isSupportedFormat(ext: string): boolean {
  return SUPPORTED_FORMATS.has(ext.toLowerCase());
}

// ---------------------------------------------------------------------------
// Encoding utilities
// ---------------------------------------------------------------------------

/**
 * Chuẩn hóa text sang UTF-8, xử lý các vấn đề encoding phổ biến.
 *
 * - Fix Windows-1252 → UTF-8 (ký tự tiếng Việt bị lỗi)
 * - Loại bỏ BOM (Byte Order Mark)
 * - Normalize Unicode (NFC) cho tiếng Việt consistent
 * - Loại bỏ null bytes và control characters không hợp lệ
 * - Normalize line endings → \n
 */
export function normalizeEncoding(text: string): string {
  let result = text;

  // 1. Remove BOM (Byte Order Mark)
  if (result.charCodeAt(0) === 0xfeff) {
    result = result.slice(1);
  }

  // 2. Remove null bytes
  result = result.replace(/\0/g, "");

  // 3. Remove other problematic control characters (keep \n, \r, \t)
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 4. Normalize Unicode to NFC (tiếng Việt: tổ hợp → sẵn có)
  // Ví dụ: "ờ" (o + combining grave + combining horn) → "ờ" (single codepoint)
  result = result.normalize("NFC");

  // 5. Fix common Windows-1252 mojibake patterns for Vietnamese
  result = fixVietnameseMojibake(result);

  // 6. Normalize line endings
  result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 7. Trim excessive blank lines (3+ → 2)
  result = result.replace(/\n{3,}/g, "\n\n");

  // 8. Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

/**
 * Fix các pattern mojibake phổ biến khi file tiếng Việt bị decode sai encoding.
 * Ví dụ: "Äáº£i" → "Đại", "sá»­ dá»¥ng" → "sử dụng"
 */
function fixVietnameseMojibake(text: string): string {
  // Common Windows-1252 → UTF-8 double-encoding patterns
  const mojibakeMap: [RegExp, string][] = [
    [/Ã¡/g, "á"], [/Ã /g, "à"], [/áº£/g, "ả"], [/Ã£/g, "ã"], [/áº¡/g, "ạ"],
    [/Ã¢/g, "â"], [/áº¥/g, "ấ"], [/áº§/g, "ầ"], [/áº©/g, "ẩ"], [/áº«/g, "ẫ"], [/áº­/g, "ậ"],
    [/Äƒ/g, "ă"], [/áº¯/g, "ắ"], [/áº±/g, "ằ"], [/áº³/g, "ẳ"], [/áºµ/g, "ẵ"], [/áº·/g, "ặ"],
    [/Ã©/g, "é"], [/Ã¨/g, "è"], [/áº»/g, "ẻ"], [/áº½/g, "ẽ"], [/áº¹/g, "ẹ"],
    [/Ãª/g, "ê"], [/áº¿/g, "ế"], [/á»/g, "ề"], [/á»ƒ/g, "ể"], [/á»…/g, "ễ"], [/á»‡/g, "ệ"],
    [/Ã­/g, "í"], [/Ã¬/g, "ì"], [/á»‰/g, "ỉ"], [/Ä©/g, "ĩ"], [/á»‹/g, "ị"],
    [/Ã³/g, "ó"], [/Ã²/g, "ò"], [/á»/g, "ỏ"], [/Ãµ/g, "õ"], [/á»/g, "ọ"],
    [/Ã´/g, "ô"], [/á»'/g, "ố"], [/á»"/g, "ồ"], [/á»•/g, "ổ"], [/á»—/g, "ỗ"], [/á»™/g, "ộ"],
    [/Æ¡/g, "ơ"], [/á»›/g, "ớ"], [/á»/g, "ờ"], [/á»Ÿ/g, "ở"], [/á»¡/g, "ỡ"], [/á»£/g, "ợ"],
    [/Ãº/g, "ú"], [/Ã¹/g, "ù"], [/á»§/g, "ủ"], [/Å©/g, "ũ"], [/á»¥/g, "ụ"],
    [/Æ°/g, "ư"], [/á»©/g, "ứ"], [/á»«/g, "ừ"], [/á»­/g, "ử"], [/á»¯/g, "ữ"], [/á»±/g, "ự"],
    [/Ã½/g, "ý"], [/á»³/g, "ỳ"], [/á»·/g, "ỷ"], [/á»¹/g, "ỹ"], [/á»µ/g, "ỵ"],
    [/Ä'/g, "đ"], [/Ä/g, "Đ"],
  ];

  let result = text;
  for (const [pattern, replacement] of mojibakeMap) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Detect encoding của Buffer (heuristic).
 * Trả về encoding name hoặc 'utf-8' mặc định.
 */
function detectEncoding(buffer: Buffer): "utf-8" | "utf-16le" | "utf-16be" | "windows-1252" {
  // UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  // UTF-16 LE BOM
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf-16le";
  }
  // UTF-16 BE BOM
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return "utf-16be";
  }

  // Heuristic: check for Windows-1252 Vietnamese characters
  // Vietnamese dấu thường nằm trong range 0xC0-0xFF ở Windows-1252
  let highByteCount = 0;
  let invalidUtf8Count = 0;
  const sampleSize = Math.min(buffer.length, 4096);

  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] > 0x7f) {
      highByteCount++;
      // Check if it looks like valid UTF-8 multi-byte sequence
      if ((buffer[i] & 0xe0) === 0xc0) {
        // 2-byte UTF-8
        if (i + 1 < sampleSize && (buffer[i + 1] & 0xc0) === 0x80) {
          i++; // skip continuation byte
        } else {
          invalidUtf8Count++;
        }
      } else if ((buffer[i] & 0xf0) === 0xe0) {
        // 3-byte UTF-8
        if (
          i + 2 < sampleSize &&
          (buffer[i + 1] & 0xc0) === 0x80 &&
          (buffer[i + 2] & 0xc0) === 0x80
        ) {
          i += 2;
        } else {
          invalidUtf8Count++;
        }
      } else if ((buffer[i] & 0xf8) === 0xf0) {
        // 4-byte UTF-8
        if (
          i + 3 < sampleSize &&
          (buffer[i + 1] & 0xc0) === 0x80 &&
          (buffer[i + 2] & 0xc0) === 0x80 &&
          (buffer[i + 3] & 0xc0) === 0x80
        ) {
          i += 3;
        } else {
          invalidUtf8Count++;
        }
      } else {
        invalidUtf8Count++;
      }
    }
  }

  // If many invalid UTF-8 sequences → likely Windows-1252
  if (highByteCount > 0 && invalidUtf8Count / highByteCount > 0.3) {
    return "windows-1252";
  }

  return "utf-8";
}

/**
 * Đọc file buffer và decode về string UTF-8 đúng cách.
 */
export function decodeBuffer(buffer: Buffer): string {
  const encoding = detectEncoding(buffer);

  if (encoding === "utf-16le") {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (encoding === "utf-16be") {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  if (encoding === "windows-1252") {
    // Decode Windows-1252 properly
    return new TextDecoder("windows-1252").decode(buffer);
  }

  // UTF-8 (default)
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

// ---------------------------------------------------------------------------
// Parser: PDF
// ---------------------------------------------------------------------------

async function parsePDF(filePath: string, _options: ParseOptions): Promise<ParsedDocument> {
  const warnings: string[] = [];

  try {
    // Dynamic import để không bắt buộc install nếu chỉ dùng text
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = readFileSync(filePath);
    const data = await pdfParse(buffer);

    let text = data.text ?? "";
    text = normalizeEncoding(text);

    if (_options.maxChars && text.length > _options.maxChars) {
      text = text.slice(0, _options.maxChars);
      warnings.push(`Nội dung bị cắt ở ${_options.maxChars} ký tự (file quá dài).`);
    }

    if (!text.trim()) {
      warnings.push("PDF không chứa text có thể extract (có thể là scan/image PDF). Thử dùng OCR.");
    }

    return {
      text,
      metadata: {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        pageCount: data.numpages,
        format: "pdf",
        originalSize: buffer.length,
        extractedChars: text.length,
      },
      warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Check if pdf-parse is not installed
    if (msg.includes("Cannot find module") || msg.includes("ERR_MODULE_NOT_FOUND")) {
      return {
        text: "",
        metadata: { format: "pdf", originalSize: 0, extractedChars: 0 },
        warnings: [
          "⚠️ Cần cài thêm thư viện pdf-parse để đọc PDF:",
          "   npm install pdf-parse",
          `Lỗi gốc: ${msg}`,
        ],
      };
    }

    return {
      text: "",
      metadata: { format: "pdf", originalSize: 0, extractedChars: 0 },
      warnings: [`Lỗi parse PDF: ${msg}`],
    };
  }
}

// ---------------------------------------------------------------------------
// Parser: Word (.docx)
// ---------------------------------------------------------------------------

async function parseDocx(filePath: string, options: ParseOptions): Promise<ParsedDocument> {
  const warnings: string[] = [];

  try {
    const mammoth = await import("mammoth");
    const buffer = readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });

    let text = result.value ?? "";
    text = normalizeEncoding(text);

    if (options.maxChars && text.length > options.maxChars) {
      text = text.slice(0, options.maxChars);
      warnings.push(`Nội dung bị cắt ở ${options.maxChars} ký tự.`);
    }

    // mammoth warnings
    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        if (msg.type === "warning") {
          warnings.push(`Word warning: ${msg.message}`);
        }
      }
    }

    return {
      text,
      metadata: {
        format: "docx",
        originalSize: buffer.length,
        extractedChars: text.length,
      },
      warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("Cannot find module") || msg.includes("ERR_MODULE_NOT_FOUND")) {
      return {
        text: "",
        metadata: { format: "docx", originalSize: 0, extractedChars: 0 },
        warnings: [
          "⚠️ Cần cài thêm thư viện mammoth để đọc Word:",
          "   npm install mammoth",
          `Lỗi gốc: ${msg}`,
        ],
      };
    }

    return {
      text: "",
      metadata: { format: "docx", originalSize: 0, extractedChars: 0 },
      warnings: [`Lỗi parse Word: ${msg}`],
    };
  }
}

// ---------------------------------------------------------------------------
// Parser: Excel (.xlsx)
// ---------------------------------------------------------------------------

async function parseXlsx(filePath: string, options: ParseOptions): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const cellSep = options.cellSeparator ?? " | ";

  try {
    const XLSX = await import("xlsx");
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 }); // 65001 = UTF-8

    const sheetNames = workbook.SheetNames;
    const sheetsToProcess = options.sheetName
      ? sheetNames.filter((s) => s === options.sheetName)
      : sheetNames;

    if (sheetsToProcess.length === 0) {
      warnings.push(`Sheet "${options.sheetName}" không tìm thấy. Có: ${sheetNames.join(", ")}`);
    }

    const textParts: string[] = [];

    for (const sheetName of sheetsToProcess) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Header
      if (sheetNames.length > 1) {
        textParts.push(`\n## Sheet: ${sheetName}\n`);
      }

      // Convert to array of arrays
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (!row || row.length === 0) continue;

        // Skip empty rows
        const hasContent = row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
        if (!hasContent) continue;

        const cells = row.map((cell) => {
          if (cell === null || cell === undefined) return "";
          let val = String(cell);
          // Normalize encoding cho từng ô
          val = normalizeEncoding(val);
          return val;
        });

        // Format: row đầu = header (bold nếu includeHeaders), còn lại = data
        if (rowIdx === 0 && options.includeHeaders !== false) {
          textParts.push(cells.join(cellSep));
          textParts.push(cells.map(() => "---").join(cellSep)); // separator
        } else {
          textParts.push(cells.join(cellSep));
        }
      }
    }

    let text = textParts.join("\n");
    text = normalizeEncoding(text);

    if (options.maxChars && text.length > options.maxChars) {
      text = text.slice(0, options.maxChars);
      warnings.push(`Nội dung bị cắt ở ${options.maxChars} ký tự.`);
    }

    return {
      text,
      metadata: {
        sheetNames,
        format: "xlsx",
        originalSize: buffer.length,
        extractedChars: text.length,
      },
      warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("Cannot find module") || msg.includes("ERR_MODULE_NOT_FOUND")) {
      return {
        text: "",
        metadata: { format: "xlsx", originalSize: 0, extractedChars: 0 },
        warnings: [
          "⚠️ Cần cài thêm thư viện xlsx để đọc Excel:",
          "   npm install xlsx",
          `Lỗi gốc: ${msg}`,
        ],
      };
    }

    return {
      text: "",
      metadata: { format: "xlsx", originalSize: 0, extractedChars: 0 },
      warnings: [`Lỗi parse Excel: ${msg}`],
    };
  }
}

// ---------------------------------------------------------------------------
// Parser: CSV
// ---------------------------------------------------------------------------

function parseCSV(filePath: string, options: ParseOptions): ParsedDocument {
  const warnings: string[] = [];
  const cellSep = options.cellSeparator ?? " | ";

  const buffer = readFileSync(filePath);
  let raw = decodeBuffer(buffer);
  raw = normalizeEncoding(raw);

  const lines = raw.split("\n").filter((l) => l.trim());
  const textParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (i === 0 && options.includeHeaders !== false) {
      textParts.push(cells.join(cellSep));
      textParts.push(cells.map(() => "---").join(cellSep));
    } else {
      textParts.push(cells.join(cellSep));
    }
  }

  let text = textParts.join("\n");

  if (options.maxChars && text.length > options.maxChars) {
    text = text.slice(0, options.maxChars);
    warnings.push(`Nội dung bị cắt ở ${options.maxChars} ký tự.`);
  }

  return {
    text,
    metadata: {
      format: "csv",
      originalSize: buffer.length,
      extractedChars: text.length,
    },
    warnings,
  };
}

/** Parse 1 dòng CSV đơn giản (handle quotes) */
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());

  return cells;
}

// ---------------------------------------------------------------------------
// Parser: Plain text / Markdown
// ---------------------------------------------------------------------------

function parseText(filePath: string, options: ParseOptions, format: string): ParsedDocument {
  const warnings: string[] = [];

  const buffer = readFileSync(filePath);
  let text = decodeBuffer(buffer);
  text = normalizeEncoding(text);

  if (options.maxChars && text.length > options.maxChars) {
    text = text.slice(0, options.maxChars);
    warnings.push(`Nội dung bị cắt ở ${options.maxChars} ký tự.`);
  }

  return {
    text,
    metadata: {
      format,
      originalSize: buffer.length,
      extractedChars: text.length,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Parser: JSON
// ---------------------------------------------------------------------------

function parseJSON(filePath: string, options: ParseOptions): ParsedDocument {
  const warnings: string[] = [];

  const buffer = readFileSync(filePath);
  let raw = decodeBuffer(buffer);
  raw = normalizeEncoding(raw);

  try {
    const data = JSON.parse(raw);
    let text = extractTextFromJSON(data);
    text = normalizeEncoding(text);

    if (options.maxChars && text.length > options.maxChars) {
      text = text.slice(0, options.maxChars);
      warnings.push(`Nội dung bị cắt ở ${options.maxChars} ký tự.`);
    }

    return {
      text,
      metadata: {
        format: "json",
        originalSize: buffer.length,
        extractedChars: text.length,
      },
      warnings,
    };
  } catch {
    warnings.push("JSON không hợp lệ, import dưới dạng raw text.");
    return {
      text: raw,
      metadata: {
        format: "json",
        originalSize: buffer.length,
        extractedChars: raw.length,
      },
      warnings,
    };
  }
}

/** Đệ quy extract tất cả text value từ JSON object */
function extractTextFromJSON(obj: unknown, depth = 0): string {
  if (depth > 10) return ""; // Prevent infinite recursion

  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (obj === null || obj === undefined) return "";

  if (Array.isArray(obj)) {
    return obj.map((item) => extractTextFromJSON(item, depth + 1)).filter(Boolean).join("\n");
  }

  if (typeof obj === "object") {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const valText = extractTextFromJSON(val, depth + 1);
      if (valText) {
        parts.push(`${key}: ${valText}`);
      }
    }
    return parts.join("\n");
  }

  return "";
}

// ---------------------------------------------------------------------------
// Main parser function
// ---------------------------------------------------------------------------

/**
 * Parse bất kỳ file hỗ trợ nào sang plain text UTF-8.
 *
 * @param filePath Đường dẫn tuyệt đối hoặc tương đối tới file
 * @param options  Tùy chọn parse
 * @returns ParsedDocument với text đã chuẩn hóa UTF-8
 */
export async function parseFile(filePath: string, options: ParseOptions = {}): Promise<ParsedDocument> {
  const ext = extname(filePath).toLowerCase();
  const maxChars = options.maxChars ?? 500_000;
  const opts = { ...options, maxChars };

  switch (ext) {
    case ".pdf":
      return parsePDF(filePath, opts);

    case ".docx":
    case ".doc":
      return parseDocx(filePath, opts);

    case ".xlsx":
    case ".xls":
      return parseXlsx(filePath, opts);

    case ".csv":
      return parseCSV(filePath, opts);

    case ".json":
      return parseJSON(filePath, opts);

    case ".txt":
      return parseText(filePath, opts, "txt");

    case ".md":
      return parseText(filePath, opts, "md");

    default:
      return {
        text: "",
        metadata: { format: ext, originalSize: 0, extractedChars: 0 },
        warnings: [
          `Định dạng "${ext}" không được hỗ trợ.`,
          `Hỗ trợ: ${[...SUPPORTED_FORMATS.entries()].map(([k, v]) => `${k} (${v})`).join(", ")}`,
        ],
      };
  }
}

/**
 * Parse raw buffer (upload từ dashboard) sang plain text UTF-8.
 * Ghi tạm ra file rồi parse.
 */
export async function parseBuffer(
  buffer: Buffer,
  originalFilename: string,
  options: ParseOptions = {},
): Promise<ParsedDocument> {
  const { writeFileSync: writeTmp, mkdirSync: mkTmp, unlinkSync: rmTmp } = await import("node:fs");
  const { join: joinTmp, extname: extTmp } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const ext = extTmp(originalFilename).toLowerCase();
  const tempDir = joinTmp(tmpdir(), "finviet-kb-parser");
  mkTmp(tempDir, { recursive: true });

  const tempPath = joinTmp(tempDir, `upload-${Date.now()}${ext}`);

  try {
    writeTmp(tempPath, buffer);
    const result = await parseFile(tempPath, options);
    return result;
  } finally {
    try {
      rmTmp(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Parse raw text content (paste từ dashboard) với chuẩn hóa encoding.
 * Dùng khi user paste trực tiếp hoặc sửa trong kb-index.json.
 */
export function parseRawText(text: string, title?: string): ParsedDocument {
  const normalized = normalizeEncoding(text);

  return {
    text: normalized,
    metadata: {
      title,
      format: "text",
      originalSize: Buffer.byteLength(text, "utf-8"),
      extractedChars: normalized.length,
    },
    warnings: normalized.length !== text.length ? ["Encoding đã được chuẩn hóa UTF-8."] : [],
  };
}
