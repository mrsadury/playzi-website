import { useEffect, useState, useCallback } from 'react';
import { Flag, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { GameReport } from '@/types';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/Modal';

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inappropriate Content',
  broken: 'Game Broken',
  spam: 'Spam / Misleading',
  copyright: 'Copyright Violation',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-500 bg-amber-500/10 text-amber-400' },
  reviewed: { label: 'Reviewed', icon: Eye, color: 'bg-blue-50 text-blue-600 bg-blue-500/10 text-blue-400' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'bg-green-500/10 text-green-400 bg-green-500/10 text-green-400' },
  dismissed: { label: 'Dismissed', icon: XCircle, color: 'bg-red-500/10 text-red-400' },
};

export default function AdminReports() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<GameReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<GameReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('game_reports')
      .select('*, games(*)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    let filtered = (data as GameReport[]) || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          (r.reporter_name || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.games?.title || '').toLowerCase().includes(q)
      );
    }
    setReports(filtered);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReportStatus = async (id: string, status: string, notes?: string) => {
    setUpdating(true);
    const payload: Record<string, unknown> = { status };
    if (notes !== undefined) payload.admin_notes = notes;
    const { error } = await supabase.from('game_reports').update(payload).eq('id', id);
    setUpdating(false);
    if (error) {
      showToast('Failed to update report', 'error');
    } else {
      showToast(`Report marked as ${status}`, 'success');
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    }
  };

  const statusCounts = {
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-light text-surface-light">
          <Flag className="h-6 w-6 text-aqua" />
          Game Reports
        </h1>
        <p className="text-sm text-surface-light/50 text-surface-light/60">Review and manage user-submitted game reports</p>
      </div>

      {/* Status summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = key === statusFilter ? statusCounts[key as keyof typeof statusCounts] : reports.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`admin-card p-4 text-left transition-all ${statusFilter === key ? 'ring-2 ring-aqua' : 'hover:border-aqua/30'}`}
            >
              <div className="flex items-center gap-2">
                <config.icon className="h-4 w-4" />
                <span className="text-xs font-medium text-surface-light/50 text-surface-light/60">{config.label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-surface-light text-surface-light">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-light/50/50 text-surface-light/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="input-field pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field cursor-pointer sm:w-44">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Reports table */}
      <div className="admin-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dark-border border-dark-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-surface-light/50 text-surface-light/60">Game</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 sm:table-cell text-surface-light/60">Reason</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell text-surface-light/60">Reporter</th>
              <th className="px-4 py-3 font-semibold text-surface-light/50 text-surface-light/60">Status</th>
              <th className="hidden px-4 py-3 font-semibold text-surface-light/50 lg:table-cell text-surface-light/60">Date</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-light/50 text-surface-light/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle divide-dark-surface">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-light/50 text-surface-light/50">Loading...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-light/50 text-surface-light/50">No reports found</td></tr>
            ) : (
              reports.map((report) => {
                const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={report.id} className="hover:bg-dark-hover/30 hover:bg-black/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-light text-surface-light">{report.games?.title || 'Unknown game'}</p>
                      <p className="text-xs text-surface-light/50 text-surface-light/50 sm:hidden">{REASON_LABELS[report.reason] || report.reason}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-surface-light/50 text-surface-light/60">{REASON_LABELS[report.reason] || report.reason}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-surface-light/50 lg:table-cell text-surface-light/60">{report.reporter_name || 'Anonymous'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusCfg.color}`}>
                        <statusCfg.icon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-surface-light/50 lg:table-cell text-surface-light/60">{formatDate(report.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ''); }}
                        className="btn-secondary text-xs"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Report management modal */}
      <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title="Manage Report" size="md">
        {selectedReport && (
          <div className="space-y-4">
            <div className="rounded-btn bg-dark-hover/50 p-4 bg-black/40">
              <p className="text-sm font-medium text-surface-light text-surface-light">{selectedReport.games?.title || 'Unknown game'}</p>
              <p className="mt-1 text-xs text-surface-light/50 text-surface-light/60">
                Reason: {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
              </p>
              <p className="mt-1 text-xs text-surface-light/50 text-surface-light/60">
                Reporter: {selectedReport.reporter_name || 'Anonymous'}
              </p>
              <p className="mt-1 text-xs text-surface-light/50 text-surface-light/60">
                Date: {formatDate(selectedReport.created_at)}
              </p>
              {selectedReport.description && (
                <p className="mt-2 text-sm text-surface-light text-surface-light">
                  "{selectedReport.description}"
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-light text-surface-light">Admin Notes (internal)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Internal notes about this report..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'reviewed', adminNotes)}
                disabled={updating}
                className="btn-secondary text-xs"
              >
                <Eye className="h-3 w-3" /> Reviewed
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'resolved', adminNotes)}
                disabled={updating}
                className="btn-secondary text-xs !bg-green-500/10 !text-green-400 !bg-green-500/10 !text-green-400"
              >
                <CheckCircle className="h-3 w-3" /> Resolve
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'dismissed', adminNotes)}
                disabled={updating}
                className="btn-secondary text-xs !bg-red-500/10 !text-red-400 !bg-red-500/10 !text-red-400"
              >
                <XCircle className="h-3 w-3" /> Dismiss
              </button>
              <button
                onClick={() => updateReportStatus(selectedReport.id, 'pending', adminNotes)}
                disabled={updating}
                className="btn-secondary text-xs"
              >
                <Clock className="h-3 w-3" /> Reset
              </button>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
