/*
# PLAYZI Wallet Schema and Access Rules

1. New Tables
- `wallets` stores one server-controlled total balance and reserved withdrawal amount per authenticated user.
- `wallet_transactions` is the permanent financial ledger for deposits, withdrawals, tournament fees, prize credits, and adjustments.
- `deposit_requests` stores normalized bKash and Nagad deposit claims and their review status.
- `withdrawal_requests` stores payout requests and recipient details while funds are reserved.
- `wallet_settings` stores configurable merchant number and minimum/maximum limits.
- `wallet_notifications` stores durable wallet status messages.

2. Modified Tables
- Adds optional `profiles.full_name` for the existing profile display and editing flow.

3. Security
- Enables RLS on every new table. Authenticated users can read only their own wallet records; administrators can review all requests.
- Direct financial inserts, updates, and deletes are denied. Wallet changes will be performed by authenticated, admin-checked server functions in the companion migration.
- Transaction IDs are normalized and unique. Partial unique indexes enforce one pending deposit and one pending withdrawal per user.

4. Important Notes
- The supplied merchant number is the initial configurable value.
- No money or sample transactions are inserted.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reserved_balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0 AND reserved_balance <= balance),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'tournament_fee', 'prize_money', 'adjustment')),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reference_type text,
  reference_id uuid,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('bkash', 'nagad')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  sender_name text NOT NULL,
  transaction_id text NOT NULL,
  transaction_id_normalized text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  restriction_until timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key uuid,
  created_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('bkash', 'nagad')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  recipient_account text NOT NULL,
  account_holder_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key uuid,
  created_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wallet_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_number text NOT NULL DEFAULT '01318228418',
  min_deposit numeric(12,2) NOT NULL DEFAULT 10 CHECK (min_deposit > 0),
  max_deposit numeric(12,2) NOT NULL DEFAULT 100000 CHECK (max_deposit >= min_deposit),
  min_withdrawal numeric(12,2) NOT NULL DEFAULT 50 CHECK (min_withdrawal > 0),
  max_withdrawal numeric(12,2) NOT NULL DEFAULT 100000 CHECK (max_withdrawal >= min_withdrawal),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status_created ON deposit_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_created ON deposit_requests(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_created ON withdrawal_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_created ON withdrawal_requests(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_notifications_user_created ON wallet_notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_transaction_id_normalized ON deposit_requests(transaction_id_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_pending_per_user ON deposit_requests(user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_pending_per_user ON withdrawal_requests(user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_idempotency ON deposit_requests(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_idempotency ON withdrawal_requests(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_settings_singleton ON wallet_settings ((true));

INSERT INTO wallet_settings (merchant_number, min_deposit, max_deposit, min_withdrawal, max_withdrawal)
SELECT '01318228418', 10, 100000, 50, 100000
WHERE NOT EXISTS (SELECT 1 FROM wallet_settings);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON wallets, wallet_transactions, deposit_requests, withdrawal_requests, wallet_notifications TO authenticated;
GRANT SELECT ON wallet_settings TO authenticated;
GRANT UPDATE (read_at) ON wallet_notifications TO authenticated;

DROP POLICY IF EXISTS "Users and admins read wallets" ON wallets;
CREATE POLICY "Users and admins read wallets" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Wallet inserts are server only" ON wallets;
CREATE POLICY "Wallet inserts are server only" ON wallets FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Wallet updates are server only" ON wallets;
CREATE POLICY "Wallet updates are server only" ON wallets FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Wallet deletes are server only" ON wallets;
CREATE POLICY "Wallet deletes are server only" ON wallets FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users and admins read wallet transactions" ON wallet_transactions;
CREATE POLICY "Users and admins read wallet transactions" ON wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Ledger inserts are server only" ON wallet_transactions;
CREATE POLICY "Ledger inserts are server only" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Ledger updates are server only" ON wallet_transactions;
CREATE POLICY "Ledger updates are server only" ON wallet_transactions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Ledger deletes are server only" ON wallet_transactions;
CREATE POLICY "Ledger deletes are server only" ON wallet_transactions FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users and admins read deposit requests" ON deposit_requests;
CREATE POLICY "Users and admins read deposit requests" ON deposit_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Deposit inserts are server only" ON deposit_requests;
CREATE POLICY "Deposit inserts are server only" ON deposit_requests FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Deposit updates are server only" ON deposit_requests;
CREATE POLICY "Deposit updates are server only" ON deposit_requests FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Deposit deletes are server only" ON deposit_requests;
CREATE POLICY "Deposit deletes are server only" ON deposit_requests FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users and admins read withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Users and admins read withdrawal requests" ON withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Withdrawal inserts are server only" ON withdrawal_requests;
CREATE POLICY "Withdrawal inserts are server only" ON withdrawal_requests FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Withdrawal updates are server only" ON withdrawal_requests;
CREATE POLICY "Withdrawal updates are server only" ON withdrawal_requests FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Withdrawal deletes are server only" ON withdrawal_requests;
CREATE POLICY "Withdrawal deletes are server only" ON withdrawal_requests FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Authenticated users read wallet settings" ON wallet_settings;
CREATE POLICY "Authenticated users read wallet settings" ON wallet_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Wallet settings inserts are server only" ON wallet_settings;
CREATE POLICY "Wallet settings inserts are server only" ON wallet_settings FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Wallet settings updates are server only" ON wallet_settings;
CREATE POLICY "Wallet settings updates are server only" ON wallet_settings FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Wallet settings deletes are server only" ON wallet_settings;
CREATE POLICY "Wallet settings deletes are server only" ON wallet_settings FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users and admins read wallet notifications" ON wallet_notifications;
CREATE POLICY "Users and admins read wallet notifications" ON wallet_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Notifications are server created" ON wallet_notifications;
CREATE POLICY "Notifications are server created" ON wallet_notifications FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Users mark own notifications read" ON wallet_notifications;
CREATE POLICY "Users mark own notifications read" ON wallet_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Notifications cannot be deleted" ON wallet_notifications;
CREATE POLICY "Notifications cannot be deleted" ON wallet_notifications FOR DELETE TO authenticated USING (false);
