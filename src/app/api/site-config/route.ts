import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - public, returns site config
export async function GET() {
  try {
    let config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.siteConfig.create({ data: { id: 'default' } });
    }
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({
      siteName: '数学建模竞赛平台',
      siteDesc: '数学建模竞赛在线平台',
      heroTitle: '数学建模竞赛平台',
      heroDesc: '参与数学建模竞赛，提升解决实际问题的能力，展现你的数学才华',
      footerText: '数学建模竞赛平台',
      primaryColor: '#2563eb',
      logoUrl: null,
      bannerText: null,
      bannerEnabled: false,
      maxFileSize: 10,
    });
  }
}

// PUT - admin only, update site config
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { siteName, siteDesc, heroTitle, heroDesc, footerText, primaryColor, logoUrl, bannerText, bannerEnabled, maxFileSize } = body;

    const config = await prisma.siteConfig.upsert({
      where: { id: 'default' },
      update: {
        siteName: siteName || undefined,
        siteDesc: siteDesc || undefined,
        heroTitle: heroTitle || undefined,
        heroDesc: heroDesc || undefined,
        footerText: footerText || undefined,
        primaryColor: primaryColor || undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        bannerText: bannerText !== undefined ? bannerText : undefined,
        bannerEnabled: bannerEnabled !== undefined ? bannerEnabled : undefined,
        maxFileSize: maxFileSize !== undefined ? maxFileSize : undefined,
      },
      create: {
        id: 'default',
        siteName: siteName || '数学建模竞赛平台',
        siteDesc: siteDesc || '数学建模竞赛在线平台',
        heroTitle: heroTitle || '数学建模竞赛平台',
        heroDesc: heroDesc || '参与数学建模竞赛，提升解决实际问题的能力，展现你的数学才华',
        footerText: footerText || '数学建模竞赛平台',
        primaryColor: primaryColor || '#2563eb',
        logoUrl: logoUrl || null,
        bannerText: bannerText || null,
        bannerEnabled: bannerEnabled || false,
        maxFileSize: maxFileSize || 10,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('更新站点配置失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
