import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@/types';

interface SettingsContextValue {
  settings: SiteSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
    if (data) setSettings(data as SiteSettings);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!settings) return;

    const name = settings.site_name || 'PLAYZI';
    const tagline = settings.tagline || 'Unlimited Cloud Gaming';

    document.title = `${name} - ${tagline}`;

    if (settings.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }

    const ensureMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (settings.default_seo_description) {
      ensureMeta('description', settings.default_seo_description);
    }
    if (settings.meta_keywords) {
      ensureMeta('keywords', settings.meta_keywords);
    }
    if (settings.og_image_url) {
      ensureMeta('og:image', settings.og_image_url, 'property');
      ensureMeta('og:title', `${name} - ${tagline}`, 'property');
    }
    if (settings.twitter_card_type) {
      ensureMeta('twitter:card', settings.twitter_card_type);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
