import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock3, CreditCard, Settings, Wallet as WalletIcon, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { DepositRequest, WithdrawalRequest, WalletSettings } from '@/types';
import Modal from '@/components/Modal';

type QueueItem = { kind: 'deposit' | 'withdrawal'; id: string; amount: number | string; user_id: string; payment_method: 'bkash' | 'nagad'; submitted_at: string; status: string; sender_name?: string; transaction_id?: string; recipient_account?: string; account_holder_name?: string };

export default function AdminWallet() {
  const { showToast } = useToast();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [minDeposit, setMinDeposit] = useState('10');
  const [maxDeposit, setMaxDeposit] = useState('100000');
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [maxWithdrawal, setMaxWithdrawal] = useState('100000');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [depositResult, withdrawalResult, settingsResult] = await Promise.all([
      supabase.from('deposit_requests').select('*').order('submitted_at', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').order('submitted_at', { ascending: false }),
      supabase.from('wallet_settings').select('*').maybeSingle(),
    ]);
    setDeposits((depositResult.data as DepositRequest[]) || []);
    setWithdrawals((withdrawalResult.data as WithdrawalRequest[]) || []);
    if (settingsResult.data) {
      const current = settingsResult.data as WalletSettings;
      setSettings(current); setMerchant(current.merchant_number); setMinDeposit(String(current.min_deposit)); setMaxDeposit(String(current.max_deposit)); setMinWithdrawal(String(current.min_withdrawal)); setMaxWithdrawal(String(current.max_withdrawal));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const review = async (decision: 'approved' | 'rejected') => {
    if (!selected || saving) return;
    if (decision === 'rejected' && !reason.trim()) { showToast('Add a rejection reason first', 'error'); return; }
    setSaving(true);
    const result = selected.kind === 'deposit'
      ? await supabase.rpc('review_deposit', { p_request_id: selected.id, p_decision: decision, p_rejection_reason: reason })
      : await supabase.rpc('review_withdrawal', { p_request_id: selected.id, p_decision: decision, p_rejection_reason: reason });
    setSaving(false);
    if (result.error) { showToast('The request could not be updated', 'error'); return; }
    showToast(`Request ${decision}`, 'success'); setSelected(null); setReason(''); fetchData();
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const result = await supabase.rpc('update_wallet_settings', { p_merchant_number: merchant, p_min_deposit: Number(minDeposit), p_max_deposit: Number(maxDeposit), p_min_withdrawal: Number(minWithdrawal), p_max_withdrawal: Number(maxWithdrawal) });
    setSaving(false);
    if (result.error) showToast('Wallet settings could not be saved', 'error'); else showToast('Wallet settings saved', 'success');
  };

  const pendingDeposits = deposits.filter((item) => item.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((item) => item.status === 'pending');
  const openRequest = (kind: QueueItem['kind'], item: DepositRequest | WithdrawalRequest) => setSelected({ kind, id: item.id, amount: item.amount, user_id: item.user_id, payment_method: item.payment_method, submitted_at: item.submitted_at, status: item.status, ...(kind === 'deposit' ? { sender_name: (item as DepositRequest).sender_name, transaction_id: (item as DepositRequest).transaction_id } : { recipient_account: (item as WithdrawalRequest).recipient_account, account_holder_name: (item as WithdrawalRequest).account_holder_name }) });

  return <div>
    <div className="mb-6"><h1 className="flex items-center gap-2 text-2xl font-bold text-surface-light"><WalletIcon className="h-6 w-6 text-gold" /> Wallet Management</h1><p className="text-sm text-surface-light/50">Verify deposits, confirm payouts, and configure wallet limits.</p></div>
    <div className="mb-6 grid grid-cols-2 gap-4"><div className="admin-card p-5"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-gold" /><div><p className="text-2xl font-bold text-surface-light">{pendingDeposits.length}</p><p className="text-xs text-surface-light/50">Pending deposits</p></div></div></div><div className="admin-card p-5"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-gold" /><div><p className="text-2xl font-bold text-surface-light">{pendingWithdrawals.length}</p><p className="text-xs text-surface-light/50">Pending withdrawals</p></div></div></div></div>
    <div className="mb-6 grid gap-6 xl:grid-cols-2">
      <Queue title="Deposit requests" items={deposits} loading={loading} onOpen={(item) => openRequest('deposit', item)} kind="deposit" />
      <Queue title="Withdrawal requests" items={withdrawals} loading={loading} onOpen={(item) => openRequest('withdrawal', item)} kind="withdrawal" />
    </div>
    <form onSubmit={saveSettings} className="admin-card p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold text-surface-light"><Settings className="h-4 w-4 text-aqua" /> Wallet settings</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-sm text-surface-light/70">Merchant number<input required value={merchant} onChange={(e) => setMerchant(e.target.value)} className="input-field mt-1" /></label><label className="text-sm text-surface-light/70">Min deposit<input required type="number" min="1" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} className="input-field mt-1" /></label><label className="text-sm text-surface-light/70">Max deposit<input required type="number" min="1" value={maxDeposit} onChange={(e) => setMaxDeposit(e.target.value)} className="input-field mt-1" /></label><label className="text-sm text-surface-light/70">Min withdrawal<input required type="number" min="1" value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} className="input-field mt-1" /></label><label className="text-sm text-surface-light/70">Max withdrawal<input required type="number" min="1" value={maxWithdrawal} onChange={(e) => setMaxWithdrawal(e.target.value)} className="input-field mt-1" /></label></div><button disabled={saving || !settings} className="btn-primary mt-4">Save wallet settings</button></form>
    <Modal open={!!selected} onClose={() => { setSelected(null); setReason(''); }} title="Review wallet request" size="sm">{selected && <div className="space-y-4"><div className="rounded-btn bg-dark-surface p-4 text-sm"><p className="font-semibold text-surface-light">{selected.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} · {selected.payment_method === 'bkash' ? 'bKash' : 'Nagad'}</p><p className="mt-2 text-surface-light/70">Amount: <b className="text-surface-light">৳ {formatCurrency(selected.amount)}</b></p><p className="text-surface-light/70">User ID: <span className="font-mono text-xs">{selected.user_id}</span></p><p className="text-surface-light/70">Submitted: {formatDateTime(selected.submitted_at)}</p>{selected.transaction_id && <p className="text-surface-light/70">Transaction ID: <b className="font-mono text-surface-light">{selected.transaction_id}</b></p>}{selected.sender_name && <p className="text-surface-light/70">Sender: {selected.sender_name}</p>}{selected.recipient_account && <p className="text-surface-light/70">Recipient: {selected.recipient_account} · {selected.account_holder_name}</p>}</div><label className="block text-sm text-surface-light/70">Rejection reason (required when rejecting)<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input-field mt-1" /></label><div className="flex justify-end gap-2"><button disabled={saving} onClick={() => review('rejected')} className="btn-danger"><XCircle className="h-4 w-4" /> Reject</button><button disabled={saving} onClick={() => review('approved')} className="btn-primary"><CheckCircle className="h-4 w-4" /> Approve</button></div></div>}</Modal>
  </div>;
}

function Queue({ title, items, loading, onOpen, kind }: { title: string; items: Array<DepositRequest | WithdrawalRequest>; loading: boolean; onOpen: (item: DepositRequest | WithdrawalRequest) => void; kind: 'deposit' | 'withdrawal' }) {
  return <div className="admin-card overflow-hidden"><div className="border-b border-dark-border px-5 py-4"><h2 className="font-semibold text-surface-light">{title}</h2></div>{loading ? <p className="p-5 text-sm text-surface-light/50">Loading...</p> : items.length === 0 ? <p className="p-5 text-sm text-surface-light/50">No requests yet.</p> : <div className="divide-y divide-dark-border">{items.slice(0, 20).map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-surface-light">৳ {formatCurrency(item.amount)} · {item.payment_method === 'bkash' ? 'bKash' : 'Nagad'}</p><p className="truncate text-xs text-surface-light/45">{kind === 'deposit' ? (item as DepositRequest).transaction_id : (item as WithdrawalRequest).recipient_account}</p><p className="text-xs text-surface-light/45">{formatDateTime(item.submitted_at)}</p></div><span className={`badge ${item.status === 'pending' ? 'bg-gold/10 text-gold' : item.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{item.status}</span>{item.status === 'pending' && <button onClick={() => onOpen(item)} className="btn-secondary px-3 py-2 text-xs">Review</button>}</div>)}</div>}</div>;
}
