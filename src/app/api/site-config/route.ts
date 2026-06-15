import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

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
      maxSubmissionVersions: 5,
      commentsEnabled: true,
      showSubmissionTime: true,
    });
  }
}

// PUT - admin only, update site config
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { siteName, siteDesc, heroTitle, heroDesc, footerText, primaryColor, secondaryColor, gradientEnabled, gradientAngle, logoUrl, bannerText, bannerEnabled, maxFileSize, maxSubmissionVersions, commentsEnabled, showSubmissionTime } = body;

    const update: any = {};
    if (siteName) update.siteName = siteName;
    if (siteDesc) update.siteDesc = siteDesc;
    if (heroTitle) update.heroTitle = heroTitle;
    if (heroDesc) update.heroDesc = heroDesc;
    if (footerText) update.footerText = footerText;
    if (primaryColor) update.primaryColor = primaryColor;
    if (secondaryColor !== undefined) update.secondaryColor = secondaryColor || null;
    if (gradientEnabled !== undefined) update.gradientEnabled = Boolean(gradientEnabled);
    if (gradientAngle !== undefined) {
      const a = parseInt(gradientAngle, 10);
      if (!isNaN(a)) update.gradientAngle = Math.max(0, Math.min(360, a));
    }
    if (logoUrl !== undefined) update.logoUrl = logoUrl;
    if (bannerText !== undefined) update.bannerText = bannerText;
    if (bannerEnabled !== undefined) update.bannerEnabled = bannerEnabled;
    if (maxFileSize !== undefined) update.maxFileSize = maxFileSize;
    if (maxSubmissionVersions !== undefined) update.maxSubmissionVersions = Math.max(1, Math.min(20, Number(maxSubmissionVersions) || 5));
    if (commentsEnabled !== undefined) update.commentsEnabled = Boolean(commentsEnabled);
    if (showSubmissionTime !== undefined) update.showSubmissionTime = Boolean(showSubmissionTime);

    const config = await (prisma.siteConfig as any).upsert({
      where: { id: 'default' },
      update,
      create: {
        id: 'default',
        siteName: siteName || '数学建模竞赛平台',
        siteDesc: siteDesc || '数学建模竞赛在线平台',
        heroTitle: heroTitle || '数学建模竞赛平台',
        heroDesc: heroDesc || '参与数学建模竞赛，提升解决实际问题的能力，展现你的数学才华',
        footerText: footerText || '数学建模竞赛平台',
        primaryColor: primaryColor || '#2563eb',
        secondaryColor: secondaryColor || null,
        gradientEnabled: Boolean(gradientEnabled),
        gradientAngle: typeof gradientAngle === 'number' ? gradientAngle : 160,
        logoUrl: logoUrl || null,
        bannerText: bannerText || null,
        bannerEnabled: bannerEnabled || false,
        maxFileSize: maxFileSize || 10,
        maxSubmissionVersions: Math.max(1, Math.min(20, Number(maxSubmissionVersions) || 5)),
        commentsEnabled: commentsEnabled !== undefined ? Boolean(commentsEnabled) : true,
        showSubmissionTime: showSubmissionTime !== undefined ? Boolean(showSubmissionTime) : true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('更新站点配置失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
