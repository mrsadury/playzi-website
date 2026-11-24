/*
# PLAYZI Wallet Admin Audit Fields

1. Modified Tables
- Adds previous and new balance snapshots, administrator identity, and related request identity to ledger rows.
- Adds an optional outgoing payout transaction ID to withdrawal requests.

2. Security
- These fields are written only by wallet SECURITY DEFINER functions; authenticated clients receive no direct write grant for financial tables.
- Existing RLS and administrator checks remain in force.
*/

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS previous_balance numeric(12,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS new_balance numeric(12,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS related_request_id uuid;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payout_transaction_id text;
