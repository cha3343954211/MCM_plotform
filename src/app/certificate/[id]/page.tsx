'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, Loader2, Award, Crown, Medal, Star, Trophy, Sparkles } from 'lucide-react';
import { getAwardLabel } from '@/lib/utils';

interface CertTheme {
  tier: number; // 1=excellent ... 5=special
  primary: string; // 主色
  secondary: string; // 副色 / 渐变
  accent: string; // 点缀色
  background: string; // 内层底色（淡）
  ribbon: boolean; // 顶部缎带
  englishLabel: string;
  badgeIcon: typeof Crown;
  sealText: string;
}

function getCertTheme(award: string, fallbackPrimary: string, fallbackSecondary: string | null): CertTheme {
  const fb2 = fallbackSecondary || fallbackPrimary;
  switch (award) {
    case 'special':
      return {
        tier: 5,
        primary: '#7f1d1d',
        secondary: '#dc2626',
        accent: '#f59e0b',
        background: '#fff7ed',
        ribbon: true,
        englishLabel: 'GRAND PRIZE',
        badgeIcon: Crown,
        sealText: '至尊',
      };
    case 'first':
      return {
        tier: 4,
        primary: '#92400e',
        secondary: '#d97706',
        accent: '#fbbf24',
        background: '#fffbeb',
        ribbon: true,
        englishLabel: 'FIRST PRIZE',
        badgeIcon: Trophy,
        sealText: '金奖',
      };
    case 'second':
      return {
        tier: 3,
        primary: '#334155',
        secondary: '#64748b',
        accent: '#94a3b8',
        background: '#f8fafc',
        ribbon: false,
        englishLabel: 'SECOND PRIZE',
        badgeIcon: Medal,
        sealText: '银奖',
      };
    case 'third':
      return {
        tier: 2,
        primary: '#9a3412',
        secondary: '#c2410c',
        accent: '#fb923c',
        background: '#fff7ed',
        ribbon: false,
        englishLabel: 'THIRD PRIZE',
        badgeIcon: Medal,
        sealText: '铜奖',
      };
    case 'excellent':
      return {
        tier: 1,
        primary: '#0369a1',
        secondary: '#0ea5e9',
        accent: '#22d3ee',
        background: '#f0f9ff',
        ribbon: false,
        englishLabel: 'CERTIFICATE OF EXCELLENCE',
        badgeIcon: Star,
        sealText: '优秀',
      };
    default:
      return {
        tier: 1,
        primary: fallbackPrimary,
        secondary: fb2,
        accent: fb2,
        background: '#ffffff',
        ribbon: false,
        englishLabel: 'CERTIFICATE OF ACHIEVEMENT',
        badgeIcon: Sparkles,
        sealText: '荣誉',
      };
  }
}

type Awardee =
  | { type: 'user'; name: string; school: string; studentId: string }
  | { type: 'team'; name: string; members: { name: string; school: string | null }[] };

interface CertData {
  id: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string | null;
  competitionTitle: string;
  award: string;
  score: number | null;
  issuedAt: string;
  code: string;
  awardee: Awardee;
}

function formatIssuedDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/submissions/${params.id}/certificate`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || '加载失败');
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const downloadPdf = async () => {
    if (!certRef.current || !data) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(certRef.current, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      // A4 横向：297 x 210 mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let imgW = pageW;
      let imgH = imgW / ratio;
      if (imgH > pageH) {
        imgH = pageH;
        imgW = imgH * ratio;
      }
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
      const safeTitle = data.competitionTitle.replace(/[\\/:*?"<>|]/g, '_');
      const safeName = data.awardee.name.replace(/[\\/:*?"<>|]/g, '_');
      pdf.save(`证书_${safeTitle}_${safeName}_${data.code}.pdf`);
    } catch (err) {
      alert('生成 PDF 失败：' + (err instanceof Error ? err.message : ''));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center">
        <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">{error || '无法获取证书'}</p>
        <button onClick={() => router.back()} className="px-5 py-2 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm">
          返回
        </button>
      </div>
    );
  }

  const theme = getCertTheme(data.award, data.primaryColor, data.secondaryColor);
  const primary = theme.primary;
  const secondary = theme.secondary;
  const accent = theme.accent;
  const BadgeIcon = theme.badgeIcon;
  const awardLabel = getAwardLabel(data.award) || data.award;
  const isTeam = data.awardee.type === 'team';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap gap-3 justify-between items-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-2xl bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-200 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? '生成中...' : '下载证书 PDF'}
        </button>
      </div>

      {/* A4 横向证书：1123 x 794 px @ 96dpi */}
      <div className="overflow-x-auto pb-6">
        <div
          ref={certRef}
          className="relative mx-auto overflow-hidden"
          style={{
            width: '1123px',
            height: '794px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            fontFamily: '"Noto Serif SC", "Source Han Serif", "Songti SC", "SimSun", "STSong", serif',
            background: theme.tier >= 4
              ? `radial-gradient(ellipse at top, ${primary}10, ${theme.background} 60%)`
              : theme.background,
          }}
        >
          {/* 特等奖额外光晕 */}
          {theme.tier === 5 && (
            <>
              <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${accent}30, transparent 70%)` }} />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${secondary}25, transparent 70%)` }} />
            </>
          )}

          {/* 顶部缎带 */}
          {theme.ribbon && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-6"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, clipPath: 'polygon(0 0, 100% 0, 90% 100%, 50% 80%, 10% 100%)' }}
            />
          )}

          {/* 外描边 */}
          <div
            className="absolute inset-6 rounded-md"
            style={{ border: `${theme.tier >= 4 ? 4 : 3}px solid ${primary}` }}
          />
          {/* 内描边 */}
          <div
            className="absolute inset-9 rounded-sm"
            style={{ border: `1px solid ${primary}66` }}
          />
          {/* 三层描边（特等奖） */}
          {theme.tier === 5 && (
            <div className="absolute inset-12 rounded-sm" style={{ border: `1px dashed ${accent}aa` }} />
          )}

          {/* 角落装饰 */}
          {[
            { top: 18, left: 18 },
            { top: 18, right: 18 },
            { bottom: 18, left: 18 },
            { bottom: 18, right: 18 },
          ].map((pos, i) => (
            <div
              key={i}
              className={`absolute rounded-full flex items-center justify-center ${theme.tier >= 4 ? 'w-14 h-14' : 'w-12 h-12'}`}
              style={{
                ...pos,
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                opacity: 0.9,
                boxShadow: theme.tier >= 4 ? `0 0 12px ${accent}88` : 'none',
              }}
            >
              {theme.tier === 5 && <Star className="w-5 h-5 text-white" fill="white" />}
            </div>
          ))}

          {/* 侧边小星点（特等 / 一等） */}
          {theme.tier >= 4 && (
            <>
              {[120, 220, 574, 674].map((top, idx) => (
                <Star key={`l${idx}`} className="absolute w-3 h-3" style={{ top, left: 30, color: accent }} fill={accent} />
              ))}
              {[120, 220, 574, 674].map((top, idx) => (
                <Star key={`r${idx}`} className="absolute w-3 h-3" style={{ top, right: 30, color: accent }} fill={accent} />
              ))}
            </>
          )}

          {/* 印章（右下） */}
          <div
            className="absolute flex items-center justify-center text-white font-bold tracking-widest"
            style={{
              right: 70,
              bottom: 100,
              width: 90,
              height: 90,
              borderRadius: '50%',
              border: `3px solid ${primary}`,
              background: `linear-gradient(135deg, ${primary}cc, ${secondary}cc)`,
              fontSize: 22,
              transform: 'rotate(-12deg)',
              boxShadow: `0 4px 12px ${primary}44`,
            }}
          >
            {theme.sealText}
          </div>

          {/* 内容 */}
          <div className="relative h-full flex flex-col items-center justify-between py-16 px-24 text-center">
            <div>
              <p className="text-sm tracking-[0.4em] uppercase" style={{ color: `${primary}99` }}>{theme.englishLabel}</p>
              <h1
                className="mt-3 text-3xl font-bold tracking-wider"
                style={{ color: primary }}
              >
                {data.siteName}
              </h1>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: theme.tier >= 4 ? 72 : 56,
                  height: theme.tier >= 4 ? 72 : 56,
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  boxShadow: theme.tier >= 4 ? `0 0 20px ${accent}aa` : `0 4px 12px ${primary}33`,
                }}
              >
                <BadgeIcon className={theme.tier >= 4 ? 'w-9 h-9 text-white' : 'w-7 h-7 text-white'} />
              </div>
              <h2
                className={`font-extrabold tracking-[0.3em] ${theme.tier === 5 ? 'text-6xl' : 'text-5xl'}`}
                style={{
                  color: primary,
                  textShadow: theme.tier >= 4 ? `0 2px 8px ${accent}55` : 'none',
                }}
              >
                获 奖 证 书
              </h2>
              <div
                className="px-10 py-2 rounded-full text-white text-xl font-semibold tracking-widest"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  boxShadow: `0 6px 16px ${primary}55`,
                  border: theme.tier >= 4 ? `1px solid ${accent}` : 'none',
                }}
              >
                {awardLabel}
              </div>
            </div>

            <div className="text-gray-700 leading-loose text-lg max-w-3xl">
              <p>
                兹颁发此证书予&nbsp;
                <span className="font-bold text-2xl mx-1" style={{ color: primary }}>
                  {data.awardee.name}
                </span>
                {!isTeam && data.awardee.type === 'user' && data.awardee.school && (
                  <span className="text-gray-500">（{data.awardee.school}）</span>
                )}
                ，
              </p>
              <p>
                其在《
                <span className="font-semibold mx-1" style={{ color: primary }}>
                  {data.competitionTitle}
                </span>
                》中表现优异，荣获
                <span className="font-bold mx-1" style={{ color: primary }}>
                  {awardLabel}
                </span>
                。
              </p>
              {data.score !== null && data.score !== undefined && (
                <p className="text-sm text-gray-500 mt-2">最终成绩：{data.score} 分</p>
              )}
              {isTeam && data.awardee.type === 'team' && data.awardee.members.length > 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  团队成员：{data.awardee.members.map((m) => m.name).join('、')}
                </p>
              )}
            </div>

            <div className="w-full flex justify-between items-end text-xs text-gray-500 pt-6">
              <div className="text-left">
                <p className="text-gray-400">颁发机构</p>
                <p className="font-semibold text-gray-700 text-base mt-1">{data.siteName}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">证书编号</p>
                <p className="font-mono text-gray-700 mt-1 tracking-wider">{data.code}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400">颁发日期</p>
                <p className="font-semibold text-gray-700 text-base mt-1">{formatIssuedDate(data.issuedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        建议使用 Chrome / Edge 浏览器下载，PDF 为 A4 横向。证书可通过编号 {data.code} 在颁发机构核验。
      </p>
    </div>
  );
}
