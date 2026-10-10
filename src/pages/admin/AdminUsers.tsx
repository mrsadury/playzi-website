import { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, Search, Ban, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/Modal';

const PER_PAGE = 20;

export default function AdminUsers() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const totalPages = Math.ceil(total / PER_PAGE);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (search.trim()) {
      query = query.ilike('username', `%${search.trim()}%`);
    }
    if (statusFilter === 'suspended') {
      query = query.eq('is_suspended', true);
    } else if (statusFilter === 'active') {
      query = query.eq('is_suspended', false);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    const { data, count } = await query;
    setUsers((data as AdminUser[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [search, page, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(true);
    const newSuspended = !suspendTarget.is_suspended;
    const payload: Record<string, unknown> = {
      is_suspended: newSuspended,
      suspended_reason: newSuspended ? suspendReason.trim() || null : null,
      suspended_at: newSuspended ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', suspendTarget.id);
    setActionLoading(false);
    if (error) {
      showToast('Failed to update user status', 'error');
    } else {
      showToast(newSuspended ? 'User suspended' : 'User reactivated', 'success');
      setSuspendTarget(null);
      setSuspendReason('');
      fetchUsers();
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-light text-surface-light">
          <UsersIcon className="h-6 w-6 text-aqua" />
          User Management
        </h1>
        <p className="text-sm text-surface-light/50 text-surface-light/60">{total} registered users</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50 text-surface-light/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username..."
            className="input-field pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field cursor-pointer sm:w-40">
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users table */}
      <div className="admin-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border border-dark-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-surface-light/50 text-surface-light/60">User</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell text-surface-light/60">Status</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell text-surface-light/60">Joined</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50 text-surface-light/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle divide-dark-surface">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-light/50 text-surface-light/50">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-surface-light/50 text-surface-light/50">No users found</td></tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isAdminUser = u.id === '01514308-0d77-4cce-93e6-ebaa11e24425';
                return (
                  <tr key={u.id} className="hover:bg-dark-hover/30 hover:bg-black/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-aqua text-sm font-bold text-dark-bg">
                            {(u.username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-surface-light text-surface-light">{u.username || 'Unknown'}</p>
                            {isAdminUser && (
                              <span className="badge bg-aqua/15 text-aqua bg-aqua/20 text-aqua">
                                <Shield className="h-3 w-3" /> Admin
                              </span>
                            )}
                          </div>
                          {u.bio && <p className="truncate text-xs text-surface-light/50 text-surface-light/50">{u.bio}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {u.is_suspended ? (
                        <span className="badge bg-red-500/10 text-red-400">
                          <Ban className="h-3 w-3" /> Suspended
                        </span>
                      ) : (
                        <span className="badge bg-green-500/10 text-green-400 bg-green-500/10 text-green-400">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-surface-light/50 lg:table-cell text-surface-light/60">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf || isAdminUser ? (
                        <span className="text-xs text-surface-light/50 text-surface-light/40">Cannot modify</span>
                      ) : (
                        <button
                          onClick={() => { setSuspendTarget(u); setSuspendReason(u.suspended_reason || ''); }}
                          className={u.is_suspended ? 'btn-secondary text-xs !bg-green-500/10 !text-green-400 !bg-green-500/10 !text-green-400' : 'btn-danger text-xs'}
                        >
                          {u.is_suspended ? (
                            <><CheckCircle className="h-3 w-3" /> Reactivate</>
                          ) : (
                            <><Ban className="h-3 w-3" /> Suspend</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <button onClick={() => setPage(page - 1)} className="btn-secondary text-sm">Prev</button>
          )}
          <span className="text-sm text-surface-light/50 text-surface-light/60">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => setPage(page + 1)} className="btn-secondary text-sm">Next</button>
          )}
        </div>
      )}

      {/* Suspend/Reactivate modal */}
      <Modal open={!!suspendTarget} onClose={() => { setSuspendTarget(null); setSuspendReason(''); }} title={suspendTarget?.is_suspended ? 'Reactivate User' : 'Suspend User'} size="sm">
        {suspendTarget && (
          <div className="space-y-4">
            {!suspendTarget.is_suspended && (
              <>
                <p className="text-sm text-surface-light/50 text-surface-light/60">
                  Suspending <span className="font-medium text-surface-light text-surface-light">{suspendTarget.username}</span> will block their access to the site. You can reactivate them at any time.
                </p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-surface-light text-surface-light">Reason (optional)</label>
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Reason for suspension..."
                  />
                </div>
              </>
            )}
            {suspendTarget.is_suspended && (
              <p className="text-sm text-surface-light/50 text-surface-light/60">
                Reactivate <span className="font-medium text-surface-light text-surface-light">{suspendTarget.username}</span>? They will regain full access to the site.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="btn-secondary">Cancel</button>
              <button onClick={toggleSuspend} disabled={actionLoading} className={suspendTarget.is_suspended ? 'btn-primary' : 'btn-danger'}>
                {actionLoading ? 'Processing...' : suspendTarget.is_suspended ? 'Reactivate' : 'Suspend User'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
