import { ApiError } from './errors.ts';

export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; until: number }>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) { this.now = now; }

  take(key: string, maximum: number): void {
    for (const [name, value] of this.buckets) if (value.until <= this.now()) this.buckets.delete(name);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= 1000) throw new ApiError(429, 'RATE_LIMITED', 'Bitte später erneut versuchen.');
      bucket = { count: 0, until: this.now() + 60_000 };
      this.buckets.set(key, bucket);
    }
    if (++bucket.count > maximum) throw new ApiError(429, 'RATE_LIMITED', 'Zu viele Anfragen. Bitte eine Minute warten.');
  }
}
