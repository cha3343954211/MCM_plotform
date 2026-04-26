import { NextRequest } from 'next/server';

// 轻量级内存限流：适合单实例小型部署（2 核 2G 单机）
// 不依赖 Redis，进程重启即清空。对 40 人规模和反爬虫足够用。

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// 周期性清理过期条目，避免内存增长
let cleanupTimer: NodeJS.Timeout | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => {
      if (v.resetAt <= now) store.delete(k);
    });
  }, 5 * 60_000);
  // 不阻止进程退出
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * 固定窗口限流。
 * @param key 唯一键，如 `register:1.2.3.4`
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口长度（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSec: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}
