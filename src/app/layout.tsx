import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import { SiteConfigProvider } from '@/components/SiteConfigProvider';

export const metadata: Metadata = {
  title: '数学建模竞赛平台',
  description: '数学建模竞赛在线平台 - 赛题发布、论文提交、成绩查询',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-[#f5f5f7] min-h-screen antialiased">
        <Providers>
          <SiteConfigProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          </SiteConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
