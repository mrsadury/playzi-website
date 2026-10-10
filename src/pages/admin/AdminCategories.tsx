import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, AlertCircle, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';
import { useToast } from '@/context/ToastContext';
import { slugify, formatDate } from '@/lib/utils';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AdminCategories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: catData }, { data: gameData }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('games').select('category_id'),
    ]);
    setCategories((catData as Category[]) || []);
    const c: Record<string, number> = {};
    (gameData || []).forEach((row) => {
      const cid = (row as { category_id: string | null }).category_id;
      if (cid) c[cid] = (c[cid] || 0) + 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleVisible = async (cat: Category) => {
    const { error } = await supabase.from('categories').update({ visible: !cat.visible }).eq('id', cat.id);
    if (error) {
      showToast('Failed to update visibility', 'error');
    } else {
      showToast('Category visibility updated', 'success');
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Failed to delete category. Games will be uncategorized.', 'error');
    } else {
      showToast('Category deleted. Games set to uncategorized.', 'success');
      fetchData();
    }
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-light">Categories</h1>
          <p className="text-sm text-surface-light/50">{categories.length} categories</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border bg-dark-hover/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Name</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell">Slug</th>
              <th className="px-4 py-3 text-center font-semibold text-surface-light/50">Games</th>
              <th className="hidden px-4 py-3 text-center font-semibold text-surface-light/50 md:table-cell">Visible</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell">Created</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-light/50">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-light/50">No categories yet. Categories are auto-created during import.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-dark-hover/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-light">{cat.name}</p>
                    {cat.description && <p className="truncate text-xs text-surface-light/50">{cat.description}</p>}
                  </td>
                  <td className="hidden px-4 py-3 text-surface-light/50 sm:table-cell">{cat.slug}</td>
                  <td className="px-4 py-3 text-center text-surface-light/50">{counts[cat.id] || 0}</td>
                  <td className="hidden px-4 py-3 text-center md:table-cell">
                    <button
                      onClick={() => toggleVisible(cat)}
                      className={`badge ${cat.visible ? 'bg-green-500/10 text-green-400' : 'bg-dark-hover text-surface-light/50'}`}
                    >
                      {cat.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {cat.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-surface-light/50 lg:table-cell">{formatDate(cat.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditCat(cat)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-aqua/10 hover:text-aqua"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(editCat || creating) && (
        <CategoryEditModal
          category={editCat}
          onClose={() => { setEditCat(null); setCreating(false); }}
          onSaved={() => { setEditCat(null); setCreating(false); fetchData(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Games in this category will become uncategorized but won't be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CategoryEditModal({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [description, setDescription] = useState(category?.description || '');
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const finalSlug = slug.trim() || slugify(name);
    setSaving(true);

    if (category) {
      const { error: err } = await supabase
        .from('categories')
        .update({ name: name.trim(), slug: finalSlug, description: description.trim() || null, visible, sort_order: parseInt(sortOrder, 10) || 0 })
        .eq('id', category.id);
      setSaving(false);
      if (err) setError(err.message);
      else { showToast('Category updated', 'success'); onSaved(); }
    } else {
      const { error: err } = await supabase
        .from('categories')
        .insert({ name: name.trim(), slug: finalSlug, description: description.trim() || null, visible, sort_order: parseInt(sortOrder, 10) || 0 });
      setSaving(false);
      if (err) setError(err.message);
      else { showToast('Category created', 'success'); onSaved(); }
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={category ? 'Edit Category' : 'New Category'}>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-btn bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated from name" className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-light">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-light">Sort Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input-field" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-surface-light">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-dark-border accent-aqua" />
            Visible
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-dark-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
