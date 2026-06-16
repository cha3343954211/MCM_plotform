// 拉取模型列表 —— 加固版
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session || !isAdminRole((session.user as any)?.role)) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let baseUrl = (searchParams.get('baseUrl') || '').trim();
    const overrideKey = (searchParams.get('apiKey') || '').trim();

    if (!baseUrl) {
      let saved: any = null;
      try { saved = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } }); } catch (e) { console.error('[ai-models] findUnique error:', e); }
      if (!saved?.baseUrl) {
        return NextResponse.json({ error: '请先填写或选择 Base URL' }, { status: 400 });
      }
      baseUrl = saved.baseUrl;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/models`;

    let apiKey = overrideKey;
    if (!apiKey) {
      let saved: any = null;
      try { saved = await (prisma as any).aiConfig.findUnique({ where: { id: 'default' } }); } catch {}
      apiKey = (saved?.apiKey || '').trim();
    }
    if (!apiKey) {
      return NextResponse.json({ error: '缺少 API Key：请先在下方填入或保存 API Key 后再拉取' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          { error: `服务返回 ${res.status}：${text.slice(0, 400)}` },
          { status: res.status === 401 || res.status === 403 ? 200 : 502 }
        );
      }
      let parsed: any;
      try { parsed = JSON.parse(text); } catch {
        return NextResponse.json({ error: '服务返回非 JSON，可能不支持 /models 接口', raw: text.slice(0, 200) }, { status: 200 });
      }

      const list: Array<{ id: string; ownedBy?: string }> = [];
      const seen = new Set<string>();
      const push = (id: any, ownedBy?: any) => {
        const s = String(id || '').trim();
        if (!s || seen.has(s)) return;
        seen.add(s);
        list.push({ id: s, ownedBy: ownedBy ? String(ownedBy) : undefined });
      };

      const tryArr = (arr: any) => {
        if (Array.isArray(arr)) {
          for (const it of arr) {
            if (it && typeof it === 'object') push(it.id ?? it.name ?? it.model, it.owned_by ?? it.ownedBy);
            else if (typeof it === 'string') push(it);
          }
          return true;
        }
        return false;
      };

      if (parsed && typeof parsed === 'object') {
        tryArr(parsed.data);
        if (list.length === 0) tryArr(parsed.models);
        if (list.length === 0) tryArr(parsed.data?.models);
      } else if (Array.isArray(parsed)) {
        tryArr(parsed);
      }

      if (list.length === 0) {
        return NextResponse.json({ error: '未能解析出模型列表，请手动填写', models: [], raw: text.slice(0, 500) }, { status: 200 });
      }

      list.sort((a, b) => a.id.localeCompare(b.id));
      return NextResponse.json({ models: list.map((m) => m.id), detailed: list, baseUrl, count: list.length });
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? '请求超时（>15s）' : (e?.message || '请求失败');
      return NextResponse.json({ error: msg }, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e: any) {
    console.error('[ai-models] GET error:', e);
    return NextResponse.json({ error: `拉取模型失败：${e?.message || '未知错误'}` }, { status: 200 });
  }
}
