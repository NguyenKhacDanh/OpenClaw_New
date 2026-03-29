/**
 * Script: Tạo báo cáo tổng hợp
 *
 * Sử dụng:
 *   npx tsx scripts/generate-report.ts
 */

import { TicketManager } from "../src/ticket-system.js";
import { RetryEngine } from "../src/retry-engine.js";

function main(): void {
  const dataDir = process.env.FINVIET_KB_DATA_DIR ?? "./data";

  const tickets = new TicketManager(`${dataDir}/tickets`);
  const retry = new RetryEngine();

  console.log(tickets.formatReportText());
  console.log("");
  console.log(retry.formatReportText());
}

main();
