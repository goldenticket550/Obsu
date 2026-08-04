export interface VoiceRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface VoiceRateLimiter {
  check(key: string): VoiceRateLimitResult;
}

type Entry = { count: number; resetAt: number };

/** Best-effort, per-instance limiter. Replace with a durable shared adapter in multi-instance production. */
export class LocalVoiceRateLimiter implements VoiceRateLimiter {
  private readonly entries = new Map<string, Entry>();
  private checks = 0;

  constructor(
    private readonly maxRequests = 20,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 5_000,
    private readonly pruneEvery = 100,
  ) {}

  check(key: string): VoiceRateLimitResult {
    const now = this.now();
    this.checks += 1;
    if (this.checks % this.pruneEvery === 0 || this.entries.size >= this.maxEntries) {
      this.pruneExpired(now);
    }
    const prior = this.entries.get(key);
    if (!prior && this.entries.size >= this.maxEntries) {
      return {
        allowed: false,
        retryAfterSeconds: this.capacityRetryAfter(now),
      };
    }
    const entry = !prior || prior.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMs }
      : prior;
    entry.count += 1;
    this.entries.set(key, entry);
    return {
      allowed: entry.count <= this.maxRequests,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  private pruneExpired(now: number): void {
    for (const [entryKey, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(entryKey);
    }
  }

  private capacityRetryAfter(now: number): number {
    let earliestReset = now + this.windowMs;
    for (const entry of this.entries.values()) {
      earliestReset = Math.min(earliestReset, entry.resetAt);
    }
    return Math.max(1, Math.ceil((earliestReset - now) / 1000));
  }

  /** Test/diagnostic visibility without exposing mutable storage. */
  get size(): number { return this.entries.size; }
}

export const voiceRateLimiter: VoiceRateLimiter = new LocalVoiceRateLimiter();
