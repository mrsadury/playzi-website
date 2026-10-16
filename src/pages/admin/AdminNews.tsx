import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/types';
import { useToast } from '@/context/ToastContext';
import { slugify, formatDate, getImageFallback } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AdminNews() {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsArticle | null>(null);

  // Editor form state
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Failed to load news', 'error');
    } else {
      setArticles((data as NewsArticle[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const openEditor = (article?: NewsArticle) => {
    if (article) {
      setEditingArticle(article);
      setTitle(article.title);
      setExcerpt(article.excerpt || '');
      setContent(article.content);
      setImageUrl(article.image_url || '');
      setAuthor(article.author || '');
      setPublished(article.published);
      setFeatured(article.featured);
    } else {
      setEditingArticle(null);
      setTitle('');
      setExcerpt('');
      setContent('');
      setImageUrl('');
      setAuthor('');
      setPublished(true);
      setFeatured(false);
    }
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }
    setSaving(true);

    const articleSlug = slugify(title);
    const payload = {
      title: title.trim(),
      slug: articleSlug,
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      author: author.trim() || null,
      published,
      featured,
    };

    let error;
    if (editingArticle) {
      ({ error } = await supabase.from('news').update(payload).eq('id', editingArticle.id));
    } else {
      ({ error } = await supabase.from('news').insert(payload));
    }

    setSaving(false);
    if (error) {
      showToast(
        error.message.includes('duplicate')
          ? 'A news article with this title already exists'
          : 'Failed to save article',
        'error',
      );
    } else {
      showToast(editingArticle ? 'Article updated' : 'Article created', 'success');
      closeEditor();
      fetchNews();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('news').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Failed to delete article', 'error');
    } else {
      showToast('Article deleted', 'success');
      fetchNews();
    }
    setDeleteTarget(null);
  };

  const togglePublished = async (article: NewsArticle) => {
    const { error } = await supabase.from('news').update({ published: !article.published }).eq('id', article.id);
    if (error) {
      showToast('Failed to update', 'error');
    } else {
      showToast(article.published ? 'Unpublished' : 'Published', 'success');
      fetchNews();
    }
  };

  const filtered = articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-light">News Articles</h1>
          <p className="text-sm text-surface-light/50">Manage news displayed on the homepage</p>
        </div>
        <button onClick={() => openEditor()} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Article
        </button>
      </div>

      <div className="mb-6 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="input-field w-full pl-9"
        />
      </div>

      {loading ? (
        <div className="shimmer h-48 rounded-card" />
      ) : filtered.length === 0 ? (
        <div className="admin-card p-8 text-center text-sm text-surface-light/50">
          {articles.length === 0 ? 'No news articles yet. Create one to get started.' : 'No articles match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <div key={article.id} className="admin-card flex items-center gap-4 p-3">
              <img
                src={article.image_url || getImageFallback(article.title)}
                alt=""
                className="h-16 w-24 shrink-0 rounded object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(article.title); }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-surface-light">{article.title}</p>
                  {article.featured && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">FEATURED</span>
                  )}
                  {!article.published && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">DRAFT</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-surface-light/40">
                  {formatDate(article.created_at)}
                  {article.author && ` · ${article.author}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => togglePublished(article)}
                  className="flex h-9 w-9 items-center justify-center rounded-btn text-surface-light/60 transition-colors hover:bg-dark-hover hover:text-aqua"
                  title={article.published ? 'Unpublish' : 'Publish'}
                >
                  {article.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEditor(article)}
                  className="flex h-9 w-9 items-center justify-center rounded-btn text-surface-light/60 transition-colors hover:bg-dark-hover hover:text-aqua"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(article)}
                  className="flex h-9 w-9 items-center justify-center rounded-btn text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showEditor} onClose={closeEditor} title={editingArticle ? 'Edit Article' : 'New Article'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Excerpt (optional)</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary shown in news cards"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="input-field resize-y"
              placeholder="Full article content..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Image URL (optional)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light">Author (optional)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                className="input-field"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-surface-light">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 accent-aqua"
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-surface-light">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
              Featured
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeEditor} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Article'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
