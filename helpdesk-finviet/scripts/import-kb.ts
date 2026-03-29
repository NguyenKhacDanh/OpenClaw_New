/**
 * Script: Import tài liệu vào Knowledge Base từ file/thư mục
 *
 * Hỗ trợ: PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Markdown, JSON
 * Tự động detect encoding và chuẩn hóa UTF-8.
 *
 * Sử dụng:
 *   npx tsx scripts/import-kb.ts <file_hoặc_thư_mục> [category]
 *
 * Ví dụ:
 *   npx tsx scripts/import-kb.ts ./docs/vpn-guide.pdf network
 *   npx tsx scripts/import-kb.ts ./docs/it-handbook.docx general
 *   npx tsx scripts/import-kb.ts ./docs/inventory.xlsx hardware
 *   npx tsx scripts/import-kb.ts ./docs/ general
 */

import { KnowledgeBase, type KBCategory } from "../src/knowledge-base.js";
import { SUPPORTED_FORMATS } from "../src/file-parser.js";

const VALID_CATEGORIES: KBCategory[] = [
  "network", "hardware", "software", "account",
  "email", "security", "internal-app", "general",
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("📥 Import tài liệu vào Knowledge Base");
    console.log("");
    console.log("Cách dùng:");
    console.log("  npx tsx scripts/import-kb.ts <đường_dẫn_file_hoặc_thư_mục> [category]");
    console.log("");
    console.log("Định dạng hỗ trợ:");
    for (const [ext, label] of SUPPORTED_FORMATS) {
      console.log(`  ${ext.padEnd(8)} ${label}`);
    }
    console.log("");
    console.log("Categories hợp lệ:");
    VALID_CATEGORIES.forEach((c) => console.log(`  - ${c}`));
    console.log("");
    console.log("Ví dụ:");
    console.log("  npx tsx scripts/import-kb.ts ./docs/vpn-guide.pdf network");
    console.log("  npx tsx scripts/import-kb.ts ./docs/it-handbook.docx general");
    console.log("  npx tsx scripts/import-kb.ts ./docs/inventory.xlsx hardware");
    console.log("  npx tsx scripts/import-kb.ts ./docs/ general");
    console.log("");
    console.log("⚡ Encoding tự động detect và chuẩn hóa UTF-8.");
    console.log("   Tiếng Việt mojibake (Windows-1252) được auto-fix.");
    process.exit(1);
  }

  const inputPath = args[0];
  const category = (args[1] ?? "general") as KBCategory;

  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`❌ Category không hợp lệ: ${category}`);
    console.error(`   Hợp lệ: ${VALID_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  const dataDir = process.env.FINVIET_KB_DATA_DIR ?? "./data/knowledge-base";
  const kb = new KnowledgeBase(dataDir);

  console.log(`📂 Data dir: ${dataDir}`);
  console.log(`📁 Input:    ${inputPath}`);
  console.log(`🏷️  Category: ${category}`);
  console.log("");

  const { statSync } = require("node:fs");
  const stat = statSync(inputPath);

  if (stat.isDirectory()) {
    console.log("📁 Import toàn bộ thư mục (async - hỗ trợ PDF/Word/Excel)...");
    console.log("");
    const results = await kb.importDirectoryAsync(inputPath, category);
    let successCount = 0;
    let failCount = 0;

    for (const r of results) {
      if (r.success) {
        successCount++;
        console.log(`  ✅ ${r.documentId}`);
        if ((r as any).metadata) {
          const m = (r as any).metadata;
          console.log(`     Format: ${m.format} | ${m.extractedChars} ký tự`);
        }
        if ((r as any).warnings?.length > 0) {
          (r as any).warnings.forEach((w: string) => console.log(`     ⚠️ ${w}`));
        }
      } else {
        failCount++;
        console.log(`  ❌ ${r.error}${r.duplicateOf ? ` (trùng: ${r.duplicateOf})` : ""}`);
      }
    }

    console.log("");
    console.log(`📊 Kết quả: ${successCount} thành công, ${failCount} thất bại`);
  } else {
    console.log("📄 Import file (async - hỗ trợ PDF/Word/Excel)...");
    const result = await kb.importFileAsync(inputPath, category);
    if (result.success) {
      console.log(`✅ Import thành công! ID: ${result.documentId}`);
      if ((result as any).metadata) {
        const m = (result as any).metadata;
        console.log(`   Format: ${m.format} | ${m.extractedChars} ký tự`);
        if (m.pageCount) console.log(`   Số trang: ${m.pageCount}`);
        if (m.sheetNames) console.log(`   Sheets: ${m.sheetNames.join(", ")}`);
      }
      if ((result as any).warnings?.length > 0) {
        console.log("   ⚠️ Cảnh báo:");
        (result as any).warnings.forEach((w: string) => console.log(`      ${w}`));
      }
    } else {
      console.log(`❌ Lỗi: ${result.error}`);
      if (result.duplicateOf) console.log(`   Trùng với: ${result.duplicateOf}`);
    }
  }

  // Hiện thống kê
  const stats = kb.getStats();
  console.log("");
  console.log(`📚 Knowledge Base: ${stats.totalDocuments} tài liệu, ${stats.totalChars.toLocaleString()} ký tự`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
