import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, FileText, AlertCircle, Save, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { CustomPage } from '@/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { slugify } from '@/lib/utils';

export default function AdminPages() {
  const { showToast } = useToast();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPage, setEditPage] = useState<CustomPage | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomPage | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('custom_pages').select('*').order('updated_at', { ascending: false });
    if (error) {
      showToast('Failed to load pages', 'error');
    } else {
      setPages((data as CustomPage[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const togglePublished = async (page: CustomPage) => {
    const { error } = await supabase.rpc('upsert_custom_page', {
      p_id: page.id,
      p_published: !page.published,
    });
    if (error) {
      showToast('Failed to update page', 'error');
    } else {
      showToast(`Page ${!page.published ? 'published' : 'unpublished'}`, 'success');
      fetchPages();
    }
  };

  const toggleFooter = async (page: CustomPage) => {
    const { error } = await supabase.rpc('upsert_custom_page', {
      p_id: page.id,
      p_show_in_footer: !page.show_in_footer,
    });
    if (error) {
      showToast('Failed to update page', 'error');
    } else {
      showToast('Footer visibility updated', 'success');
      fetchPages();
    }
  };

  const deletePage = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc('delete_custom_page', { p_id: deleteTarget.id });
    if (error) {
      showToast('Failed to delete page', 'error');
    } else {
      showToast('Page deleted', 'success');
      fetchPages();
    }
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-light">Pages</h1>
          <p className="text-sm text-surface-light/50">Create and manage custom website pages</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Page
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-card" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-surface-light/30" />
          <p className="text-surface-light/50">No custom pages yet. Click "Add Page" to create one.</p>
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-dark-border bg-dark-hover/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-surface-light/50">Title</th>
                <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell">URL</th>
                <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell">Status</th>
                <th className="hidden px-4 py-3 font-semibold text-surface-light/50 md:table-cell">Footer</th>
                <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell">Updated</th>
                <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-dark-hover/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-surface-light">{page.title}</span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <code className="text-xs text-aqua">/p/{page.slug}</code>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <button
                      onClick={() => togglePublished(page)}
                      className={`badge ${page.published ? 'bg-green-500/10 text-green-400' : 'bg-dark-hover text-surface-light/50'}`}
                    >
                      {page.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {page.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <button
                      onClick={() => toggleFooter(page)}
                      className={`flex h-7 w-7 items-center justify-center rounded-btn ${page.show_in_footer ? 'text-gold' : 'text-surface-light/30'}`}
                      title={page.show_in_footer ? 'Shown in footer' : 'Hidden from footer'}
                    >
                      <Star className={`h-4 w-4 ${page.show_in_footer ? 'fill-gold' : ''}`} />
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-surface-light/50 lg:table-cell">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditPage(page)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-aqua/10 hover:text-aqua"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(page)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editPage || showCreate) && (
        <PageEditModal
          page={editPage}
          onClose={() => { setEditPage(null); setShowCreate(false); }}
          onSaved={() => { setEditPage(null); setShowCreate(false); fetchPages(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Page"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deletePage}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PageEditModal({ page, onClose, onSaved }: { page: CustomPage | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const isCreate = !page;
  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [content, setContent] = useState(page?.content || '');
  const [published, setPublished] = useState(page?.published ?? false);
  const [showInFooter, setShowInFooter] = useState(page?.show_in_footer ?? true);
  const [metaDescription, setMetaDescription] = useState(page?.meta_description || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!page);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);

    const finalSlug = autoSlug ? slugify(title) : slugify(slug);
    if (!finalSlug) {
      setError('URL slug cannot be empty');
      setSaving(false);
      return;
    }

    const { error: err } = await supabase.rpc('upsert_custom_page', {
      p_id: page?.id || null,
      p_title: title.trim(),
      p_slug: finalSlug,
      p_content: content,
      p_published: published,
      p_show_in_footer: showInFooter,
      p_meta_description: metaDescription.trim() || null,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      showToast(isCreate ? 'Page created successfully' : 'Page updated successfully', 'success');
      onSaved();
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={isCreate ? 'Add New Page' : `Edit: ${page!.title}`} size="lg">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Title</label>
          <input type="text" required value={title} onChange={(e) => { setTitle(e.target.value); if (autoSlug) setSlug(slugify(e.target.value)); }} className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-light/50">/p/</span>
            <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }} placeholder={slugify(title) || 'my-page'} className="input-field" />
          </div>
          <p className="mt-1 text-xs text-surface-light/50">The page URL will be /p/{slug || slugify(title) || 'my-page'}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Meta Description (optional)</label>
          <input type="text" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description" className="input-field" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-surface-light">HTML Content</label>
            <span className="text-xs text-surface-light/40">Dangerous scripts are automatically removed on save</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="input-field resize-y font-mono text-xs"
            placeholder="<h1>Welcome</h1>&#10;<p>Enter your page content here...</p>&#10;<ul><li>Item 1</li><li>Item 2</li></ul>"
          />
          <p className="mt-1 text-xs text-surface-light/50">Supports HTML tags: headings, paragraphs, links, images, lists, tables, divs, spans, bold, italic, and more. Script tags, iframes, and event handlers are stripped for security.</p>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
            <input type="checkbox" checked={showInFooter} onChange={(e) => setShowInFooter(e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
            Show in footer
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-dark-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {isCreate ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : isCreate ? 'Create Page' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
