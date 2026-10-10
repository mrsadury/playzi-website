import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Star, Eye, Edit3, Trash2, CheckCircle2, XCircle, Plus, Trash, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Game, Category } from '@/types';
import { useToast } from '@/context/ToastContext';
import { formatNumber, formatDate, getImageFallback } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import GameEditModal from './GameEditModal';

const PER_PAGE = 20;

export default function AdminGames() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState(0);
  const [deleteAllText, setDeleteAllText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const q = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(total / PER_PAGE);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const fetchGames = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('games').select('*', { count: 'exact' });

    if (q) query = query.ilike('title', `%${q}%`);
    if (categoryFilter) {
      const cat = categories.find((c) => c.slug === categoryFilter);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (statusFilter === 'published') query = query.eq('published', true);
    if (statusFilter === 'unpublished') query = query.eq('published', false);
    if (statusFilter === 'featured') query = query.eq('featured', true);

    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    const { data, count } = await query;
    setGames((data as Game[]) || []);
    setTotal(count || 0);
    setSelected(new Set());
    setLoading(false);
  }, [q, categoryFilter, statusFilter, page, categories]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === games.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(games.map((g) => g.id)));
    }
  };

  const updateGameField = async (game: Game, field: 'published' | 'featured', value: boolean) => {
    const { error } = await supabase.from('games').update({ [field]: value }).eq('id', game.id);
    if (error) {
      showToast(`Failed to update ${field}`, 'error');
    } else {
      showToast(`Game ${field} updated`, 'success');
      fetchGames();
    }
  };

  const deleteGame = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('games').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Failed to delete game', 'error');
    } else {
      showToast('Game deleted', 'success');
      fetchGames();
    }
    setDeleteTarget(null);
  };

  const bulkUpdate = async (field: 'published' | 'featured', value: boolean) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('games').update({ [field]: value }).in('id', ids);
    if (error) {
      showToast(`Bulk update failed`, 'error');
    } else {
      showToast(`${ids.length} games updated`, 'success');
      fetchGames();
    }
  };

  const deleteAllGames = async () => {
    setDeletingAll(true);
    const { data, error } = await supabase.rpc('delete_all_games');
    setDeletingAll(false);
    setDeleteAllConfirm(false);
    setDeleteAllStep(0);
    setDeleteAllText('');
    if (error) {
      showToast('Failed to delete all games: ' + error.message, 'error');
    } else {
      showToast(`${data} games deleted successfully`, 'success');
      fetchGames();
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('games').delete().in('id', ids);
    if (error) {
      showToast('Bulk delete failed', 'error');
    } else {
      showToast(`${ids.length} games deleted`, 'success');
      fetchGames();
    }
    setBulkDeleteConfirm(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-light">Games Management</h1>
          <p className="text-sm text-surface-light/50">{total} total games</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDeleteAllConfirm(true)} className="btn-danger text-sm">
            <Trash className="h-4 w-4" />
            Delete All
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Game
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50" />
          <input
            type="text"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search by title..."
            className="input-field pl-9"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => updateParam('category', e.target.value)} className="input-field cursor-pointer sm:w-44">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => updateParam('status', e.target.value)} className="input-field cursor-pointer sm:w-40">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-btn bg-aqua/5 px-4 py-3">
          <span className="text-sm font-medium text-surface-light">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => bulkUpdate('published', true)} className="btn-secondary text-xs">Publish</button>
            <button onClick={() => bulkUpdate('published', false)} className="btn-secondary text-xs">Unpublish</button>
            <button onClick={() => bulkUpdate('featured', true)} className="btn-secondary text-xs">Feature</button>
            <button onClick={() => bulkUpdate('featured', false)} className="btn-secondary text-xs">Unfeature</button>
            <button onClick={() => setBulkDeleteConfirm(true)} className="btn-danger text-xs">Delete</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border bg-dark-hover/50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === games.length && games.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-dark-border accent-aqua"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-surface-light/50">Game</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 md:table-cell">Category</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell">Status</th>
              <th className="hidden px-4 py-3 text-right font-semibold text-surface-light/50 lg:table-cell">Views</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-light/50">Loading...</td></tr>
            ) : games.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-light/50">No games found</td></tr>
            ) : (
              games.map((game) => (
                <tr key={game.id} className="hover:bg-dark-hover/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(game.id)}
                      onChange={() => toggleSelect(game.id)}
                      className="h-4 w-4 cursor-pointer rounded border-dark-border accent-aqua"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={game.thumbnail || getImageFallback(game.title)}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = getImageFallback(game.title); }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-surface-light">{game.title}</p>
                        <p className="truncate text-xs text-surface-light/50">ID: {game.gamemonetize_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-surface-light/50">{game.category_name}</span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => updateGameField(game, 'published', !game.published)}
                        className={`badge ${game.published ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                      >
                        {game.published ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {game.published ? 'Published' : 'Hidden'}
                      </button>
                      <button
                        onClick={() => updateGameField(game, 'featured', !game.featured)}
                        className={`badge ${game.featured ? 'bg-gold/15 text-gold' : 'bg-dark-hover text-surface-light/50'}`}
                      >
                        <Star className="h-3 w-3" />
                        {game.featured ? 'Featured' : 'Not featured'}
                      </button>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-surface-light/50 lg:table-cell">
                    <span className="flex items-center justify-end gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {formatNumber(game.views)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-surface-light/50 lg:table-cell">
                    {formatDate(game.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditGame(game)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-aqua/10 hover:text-aqua"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(game)}
                        className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <button onClick={() => updateParam('page', String(page - 1))} className="btn-secondary text-sm">Prev</button>
          )}
          <span className="text-sm text-surface-light/50">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => updateParam('page', String(page + 1))} className="btn-secondary text-sm">Next</button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Game"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteGame}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        title="Delete Selected Games"
        message={`Are you sure you want to delete ${selected.size} game${selected.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        danger
        onConfirm={bulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {editGame && (
        <GameEditModal
          game={editGame}
          categories={categories}
          onClose={() => setEditGame(null)}
          onSaved={() => { setEditGame(null); fetchGames(); }}
        />
      )}

      {/* Delete All Games confirmation */}
      <Modal open={deleteAllConfirm} onClose={() => { setDeleteAllConfirm(false); setDeleteAllStep(0); setDeleteAllText(''); }} title="Delete ALL Games" size="sm">
        <div className="space-y-4">
          {deleteAllStep === 0 ? (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-surface-light text-surface-light">This will permanently delete ALL {total} games.</p>
                  <p className="text-xs text-surface-light/50 text-surface-light/60">
                    This action removes every game record and all associated view data. User accounts, reports, categories, and settings will NOT be affected. This cannot be undone.
                  </p>
                </div>
              </div>
              <button onClick={() => setDeleteAllStep(1)} className="btn-danger w-full">
                I understand, continue
              </button>
              <button onClick={() => { setDeleteAllConfirm(false); setDeleteAllStep(0); }} className="btn-secondary w-full">
                Cancel
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-surface-light text-surface-light">
                Type <code className="rounded bg-dark-hover px-1.5 py-0.5 font-mono text-red-400 bg-black">DELETE ALL</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteAllText}
                onChange={(e) => setDeleteAllText(e.target.value)}
                placeholder="DELETE ALL"
                className="input-field"
                autoFocus
              />
              <button
                onClick={deleteAllGames}
                disabled={deleteAllText !== 'DELETE ALL' || deletingAll}
                className="btn-danger w-full"
              >
                {deletingAll ? 'Deleting...' : 'Permanently Delete All Games'}
              </button>
              <button onClick={() => { setDeleteAllConfirm(false); setDeleteAllStep(0); setDeleteAllText(''); }} className="btn-secondary w-full">
                Cancel
              </button>
            </>
          )}
        </div>
      </Modal>

      {showCreate && (
        <GameEditModal
          game={null}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchGames(); }}
        />
      )}
    </div>
  );
}
