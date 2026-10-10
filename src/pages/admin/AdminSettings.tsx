import { useEffect, useState } from 'react';
import { Save, AlertCircle, Image, Search, Bell, Globe, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';
import type { SiteSettings } from '@/types';

export default function AdminSettings() {
  const { showToast } = useToast();
  const { refresh } = useSettings();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
      if (data) { setSettings(data as SiteSettings); setForm(data as SiteSettings); }
      setLoading(false);
    })();
  }, []);

  const set = (key: keyof SiteSettings, value: string | boolean | null | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!settings) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      site_name: (form.site_name || '').trim(),
      tagline: (form.tagline || '').trim(),
      logo_url: (form.logo_url || '').trim() || null,
      logo_image_url: (form.logo_image_url || '').trim() || null,
      logo_offset_x: parseInt(String(form.logo_offset_x || 0), 10) || 0,
      logo_offset_y: parseInt(String(form.logo_offset_y || 0), 10) || 0,
      logo_width: parseInt(String(form.logo_width || 160), 10) || 160,
      logo_height: parseInt(String(form.logo_height || 40), 10) || 40,
      favicon_url: (form.favicon_url || '').trim() || null,
      default_seo_description: (form.default_seo_description || '').trim() || null,
      meta_keywords: (form.meta_keywords || '').trim() || null,
      og_image_url: (form.og_image_url || '').trim() || null,
      twitter_card_type: form.twitter_card_type || 'summary_large_image',
      primary_color: (form.primary_color || '#78F6E1').trim(),
      footer_text: (form.footer_text || '').trim() || null,
      homepage_game_count: parseInt(String(form.homepage_game_count || '12'), 10) || 12,
      popup_enabled: !!form.popup_enabled,
      popup_title: (form.popup_title || '').trim() || null,
      popup_message: (form.popup_message || '').trim() || null,
      popup_button_text: (form.popup_button_text || '').trim() || null,
      popup_button_url: (form.popup_button_url || '').trim() || null,
      popup_image_url: (form.popup_image_url || '').trim() || null,
      popup_dismissible: !!form.popup_dismissible,
      popup_start_date: form.popup_start_date || null,
      popup_end_date: form.popup_end_date || null,
      maintenance_enabled: !!form.maintenance_enabled,
      maintenance_message: (form.maintenance_message || '').trim() || null,
      maintenance_title: (form.maintenance_title || '').trim() || null,
    };

    const { error: err } = await supabase.from('site_settings').update(payload).eq('id', settings.id);
    setSaving(false);
    if (err) { setError(err.message); }
    else { showToast('Settings saved successfully', 'success'); refresh(); }
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-surface-light">Settings</h1>
        <div className="shimmer h-96 rounded-card" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-light">Settings</h1>
        <p className="text-sm text-surface-light/50">Configure your PLAYZI site - branding, SEO, and popups</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding Section */}
        <div className="admin-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light">
            <Image className="h-5 w-5 text-aqua" /> Branding
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Site Name</label>
              <input type="text" required value={form.site_name || ''} onChange={(e) => set('site_name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Tagline</label>
              <input type="text" required value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Custom Logo Image URL</label>
              <input type="url" value={form.logo_image_url || ''} onChange={(e) => set('logo_image_url', e.target.value)} placeholder="https://..." className="input-field" />
              <p className="mt-1 text-xs text-surface-light/50">Landscape logo image (includes brand name). Leave empty for default text logo.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Small Logo / Icon URL</label>
              <input type="url" value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." className="input-field" />
              <p className="mt-1 text-xs text-surface-light/50">Small icon used in footer. Leave empty for default.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Favicon URL</label>
              <input type="url" value={form.favicon_url || ''} onChange={(e) => set('favicon_url', e.target.value)} placeholder="https://..." className="input-field" />
              <p className="mt-1 text-xs text-surface-light/50">Leave empty for default favicon.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Footer Text</label>
              <input type="text" value={form.footer_text || ''} onChange={(e) => set('footer_text', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Homepage Game Count</label>
              <input type="number" min="4" max="48" value={form.homepage_game_count || 12} onChange={(e) => set('homepage_game_count', e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Logo positioning controls */}
          {form.logo_image_url && (
            <div className="mt-4 border-t border-dark-border pt-4">
              <h3 className="mb-3 text-sm font-semibold text-surface-light">Logo Position & Size</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-light/50">Width (px)</label>
                  <input type="number" min="40" max="400" value={form.logo_width || 160} onChange={(e) => set('logo_width', parseInt(e.target.value) || 160)} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-light/50">Height (px)</label>
                  <input type="number" min="20" max="100" value={form.logo_height || 40} onChange={(e) => set('logo_height', parseInt(e.target.value) || 40)} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-light/50">Offset X (px)</label>
                  <input type="number" value={form.logo_offset_x || 0} onChange={(e) => set('logo_offset_x', parseInt(e.target.value) || 0)} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-light/50">Offset Y (px)</label>
                  <input type="number" value={form.logo_offset_y || 0} onChange={(e) => set('logo_offset_y', parseInt(e.target.value) || 0)} className="input-field" />
                </div>
              </div>
              <p className="mt-2 text-xs text-surface-light/50">Positive X moves right, positive Y moves down. Adjust to align your logo perfectly.</p>
            </div>
          )}
        </div>

        {/* SEO Section */}
        <div className="admin-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light">
            <Search className="h-5 w-5 text-aqua" /> SEO Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Meta Description</label>
              <textarea value={form.default_seo_description || ''} onChange={(e) => set('default_seo_description', e.target.value)} rows={2} className="input-field resize-none" />
              <p className="mt-1 text-xs text-surface-light/50">Shown in search engine results. Keep under 160 characters.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Meta Keywords</label>
              <input type="text" value={form.meta_keywords || ''} onChange={(e) => set('meta_keywords', e.target.value)} placeholder="gaming, browser games, free games" className="input-field" />
              <p className="mt-1 text-xs text-surface-light/50">Comma-separated keywords for search engines.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-light">OG Image URL</label>
                <input type="url" value={form.og_image_url || ''} onChange={(e) => set('og_image_url', e.target.value)} placeholder="https://..." className="input-field" />
                <p className="mt-1 text-xs text-surface-light/50">Social share preview image (1200x630 recommended).</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-light">Twitter Card Type</label>
                <select value={form.twitter_card_type || 'summary_large_image'} onChange={(e) => set('twitter_card_type', e.target.value)} className="input-field cursor-pointer">
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary with Large Image</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Popup Section */}
        <div className="admin-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light">
            <Bell className="h-5 w-5 text-aqua" /> Site Popup / Announcement
          </h2>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
              <input type="checkbox" checked={!!form.popup_enabled} onChange={(e) => set('popup_enabled', e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
              Enable Popup
            </label>
            <p className="mt-1 ml-6 text-xs text-surface-light/50">Show a popup announcement to all website visitors.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Popup Title</label>
              <input type="text" value={form.popup_title || ''} onChange={(e) => set('popup_title', e.target.value)} placeholder="Welcome to PLAYZI!" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Popup Image URL</label>
              <input type="url" value={form.popup_image_url || ''} onChange={(e) => set('popup_image_url', e.target.value)} placeholder="https://..." className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Popup Message</label>
              <textarea value={form.popup_message || ''} onChange={(e) => set('popup_message', e.target.value)} rows={3} className="input-field resize-none" placeholder="Enter your announcement message..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Button Text</label>
              <input type="text" value={form.popup_button_text || ''} onChange={(e) => set('popup_button_text', e.target.value)} placeholder="Play Now" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Button URL</label>
              <input type="text" value={form.popup_button_url || ''} onChange={(e) => set('popup_button_url', e.target.value)} placeholder="/games or https://..." className="input-field" />
              <p className="mt-1 text-xs text-surface-light/50">Use /games for internal link or https:// for external.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Start Date (optional)</label>
              <input type="datetime-local" value={form.popup_start_date ? new Date(form.popup_start_date).toISOString().slice(0, 16) : ''} onChange={(e) => set('popup_start_date', e.target.value ? new Date(e.target.value).toISOString() : null)} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">End Date (optional)</label>
              <input type="datetime-local" value={form.popup_end_date ? new Date(form.popup_end_date).toISOString().slice(0, 16) : ''} onChange={(e) => set('popup_end_date', e.target.value ? new Date(e.target.value).toISOString() : null)} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
                <input type="checkbox" checked={!!form.popup_dismissible} onChange={(e) => set('popup_dismissible', e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
                Allow visitors to dismiss popup
              </label>
            </div>
          </div>
        </div>

        {/* Maintenance Mode Section */}
        <div className="admin-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-light">
            <Wrench className="h-5 w-5 text-aqua" /> Maintenance Mode
          </h2>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
              <input type="checkbox" checked={!!form.maintenance_enabled} onChange={(e) => set('maintenance_enabled', e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
              Enable Maintenance Mode
            </label>
            <p className="mt-1 ml-6 text-xs text-surface-light/50">
              When enabled, regular visitors will see a maintenance page. Admins can still access the admin panel.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Maintenance Title</label>
              <input type="text" value={form.maintenance_title || ''} onChange={(e) => set('maintenance_title', e.target.value)} placeholder="Under Maintenance" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Maintenance Message</label>
              <textarea value={form.maintenance_message || ''} onChange={(e) => set('maintenance_message', e.target.value)} rows={2} className="input-field resize-none" placeholder="We are performing maintenance. We will be back shortly." />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>

      <div className="mt-6 max-w-2xl rounded-card border border-dark-border bg-dark-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-light">
          <Globe className="h-4 w-4 text-surface-light/50" /> Admin Account
        </h3>
        <p className="mt-2 text-xs text-surface-light/50">
          Your admin account is configured. Sign in with your email and password to access the admin panel at <code className="rounded bg-dark-hover px-1.5 py-0.5 text-aqua">/admin</code>.
        </p>
      </div>
    </div>
  );
}
