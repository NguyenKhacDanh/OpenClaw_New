/**
 * AI Helpdesk FinViet - Retry & Recovery Engine
 *
 * Xử lý tự động khi:
 * - AI provider lỗi (Groq down, rate limit, timeout)
 * - Tin nhắn miss (không nhận được, gửi thất bại)
 * - Kết nối WhatsApp/Zalo bị đứt
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RetryableError = {
  code: string;
  message: string;
  provider?: string;
  channel?: string;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  resolved: boolean;
  resolvedAt?: string;
};

export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
};

export type FailoverConfig = {
  primaryProvider: string;
  fallbackProviders: string[];
  currentProvider: string;
  failoverAt?: string;
  failbackDelayMs: number;   // Thời gian chờ trước khi thử lại primary
};

export type MissedMessage = {
  id: string;
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  retryAt?: string;
  retryCount: number;
  status: "pending" | "retrying" | "delivered" | "failed";
  error?: string;
};

export type RetryReport = {
  totalErrors: number;
  resolvedErrors: number;
  pendingErrors: number;
  totalMissedMessages: number;
  deliveredRetries: number;
  failedRetries: number;
  currentProvider: string;
  failoverActive: boolean;
  errors: RetryableError[];
  missedMessages: MissedMessage[];
};

// ---------------------------------------------------------------------------
// Default policies
// ---------------------------------------------------------------------------

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  jitter: true,
};

export const PROVIDER_RETRY_POLICIES: Record<string, RetryPolicy> = {
  groq: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 15_000,
    backoffMultiplier: 2,
    jitter: true,
  },
  github: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 20_000,
    backoffMultiplier: 2,
    jitter: true,
  },
  openai: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
    backoffMultiplier: 3,
    jitter: true,
  },
};

// ---------------------------------------------------------------------------
// RetryEngine class
// ---------------------------------------------------------------------------

export class RetryEngine {
  private errors: RetryableError[] = [];
  private missedMessages: MissedMessage[] = [];
  private failover: FailoverConfig;
  private policy: RetryPolicy;

  constructor(
    failoverConfig?: Partial<FailoverConfig>,
    retryPolicy?: Partial<RetryPolicy>,
  ) {
    this.policy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
    this.failover = {
      primaryProvider: "groq/meta-llama/llama-4-scout-17b-16e-instruct",
      fallbackProviders: [
        "groq/llama-3.3-70b-versatile",
        "groq/llama-3.1-8b-instant",
        "nvidia/nvidia/llama-3.1-nemotron-70b-instruct",
      ],
      currentProvider: "groq/meta-llama/llama-4-scout-17b-16e-instruct",
      failbackDelayMs: 5 * 60_000, // 5 phút
      ...failoverConfig,
    };
  }

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  recordError(error: {
    code: string;
    message: string;
    provider?: string;
    channel?: string;
  }): RetryableError {
    const entry: RetryableError = {
      ...error,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.policy.maxRetries,
      resolved: false,
    };

    this.errors.push(entry);

    // Nếu lỗi provider → kiểm tra failover
    if (error.provider && this.shouldFailover(error.provider)) {
      this.activateFailover(error.provider);
    }

    return entry;
  }

  resolveError(index: number): void {
    if (index >= 0 && index < this.errors.length) {
      this.errors[index].resolved = true;
      this.errors[index].resolvedAt = new Date().toISOString();
    }
  }

  // -------------------------------------------------------------------------
  // Missed message recovery
  // -------------------------------------------------------------------------

  recordMissedMessage(msg: {
    channel: string;
    sender: string;
    content: string;
  }): MissedMessage {
    const entry: MissedMessage = {
      id: `miss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...msg,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    };

    this.missedMessages.push(entry);
    return entry;
  }

  async retryMissedMessage(
    messageId: string,
    sendFn: (channel: string, sender: string, content: string) => Promise<boolean>,
  ): Promise<boolean> {
    const msg = this.missedMessages.find((m) => m.id === messageId);
    if (!msg || msg.status === "delivered") return false;

    msg.status = "retrying";
    msg.retryCount++;
    msg.retryAt = new Date().toISOString();

    try {
      const success = await sendFn(msg.channel, msg.sender, msg.content);
      if (success) {
        msg.status = "delivered";
        return true;
      } else {
        msg.status = msg.retryCount >= this.policy.maxRetries ? "failed" : "pending";
        msg.error = "Gửi thất bại";
        return false;
      }
    } catch (err) {
      msg.status = msg.retryCount >= this.policy.maxRetries ? "failed" : "pending";
      msg.error = err instanceof Error ? err.message : "Unknown error";
      return false;
    }
  }

  async retryAllPending(
    sendFn: (channel: string, sender: string, content: string) => Promise<boolean>,
  ): Promise<{ succeeded: number; failed: number }> {
    const pending = this.missedMessages.filter(
      (m) => m.status === "pending" && m.retryCount < this.policy.maxRetries,
    );

    let succeeded = 0;
    let failed = 0;

    for (const msg of pending) {
      const delay = this.calculateDelay(msg.retryCount);
      await this.sleep(delay);

      const ok = await this.retryMissedMessage(msg.id, sendFn);
      if (ok) succeeded++;
      else failed++;
    }

    return { succeeded, failed };
  }

  // -------------------------------------------------------------------------
  // Provider failover
  // -------------------------------------------------------------------------

  private shouldFailover(provider: string): boolean {
    const recentErrors = this.errors.filter(
      (e) =>
        e.provider === provider &&
        !e.resolved &&
        Date.now() - new Date(e.timestamp).getTime() < 5 * 60_000,
    );
    return recentErrors.length >= 3;
  }

  private activateFailover(failedProvider: string): void {
    const available = this.failover.fallbackProviders.find(
      (p) => p !== failedProvider && p !== this.failover.currentProvider,
    );

    if (available) {
      this.failover.currentProvider = available;
      this.failover.failoverAt = new Date().toISOString();
    }
  }

  getCurrentProvider(): string {
    // Kiểm tra nếu đã đủ thời gian, thử failback về primary
    if (
      this.failover.failoverAt &&
      this.failover.currentProvider !== this.failover.primaryProvider
    ) {
      const elapsed = Date.now() - new Date(this.failover.failoverAt).getTime();
      if (elapsed >= this.failover.failbackDelayMs) {
        this.failover.currentProvider = this.failover.primaryProvider;
        this.failover.failoverAt = undefined;
      }
    }

    return this.failover.currentProvider;
  }

  isFailoverActive(): boolean {
    return this.failover.currentProvider !== this.failover.primaryProvider;
  }

  // -------------------------------------------------------------------------
  // Delay calculation (exponential backoff + jitter)
  // -------------------------------------------------------------------------

  private calculateDelay(retryCount: number): number {
    let delay = this.policy.baseDelayMs * Math.pow(this.policy.backoffMultiplier, retryCount);
    delay = Math.min(delay, this.policy.maxDelayMs);

    if (this.policy.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }

    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------

  getReport(): RetryReport {
    return {
      totalErrors: this.errors.length,
      resolvedErrors: this.errors.filter((e) => e.resolved).length,
      pendingErrors: this.errors.filter((e) => !e.resolved).length,
      totalMissedMessages: this.missedMessages.length,
      deliveredRetries: this.missedMessages.filter((m) => m.status === "delivered").length,
      failedRetries: this.missedMessages.filter((m) => m.status === "failed").length,
      currentProvider: this.failover.currentProvider,
      failoverActive: this.isFailoverActive(),
      errors: [...this.errors],
      missedMessages: [...this.missedMessages],
    };
  }

  formatReportText(): string {
    const r = this.getReport();
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    return `
🔄 **BÁO CÁO RETRY & RECOVERY**
⏰ ${now}

🤖 **Provider hiện tại:** ${r.currentProvider}
${r.failoverActive ? "⚠️ FAILOVER ĐANG HOẠT ĐỘNG" : "✅ Primary provider OK"}

❌ **Lỗi:**
  - Tổng: ${r.totalErrors}
  - Đã khắc phục: ${r.resolvedErrors}
  - Đang chờ: ${r.pendingErrors}

📨 **Tin nhắn miss:**
  - Tổng: ${r.totalMissedMessages}
  - Đã gửi lại: ${r.deliveredRetries}
  - Thất bại: ${r.failedRetries}
`.trim();
  }
}
