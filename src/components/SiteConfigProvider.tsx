'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface SiteConfig {
  siteName: string;
  siteDesc: string;
  heroTitle: string;
  heroDesc: string;
  footerText: string;
  primaryColor: string;
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

  const refresh = () => {
    fetch('/api/site-config')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.siteName) setConfig(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SiteConfigContext.Provider value={{ config, refresh }}>
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
