import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Bell, Check, Copy, CreditCard, Clock3, Wallet as WalletIcon, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useWallet } from '@/context/WalletContext';
import type { DepositRequest, WalletNotification, WalletTransaction, WithdrawalRequest } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Modal from '@/components/Modal';

type PaymentMethod = 'bkash' | 'nagad';
type ModalMode = 'deposit' | 'withdraw' | null;

const paymentNames: Record<PaymentMethod, string> = { bkash: 'bKash', nagad: 'Nagad' };

function friendlyError(message?: string) {
  if (message?.includes('already pending')) return 'You already have a pending request.';
  if (message?.includes('already been submitted')) return 'That transaction ID has already been used.';
  if (message?.includes('temporarily restricted')) return 'Deposits are temporarily restricted after a rejection.';
  if (message?.includes('Insufficient')) return 'Your available balance is not enough for this withdrawal.';
  if (message?.includes('outside the allowed')) return 'The amount is outside the current wallet limits.';
  if (message?.includes('Invalid recipient')) return 'Enter a valid Bangladeshi mobile account number.';
  return 'We could not submit your request. Please check the details and try again.';
}

export default function WalletSection() {
  const { wallet, settings, refreshWallet } = useWallet();
  const { showToast } = useToast();
  const [mode, setMode] = useState<ModalMode>(null);
  const [method, setMethod] = useState<PaymentMethod>('bkash');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [notifications, setNotifications] = useState<WalletNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const fetchWalletActivity = useCallback(async () => {
    const [tx, dep, wit, notices] = await Promise.all([
      supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('deposit_requests').select('*').order('submitted_at', { ascending: false }).limit(10),
      supabase.from('withdrawal_requests').select('*').order('submitted_at', { ascending: false }).limit(10),
      supabase.from('wallet_notifications').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    setTransactions((tx.data as WalletTransaction[]) || []);
    setDeposits((dep.data as DepositRequest[]) || []);
    setWithdrawals((wit.data as WithdrawalRequest[]) || []);
    setNotifications((notices.data as WalletNotification[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWalletActivity(); }, [fetchWalletActivity]);

  const pendingDeposit = deposits.find((item) => item.status === 'pending');
  const pendingWithdrawal = withdrawals.find((item) => item.status === 'pending');
  const rejectedDeposit = deposits.find((item) => item.status === 'rejected' && item.restriction_until && new Date(item.restriction_until) > new Date());

  const closeModal = () => {
    setMode(null);
    setAmount(''); setSenderName(''); setTransactionId(''); setRecipientAccount(''); setAccountHolderName('');
  };

  const copyMerchant = async () => {
    if (!settings?.merchant_number) return;
    await navigator.clipboard.writeText(settings.merchant_number);
    showToast('Payment number copied', 'success');
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID();
    const result = mode === 'deposit'
      ? await supabase.rpc('submit_deposit', { p_payment_method: method, p_amount: Number(amount), p_sender_name: senderName, p_transaction_id: transactionId, p_idempotency_key: idempotencyKey })
      : await supabase.rpc('submit_withdrawal', { p_payment_method: method, p_amount: Number(amount), p_recipient_account: recipientAccount, p_account_holder_name: accountHolderName, p_idempotency_key: idempotencyKey });
    setSubmitting(false);
    if (result.error) {
      showToast(friendlyError(result.error.message), 'error');
      return;
    }
    showToast(mode === 'deposit' ? 'Deposit request submitted' : 'Withdrawal request submitted', 'success');
    closeModal();
    await Promise.all([refreshWallet(), fetchWalletActivity()]);
  };

  const statusClass = (status: string) => status === 'completed' || status === 'approved' ? 'bg-green-500/10 text-green-400' : status === 'pending' ? 'bg-gold/10 text-gold' : 'bg-red-500/10 text-red-400';
  const transactionLabel = (type: string) => ({ deposit: 'Deposit', withdrawal: 'Withdrawal', tournament_fee: 'Tournament Entry Fee', prize_money: 'Prize Money', adjustment: 'Wallet Adjustment' }[type] || type);

  return (
    <section id="wallet" className="scroll-mt-24 space-y-6">
      <div className="card overflow-hidden border-gold/20 bg-gradient-to-br from-gold/10 via-dark-card to-dark-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><WalletIcon className="h-7 w-7" /></div>
            <div><p className="text-xs font-semibold tracking-widest text-gold">WALLET BALANCE</p><p className="mt-1 text-3xl font-extrabold text-surface-light">৳ {wallet ? formatCurrency(wallet.balance) : '0.00'}</p><p className="text-sm text-surface-light/50">Available ৳ {wallet ? formatCurrency(wallet.available_balance) : '0.00'}</p></div>
          </div>
          <div className="flex gap-2"><button onClick={() => setMode('deposit')} className="btn-primary flex-1 sm:flex-none"><ArrowDownToLine className="h-4 w-4" /> Deposit</button><button onClick={() => setMode('withdraw')} className="btn-secondary flex-1 border-gold/30 text-gold hover:border-gold/60 sm:flex-none"><ArrowUpFromLine className="h-4 w-4" /> Withdraw</button></div>
        </div>
        {wallet && Number(wallet.reserved_balance) > 0 && <p className="mt-4 text-xs text-gold/80">৳ {formatCurrency(wallet.reserved_balance)} is reserved for a pending withdrawal.</p>}
      </div>

      {(pendingDeposit || pendingWithdrawal || rejectedDeposit) && <div className="card space-y-3 p-5"><h2 className="flex items-center gap-2 font-semibold text-surface-light"><Clock3 className="h-4 w-4 text-gold" /> Request status</h2>{pendingDeposit && <p className="text-sm text-surface-light/70">Deposit of <b className="text-surface-light">৳ {formatCurrency(pendingDeposit.amount)}</b> via {paymentNames[pendingDeposit.payment_method]} is pending. Transaction ID: <span className="font-mono">{pendingDeposit.transaction_id.slice(0, 3)}••••{pendingDeposit.transaction_id.slice(-3)}</span></p>}{pendingWithdrawal && <p className="text-sm text-surface-light/70">Withdrawal of <b className="text-surface-light">৳ {formatCurrency(pendingWithdrawal.amount)}</b> via {paymentNames[pendingWithdrawal.payment_method]} is pending.</p>}{rejectedDeposit && <p className="text-sm text-red-300">Your last deposit was rejected. {rejectedDeposit.rejection_reason || 'You can submit another request after the 24-hour restriction expires.'}</p>}</div>}

      <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-dark-border px-5 py-4"><h2 className="font-semibold text-surface-light">Recent Transactions</h2><span className="text-xs text-surface-light/40">Latest 5</span></div>{loading ? <p className="p-5 text-sm text-surface-light/50">Loading transactions...</p> : transactions.length === 0 ? <p className="p-5 text-sm text-surface-light/50">No wallet transactions yet.</p> : <div className="divide-y divide-dark-border">{transactions.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${item.direction === 'credit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{item.direction === 'credit' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-surface-light">{transactionLabel(item.transaction_type)}</p><p className="text-xs text-surface-light/45">{formatDateTime(item.created_at)}</p></div><div className="text-right"><p className={`text-sm font-semibold ${item.direction === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{item.direction === 'credit' ? '+' : '-'} ৳ {formatCurrency(item.amount)}</p><span className={`badge mt-1 ${statusClass(item.status)}`}>{item.status}</span></div></div>)}</div>}</div>

      {notifications.length > 0 && <div className="card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold text-surface-light"><Bell className="h-4 w-4 text-aqua" /> Wallet notifications</h2><div className="space-y-3">{notifications.slice(0, 3).map((notice) => <div key={notice.id} className="flex gap-3 text-sm"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-surface-light/40" /><div><p className="font-medium text-surface-light">{notice.title}</p><p className="text-surface-light/55">{notice.message}</p></div></div>)}</div></div>}

      <Modal open={!!mode} onClose={closeModal} title={mode === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'} size="md">
        <div className="space-y-5">
          <div><p className="mb-2 text-sm font-medium text-surface-light">Select payment method</p><div className="grid grid-cols-2 gap-3">{(['bkash', 'nagad'] as PaymentMethod[]).map((item) => <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-btn border p-3 text-left transition-all ${method === item ? item === 'bkash' ? 'border-pink-400 bg-pink-500/10 text-pink-300' : 'border-orange-400 bg-orange-500/10 text-orange-300' : 'border-dark-border text-surface-light/60 hover:border-surface-light/30'}`}><span className="block text-lg font-extrabold">{paymentNames[item]}</span><span className="text-xs opacity-70">Mobile financial service</span></button>)}</div></div>
          {mode === 'deposit' ? <form onSubmit={submitRequest} className="space-y-4"><div className="rounded-btn border border-dark-border bg-dark-surface p-4 text-sm text-surface-light/70"><p>Payment number</p><div className="mt-1 flex items-center justify-between gap-3"><b className="text-lg tracking-wide text-surface-light">{settings?.merchant_number || '01318228418'}</b><button type="button" onClick={copyMerchant} className="btn-secondary px-3 py-2 text-xs"><Copy className="h-3.5 w-3.5" /> Copy</button></div><p className="mt-3 text-xs">Use <b className="text-surface-light">Send Money</b>, not Cash Out. Complete the payment first, then enter the details below.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-surface-light/70">Amount (BDT)<input required type="number" min={Number(settings?.min_deposit || 10)} max={Number(settings?.max_deposit || 100000)} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-1" /></label><label className="text-sm text-surface-light/70">Sender name<input required value={senderName} onChange={(e) => setSenderName(e.target.value)} className="input-field mt-1" /></label></div><label className="block text-sm text-surface-light/70">Transaction ID<input required value={transactionId} onChange={(e) => setTransactionId(e.target.value.toUpperCase())} placeholder="Example: DHR7U4B39Z" className="input-field mt-1 font-mono uppercase" /></label><button disabled={submitting || !!pendingDeposit || !!rejectedDeposit} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Submit Deposit Request'}</button></form> : <form onSubmit={submitRequest} className="space-y-4"><div className="rounded-btn bg-dark-surface p-3 text-sm text-surface-light/60">Available balance: <b className="text-surface-light">৳ {wallet ? formatCurrency(wallet.available_balance) : '0.00'}</b></div><label className="block text-sm text-surface-light/70">Amount (BDT)<input required type="number" min={Number(settings?.min_withdrawal || 50)} max={Number(settings?.max_withdrawal || 100000)} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-1" /></label><label className="block text-sm text-surface-light/70">Recipient account number<input required inputMode="numeric" value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} placeholder="01XXXXXXXXX" className="input-field mt-1" /></label><label className="block text-sm text-surface-light/70">Account holder name<input required value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="input-field mt-1" /></label><button disabled={submitting || !!pendingWithdrawal} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Submit Withdrawal Request'}</button></form>}
        </div>
      </Modal>
    </section>
  );
}
