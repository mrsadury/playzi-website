import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { CustomPage } from '@/types';

export default function Footer({ footerText }: { footerText?: string | null }) {
  const { settings } = useSettings();
  const logoImageUrl = settings?.logo_image_url;
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);

  useEffect(() => {
    supabase
      .from('custom_pages')
      .select('id, title, slug, published, show_in_footer')
      .eq('published', true)
      .eq('show_in_footer', true)
      .order('title')
      .then(({ data }) => {
        setCustomPages((data as CustomPage[]) || []);
      });
  }, []);

  return (
    <footer className="border-t border-dark-border bg-dark-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            {logoImageUrl ? (
              <img src={logoImageUrl} alt="PLAYZI" style={{ width: `${settings?.logo_width || 160}px`, height: `${settings?.logo_height || 40}px` }} className="object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aqua">
                  <Gamepad2 className="h-4 w-4 text-black" />
                </div>
                <span className="text-lg font-extrabold text-surface-light">
                  PLAY<span className="text-aqua">ZI</span>
                </span>
              </div>
            )}
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-surface-light/60">
            <Link to="/games" className="hover:text-aqua">Games</Link>
            <Link to="/categories" className="hover:text-aqua">Categories</Link>
            <Link to="/popular" className="hover:text-aqua">Popular</Link>
            <Link to="/new" className="hover:text-aqua">New Games</Link>
            <Link to="/leaderboard" className="hover:text-aqua">Leaderboard</Link>
            {customPages.map((page) => (
              <Link key={page.id} to={`/p/${page.slug}`} className="hover:text-aqua">
                {page.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t border-dark-border pt-6 text-center text-xs text-surface-light/40">
          {footerText || 'PLAYZI - Unlimited Cloud Gaming. All games are embedded from external sources.'}
        </div>
      </div>
    </footer>
  );
}
