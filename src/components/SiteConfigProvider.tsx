'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export interface SiteConfig {
  siteName: string;
  siteDesc: string;
  heroTitle: string;
  heroDesc: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string | null;
  gradientEnabled: boolean;
  gradientAngle: number;
  logoUrl: string | null;
  bannerText: string | null;
  bannerEnabled: boolean;
  maxFileSize: number;
}

const defaultConfig: SiteConfig = {
  siteName: '数学建模竞赛平台',
  siteDesc: '数学建模竞赛在线平台',
  heroTitle: '数学建模竞赛平台',
  heroDesc: '参与数学建模竞赛，提升解决实际问题的能力，展现你的数学才华',
  footerText: '数学建模竞赛平台',
  primaryColor: '#2563eb',
  secondaryColor: null,
  gradientEnabled: false,
  gradientAngle: 160,
  logoUrl: null,
  bannerText: null,
  bannerEnabled: false,
  maxFileSize: 10,
};

const SiteConfigContext = createContext<{ config: SiteConfig; refresh: () => void }>({
  config: defaultConfig,
  refresh: () => {},
});

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);

  const refresh = useCallback((retries = 2) => {
    fetch('/api/site-config', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then((data) => {
        if (data && data.siteName) {
          setConfig((prev) => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      })
      .catch(() => {
        if (retries > 0) setTimeout(() => refresh(retries - 1), 2000);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ config, refresh }), [config, refresh]);

  return (
    <SiteConfigContext.Provider value={value}>
      {config.bannerEnabled && config.bannerText && (
        <div
          className="text-white text-center text-sm py-2 px-4 font-medium"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.bannerText}
        </div>
      )}
      {children}
    </SiteConfigContext.Provider>
  );
}
