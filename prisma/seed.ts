import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log('管理员已存在:', existingAdmin.email);
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: '管理员',
      email: 'admin@mathoi.com',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('管理员账号已创建:', admin.email, '密码: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
