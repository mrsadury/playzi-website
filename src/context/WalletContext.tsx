import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Wallet, WalletSettings } from '@/types';

interface WalletContextValue {
  wallet: Wallet | null;
  settings: WalletSettings | null;
  loading: boolean;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setSettings(null);
      return;
    }

    setLoading(true);
    await supabase.rpc('get_or_create_wallet');
    const [walletResult, settingsResult] = await Promise.all([
      supabase
        .from('wallets')
        .select('id, user_id, balance, reserved_balance, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('wallet_settings').select('*').maybeSingle(),
    ]);

    if (!walletResult.error && walletResult.data) {
      const record = walletResult.data as Omit<Wallet, 'available_balance'>;
      setWallet({ ...record, available_balance: Number(record.balance) - Number(record.reserved_balance) });
    }
    if (!settingsResult.error && settingsResult.data) {
      setSettings(settingsResult.data as WalletSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshWallet();
    if (!user) return;

    const interval = window.setInterval(refreshWallet, 30000);
    const handleFocus = () => refreshWallet();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshWallet, user]);

  return (
    <WalletContext.Provider value={{ wallet, settings, loading, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}