import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';

export default function SitePopup() {
  const { settings } = useSettings();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!settings?.popup_enabled) {
      setShow(false);
      return;
    }

    const now = new Date();
    if (settings.popup_start_date) {
      const start = new Date(settings.popup_start_date);
      if (now < start) { setShow(false); return; }
    }
    if (settings.popup_end_date) {
      const end = new Date(settings.popup_end_date);
      if (now > end) { setShow(false); return; }
    }

    const dismissed = localStorage.getItem('playzi_popup_dismissed');
    if (dismissed && settings.popup_dismissible) {
      try {
        const d = JSON.parse(dismissed);
        if (d.title === settings.popup_title && d.msg === settings.popup_message) {
          setShow(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [settings]);

  const handleClose = () => {
    setShow(false);
    if (settings?.popup_dismissible) {
      localStorage.setItem(
        'playzi_popup_dismissed',
        JSON.stringify({ title: settings.popup_title, msg: settings.popup_message })
      );
    }
  };

  if (!show || !settings?.popup_enabled) return null;

  const hasContent = settings.popup_title || settings.popup_message;

  if (!hasContent) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-bg/70 backdrop-blur-sm animate-fade-in" onClick={settings.popup_dismissible ? handleClose : undefined} />
      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-card bg-dark-card shadow-2xl">
        {settings.popup_image_url && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-dark-surface">
            <img
              src={settings.popup_image_url}
              alt={settings.popup_title || 'Announcement'}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-6">
          {settings.popup_title && (
            <h2 className="text-xl font-bold text-surface-light">{settings.popup_title}</h2>
          )}
          {settings.popup_message && (
            <p className="mt-2 text-sm leading-relaxed text-surface-light/50">{settings.popup_message}</p>
          )}
          {settings.popup_button_text && (
            settings.popup_button_url ? (
              settings.popup_button_url.startsWith('/') ? (
                <Link to={settings.popup_button_url} onClick={handleClose} className="btn-primary mt-4 w-full">
                  {settings.popup_button_url.startsWith('http') && <ExternalLink className="h-4 w-4" />}
                  {settings.popup_button_text}
                </Link>
              ) : (
                <a
                  href={settings.popup_button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClose}
                  className="btn-primary mt-4 w-full"
                >
                  <ExternalLink className="h-4 w-4" />
                  {settings.popup_button_text}
                </a>
              )
            ) : (
              <button onClick={handleClose} className="btn-primary mt-4 w-full">
                {settings.popup_button_text}
              </button>
            )
          )}
        </div>
        {settings.popup_dismissible && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-dark-bg/50 text-surface-light backdrop-blur-sm transition-colors hover:bg-dark-bg/80"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
