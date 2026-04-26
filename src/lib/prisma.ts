import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTuned: boolean | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// SQLite 调优：仅执行一次。WAL 提升并发读，NORMAL 同步在意外断电时偶尔丢失最后一笔，
// 但避免每次写都 fsync，可显著降低 IO 等待，对 2 核 2G 服务器尤其友好。
if (!globalForPrisma.prismaTuned) {
  globalForPrisma.prismaTuned = true;
  Promise.resolve()
    .then(async () => {
      try {
        // PRAGMA journal_mode 会返回当前模式，必须用 $queryRawUnsafe；
        // synchronous / busy_timeout 不返回结果，但统一用 queryRaw 也兼容。
        await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL');
        await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL');
        await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
      } catch (e) {
        console.warn('[prisma] PRAGMA tuning skipped:', e);
      }
    })
    .catch(() => {});
}

export { prisma };
export default prisma;
