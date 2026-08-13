// Rate limiter sederhana berbasis in-memory Map.
//
// Interface `RateLimiter` dibuat agar mudah diganti ke implementasi Redis
// (misal untuk deployment multi-instance) tanpa mengubah pemanggilnya.
// Token bucket sederhana: membatasi N request per window (misal 60 detik).

export interface RateLimiter {
  consume(key: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly max: number;
  private readonly windowMs: number;

  constructor(max = 5, windowMs = 60_000) {
    this.max = max;
    this.windowMs = windowMs;
  }

  async consume(key: string): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs };
    }

    if (bucket.count >= this.max) {
      return { success: false, remaining: 0, reset: bucket.resetAt };
    }

    bucket.count += 1;
    return { success: true, remaining: this.max - bucket.count, reset: bucket.resetAt };
  }

  // Bersihkan bucket yang sudah kedaluwarsa (mencegah kebocoran memori).
  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }
}

// Ambil konfigurasi dari env, default 5 request / 60 detik.
const maxFromEnv = parseInt(process.env.RATE_LIMIT_MAX ?? "5", 10);
export const rateLimiter: RateLimiter = new MemoryRateLimiter(
  isNaN(maxFromEnv) ? 5 : maxFromEnv,
  60_000
);

// periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    // rateLimiter instanceof MemoryRateLimiter ? rateLimiter.cleanup() : undefined
  }, 60_000).unref?.();
}

// Helper untuk mendapatkan key rate limit berdasarkan IP dari Request.
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}