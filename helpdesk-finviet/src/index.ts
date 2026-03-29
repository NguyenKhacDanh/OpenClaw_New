/**
 * AI Helpdesk FinViet - Main Entry Point
 *
 * Khởi chạy toàn bộ hệ thống:
 * 1. Load config & environment
 * 2. Khởi tạo Knowledge Base, Ticket System, Retry Engine
 * 3. Khởi chạy Admin Dashboard
 * 4. Kết nối OpenClaw gateway
 */

import { AdminDashboard } from "./admin-dashboard.js";

// ---------------------------------------------------------------------------
// Load environment
// ---------------------------------------------------------------------------

function loadEnv(): {
  port: number;
  password: string;
  dataDir: string;
  groqKey: string;
  githubToken: string;
} {
  return {
    port: parseInt(process.env.FINVIET_HELPDESK_PORT ?? "3847", 10),
    password: process.env.FINVIET_HELPDESK_ADMIN_PASSWORD ?? "admin123",
    dataDir: process.env.FINVIET_KB_DATA_DIR ?? "./data",
    groqKey: process.env.GROQ_API_KEY ?? "",
    githubToken: process.env.GITHUB_TOKEN ?? "",
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const env = loadEnv();

  console.log("=".repeat(60));
  console.log("🤖 AI HELPDESK FINVIET");
  console.log("=".repeat(60));
  console.log(`📁 Data dir:  ${env.dataDir}`);
  console.log(`🌐 Dashboard: http://localhost:${env.port}`);
  console.log(`🔑 Groq:      ${env.groqKey ? "✅ Configured" : "❌ Missing"}`);
  console.log(`🔑 GitHub:    ${env.githubToken ? "✅ Configured" : "❌ Missing"}`);
  console.log("=".repeat(60));

  // Khởi chạy Admin Dashboard (bao gồm KB, Tickets, Retry)
  const dashboard = new AdminDashboard({
    port: env.port,
    password: env.password,
    dataDir: env.dataDir,
  });

  dashboard.start();

  console.log("");
  console.log("📋 Hướng dẫn nhanh:");
  console.log("  1. Mở browser → http://localhost:" + env.port);
  console.log("  2. Đăng nhập với mật khẩu Admin");
  console.log("  3. Import tài liệu IT vào Knowledge Base");
  console.log("  4. Chạy: openclaw whatsapp setup  (để quét QR WhatsApp)");
  console.log("  5. Chạy: openclaw zalouser setup   (để quét QR Zalo)");
  console.log("  6. Chạy: openclaw gateway run      (để bắt đầu nhận tin nhắn)");
  console.log("");

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Đang tắt AI Helpdesk FinViet...");
    dashboard.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    dashboard.stop();
    process.exit(0);
  });
}

main();
