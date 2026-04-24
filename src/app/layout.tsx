import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import { SiteConfigProvider } from '@/components/SiteConfigProvider';

export const metadata: Metadata = {
  title: '数学建模竞赛平台',
  description: '数学建模竞赛在线平台 - 赛题发布、论文提交、成绩查询',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <SiteConfigProvider>
            <Navbar />
            <main>{children}</main>
          </SiteConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
