/**
 * AI Helpdesk FinViet - Ticket System
 *
 * Quản lý ticket IT helpdesk:
 * - Tạo, cập nhật, đóng ticket
 * - Phân loại mức độ ưu tiên
 * - Theo dõi SLA
 * - Report thống kê
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TicketPriority = "critical" | "high" | "medium" | "low";

export type TicketStatus =
  | "open"          // Mới tạo
  | "in-progress"   // Đang xử lý
  | "waiting"       // Chờ phản hồi người dùng
  | "escalated"     // Đã chuyển IT Team
  | "resolved"      // Đã giải quyết
  | "closed";       // Đã đóng

export type TicketChannel = "whatsapp" | "zalo" | "zalouser" | "web" | "manual";

export type Ticket = {
  id: string;              // FV-2026-NNNN
  title: string;
  description: string;
  reporter: string;        // Tên/SĐT người báo
  channel: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  assignee?: string;
  resolution?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  slaDeadline?: string;    // Thời hạn SLA
  history: TicketHistoryEntry[];
  retryCount: number;      // Số lần retry (khi AI lỗi)
  missedAt?: string;       // Thời điểm miss (nếu có)
};

export type TicketHistoryEntry = {
  timestamp: string;
  action: string;
  by: string;              // "ai" | "admin" | tên người
  note?: string;
};

export type TicketStore = {
  version: number;
  tickets: Ticket[];
  counter: number;         // Auto-increment cho ID
  lastUpdated: string;
};

// SLA (Service Level Agreement) - thời gian phản hồi tối đa (phút)
export const SLA_TARGETS: Record<TicketPriority, number> = {
  critical: 30,   // 30 phút
  high: 120,      // 2 giờ
  medium: 480,    // 8 giờ (1 ngày làm việc)
  low: 1440,      // 24 giờ
};

const TICKET_STORE_FILENAME = "tickets.json";

// ---------------------------------------------------------------------------
// TicketManager class
// ---------------------------------------------------------------------------

export class TicketManager {
  private dataDir: string;
  private store: TicketStore;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    this.store = this.loadStore();
  }

  // -------------------------------------------------------------------------
  // Store management
  // -------------------------------------------------------------------------

  private getStorePath(): string {
    return join(this.dataDir, TICKET_STORE_FILENAME);
  }

  private loadStore(): TicketStore {
    const storePath = this.getStorePath();
    if (existsSync(storePath)) {
      return JSON.parse(readFileSync(storePath, "utf-8")) as TicketStore;
    }
    return {
      version: 1,
      tickets: [],
      counter: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private saveStore(): void {
    this.store.lastUpdated = new Date().toISOString();
    writeFileSync(this.getStorePath(), JSON.stringify(this.store, null, 2), "utf-8");
  }

  private generateId(): string {
    this.store.counter++;
    const year = new Date().getFullYear();
    const num = String(this.store.counter).padStart(4, "0");
    return `FV-${year}-${num}`;
  }

  // -------------------------------------------------------------------------
  // Ticket CRUD
  // -------------------------------------------------------------------------

  create(input: {
    title: string;
    description: string;
    reporter: string;
    channel: TicketChannel;
    priority: TicketPriority;
    category: string;
    tags?: string[];
  }): Ticket {
    const now = new Date();
    const slaMinutes = SLA_TARGETS[input.priority];
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60_000).toISOString();

    const ticket: Ticket = {
      id: this.generateId(),
      title: input.title,
      description: input.description,
      reporter: input.reporter,
      channel: input.channel,
      priority: input.priority,
      status: "open",
      category: input.category,
      assignee: undefined,
      resolution: undefined,
      tags: input.tags ?? [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      slaDeadline,
      history: [
        {
          timestamp: now.toISOString(),
          action: "created",
          by: "ai",
          note: `Ticket tạo tự động qua ${input.channel}`,
        },
      ],
      retryCount: 0,
    };

    this.store.tickets.push(ticket);
    this.saveStore();

    return ticket;
  }

  update(ticketId: string, updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignee?: string;
    resolution?: string;
    note?: string;
    by?: string;
  }): Ticket | undefined {
    const ticket = this.store.tickets.find((t) => t.id === ticketId);
    if (!ticket) return undefined;

    const now = new Date().toISOString();
    const changes: string[] = [];

    if (updates.status && updates.status !== ticket.status) {
      changes.push(`status: ${ticket.status} → ${updates.status}`);
      ticket.status = updates.status;
      if (updates.status === "closed" || updates.status === "resolved") {
        ticket.closedAt = now;
      }
    }
    if (updates.priority && updates.priority !== ticket.priority) {
      changes.push(`priority: ${ticket.priority} → ${updates.priority}`);
      ticket.priority = updates.priority;
    }
    if (updates.assignee) {
      changes.push(`assignee: ${updates.assignee}`);
      ticket.assignee = updates.assignee;
    }
    if (updates.resolution) {
      ticket.resolution = updates.resolution;
      changes.push("resolution added");
    }

    ticket.updatedAt = now;
    ticket.history.push({
      timestamp: now,
      action: changes.join("; ") || "updated",
      by: updates.by ?? "ai",
      note: updates.note,
    });

    this.saveStore();
    return ticket;
  }

  escalate(ticketId: string, reason: string): Ticket | undefined {
    return this.update(ticketId, {
      status: "escalated",
      note: `🔺 ESCALATION: ${reason}`,
      by: "ai",
    });
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  getById(ticketId: string): Ticket | undefined {
    return this.store.tickets.find((t) => t.id === ticketId);
  }

  getOpen(): Ticket[] {
    return this.store.tickets.filter((t) => t.status === "open" || t.status === "in-progress");
  }

  getByReporter(reporter: string): Ticket[] {
    return this.store.tickets.filter(
      (t) => t.reporter.toLowerCase().includes(reporter.toLowerCase()),
    );
  }

  getByChannel(channel: TicketChannel): Ticket[] {
    return this.store.tickets.filter((t) => t.channel === channel);
  }

  getOverdueSLA(): Ticket[] {
    const now = Date.now();
    return this.store.tickets.filter(
      (t) =>
        t.slaDeadline &&
        new Date(t.slaDeadline).getTime() < now &&
        t.status !== "resolved" &&
        t.status !== "closed",
    );
  }

  // -------------------------------------------------------------------------
  // Retry / Miss tracking
  // -------------------------------------------------------------------------

  recordMiss(ticketId: string, reason: string): void {
    const ticket = this.store.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    ticket.missedAt = new Date().toISOString();
    ticket.history.push({
      timestamp: ticket.missedAt,
      action: "missed",
      by: "system",
      note: reason,
    });
    this.saveStore();
  }

  recordRetry(ticketId: string): void {
    const ticket = this.store.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    ticket.retryCount++;
    ticket.history.push({
      timestamp: new Date().toISOString(),
      action: "retry",
      by: "system",
      note: `Retry lần ${ticket.retryCount}`,
    });
    this.saveStore();
  }

  // -------------------------------------------------------------------------
  // Reports / Stats
  // -------------------------------------------------------------------------

  getReport(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byChannel: Record<string, number>;
    overdueSLA: number;
    avgResolutionTimeMinutes: number;
    totalRetries: number;
    totalMisses: number;
  } {
    const tickets = this.store.tickets;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    let resolvedTimes: number[] = [];
    let totalRetries = 0;
    let totalMisses = 0;

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      byChannel[t.channel] = (byChannel[t.channel] ?? 0) + 1;
      totalRetries += t.retryCount;
      if (t.missedAt) totalMisses++;

      if (t.closedAt) {
        const resolvedMs = new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime();
        resolvedTimes.push(resolvedMs / 60_000);
      }
    }

    const avgResolutionTimeMinutes =
      resolvedTimes.length > 0
        ? resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length
        : 0;

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byChannel,
      overdueSLA: this.getOverdueSLA().length,
      avgResolutionTimeMinutes: Math.round(avgResolutionTimeMinutes),
      totalRetries,
      totalMisses,
    };
  }

  formatReportText(): string {
    const r = this.getReport();
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    return `
📊 **BÁO CÁO IT HELPDESK FINVIET**
⏰ ${now}

📋 **Tổng ticket:** ${r.total}

📌 **Theo trạng thái:**
${Object.entries(r.byStatus).map(([k, v]) => `  - ${this.formatStatus(k)}: ${v}`).join("\n")}

🎯 **Theo mức độ:**
${Object.entries(r.byPriority).map(([k, v]) => `  - ${this.formatPriority(k)}: ${v}`).join("\n")}

📱 **Theo kênh:**
${Object.entries(r.byChannel).map(([k, v]) => `  - ${k}: ${v}`).join("\n")}

⚠️ **Quá hạn SLA:** ${r.overdueSLA}
🔄 **Tổng retry (AI lỗi):** ${r.totalRetries}
❌ **Tổng miss:** ${r.totalMisses}
⏱️ **Thời gian xử lý TB:** ${r.avgResolutionTimeMinutes} phút
`.trim();
  }

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      open: "⬜ Mới",
      "in-progress": "🔵 Đang xử lý",
      waiting: "🟡 Chờ phản hồi",
      escalated: "🔺 Chuyển IT Team",
      resolved: "✅ Đã giải quyết",
      closed: "⬛ Đã đóng",
    };
    return map[status] ?? status;
  }

  private formatPriority(priority: string): string {
    const map: Record<string, string> = {
      critical: "🔴 Khẩn cấp",
      high: "🟠 Cao",
      medium: "🟡 Trung bình",
      low: "🟢 Thấp",
    };
    return map[priority] ?? priority;
  }
}
