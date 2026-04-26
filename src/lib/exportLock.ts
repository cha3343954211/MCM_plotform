// 全局 ZIP 导出并发锁：防止同一时间多个打包任务把 2 核 CPU 打满
// 单实例进程内有效；跨进程部署需要换成 Redis 锁。

let inFlight = 0;
const MAX_CONCURRENT = 1;

export function tryAcquireExportLock(): boolean {
  if (inFlight >= MAX_CONCURRENT) return false;
  inFlight += 1;
  return true;
}

export function releaseExportLock() {
  inFlight = Math.max(0, inFlight - 1);
}

export function exportLockBusy(): boolean {
  return inFlight >= MAX_CONCURRENT;
}
