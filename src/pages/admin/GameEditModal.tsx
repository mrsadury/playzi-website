import { useState } from 'react';
import { Save, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, Category } from '@/types';
import { useToast } from '@/context/ToastContext';
import { slugify } from '@/lib/utils';
import Modal from '@/components/Modal';

interface GameEditModalProps {
  game: Game | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function GameEditModal({ game, categories, onClose, onSaved }: GameEditModalProps) {
  const { showToast } = useToast();
  const isCreate = !game;
  const [title, setTitle] = useState(game?.title || '');
  const [description, setDescription] = useState(game?.description || '');
  const [gameUrl, setGameUrl] = useState(game?.game_url || '');
  const [thumbnail, setThumbnail] = useState(game?.thumbnail || '');
  const [gifUrl, setGifUrl] = useState(game?.gif_url || '');
  const [categoryId, setCategoryId] = useState(game?.category_id || '');
  const [tagsStr, setTagsStr] = useState((game?.tags || []).join(', '));
  const [width, setWidth] = useState(String(game?.width || ''));
  const [height, setHeight] = useState(String(game?.height || ''));
  const [featured, setFeatured] = useState(game?.featured || false);
  const [published, setPublished] = useState(game?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !gameUrl.trim()) {
      setError('Title and Game URL are required');
      return;
    }
    setSaving(true);

    const selectedCat = categories.find((c) => c.id === categoryId);
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    const slug = slugify(title) || `game-${Date.now()}`;
    const payload = {
      title: title.trim(),
      slug,
      description: description.trim() || null,
      game_url: gameUrl.trim(),
      thumbnail: thumbnail.trim() || null,
      gif_url: gifUrl.trim() || null,
      category_id: categoryId || null,
      category_name: selectedCat?.name || 'Other',
      tags: tags.length > 0 ? tags : null,
      width: width ? parseInt(width, 10) : null,
      height: height ? parseInt(height, 10) : null,
      featured,
      published,
    };

    if (isCreate) {
      const { error: insertError } = await supabase.from('games').insert({ ...payload, gamemonetize_id: `manual-${Date.now()}`, views: 0 });
      setSaving(false);
      if (insertError) { setError(insertError.message); }
      else { showToast('Game created successfully', 'success'); onSaved(); }
    } else {
      const { error: updateError } = await supabase.from('games').update(payload).eq('id', game!.id);
      setSaving(false);
      if (updateError) { setError(updateError.message); }
      else { showToast('Game updated successfully', 'success'); onSaved(); }
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={isCreate ? 'Add New Game' : `Edit: ${game!.title}`} size="lg">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Game URL (iframe embed link)</label>
          <input type="url" required value={gameUrl} onChange={(e) => setGameUrl(e.target.value)} placeholder="https://..." className="input-field" />
          <p className="mt-1 text-xs text-surface-light/50">Direct URL to the game that can be loaded in an iframe.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Thumbnail / Logo URL</label>
          <input type="url" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." className="input-field" />
          <p className="mt-1 text-xs text-surface-light/50">Static image URL for the game card thumbnail.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">GIF Preview URL (optional)</label>
          <input type="url" value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="https://..." className="input-field" />
          <p className="mt-1 text-xs text-surface-light/50">Animated GIF that plays on hover (desktop) or tap (mobile). Lazy-loaded only when needed.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field cursor-pointer">
              <option value="">Uncategorized</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Tags (comma-separated)</label>
            <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Width</label>
            <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="800" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Height</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="600" className="input-field" />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-surface-light">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
            Published
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-dark-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {isCreate ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : isCreate ? 'Add Game' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
