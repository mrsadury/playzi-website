/*
# PLAYZI Wallet Input Validation Hardening

1. Changes
- Tightens deposit and withdrawal RPC validation for null or blank sender names, transaction IDs, and account holder names.
- Tightens wallet settings validation for null or blank merchant numbers.

2. Security
- These checks run inside the server functions, so callers cannot bypass required-field validation by calling the database API directly.
- No balances, requests, or ledger records are modified by this migration.
*/

CREATE OR REPLACE FUNCTION submit_deposit(
  p_payment_method text,
  p_amount numeric,
  p_sender_name text,
  p_transaction_id text,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_transaction_id uuid;
  v_normalized_id text;
  v_restriction_until timestamptz;
  v_min numeric;
  v_max numeric;
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT dr.id INTO v_existing_id FROM deposit_requests AS dr WHERE dr.user_id = v_user_id AND dr.idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
  END IF;
  IF p_payment_method NOT IN ('bkash', 'nagad') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid deposit amount'; END IF;
  IF p_sender_name IS NULL OR length(trim(p_sender_name)) < 2 OR length(trim(p_sender_name)) > 120 THEN RAISE EXCEPTION 'Invalid sender name'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN RAISE EXCEPTION 'Transaction ID is required'; END IF;
  v_normalized_id := upper(regexp_replace(trim(p_transaction_id), '\s+', '', 'g'));
  IF v_normalized_id !~ '^[A-Z0-9]{8,20}$' THEN RAISE EXCEPTION 'Invalid transaction ID'; END IF;
  SELECT ws.min_deposit, ws.max_deposit INTO v_min, v_max FROM wallet_settings AS ws LIMIT 1;
  IF p_amount < v_min OR p_amount > v_max THEN RAISE EXCEPTION 'Deposit amount is outside the allowed limits'; END IF;
  IF EXISTS (SELECT 1 FROM deposit_requests AS dr WHERE dr.user_id = v_user_id AND dr.status = 'pending') THEN RAISE EXCEPTION 'A deposit request is already pending'; END IF;
  SELECT dr.restriction_until INTO v_restriction_until FROM deposit_requests AS dr WHERE dr.user_id = v_user_id AND dr.status = 'rejected' AND dr.restriction_until > now() ORDER BY dr.restriction_until DESC LIMIT 1;
  IF v_restriction_until IS NOT NULL THEN RAISE EXCEPTION 'Deposit temporarily restricted'; END IF;
  IF EXISTS (SELECT 1 FROM deposit_requests AS dr WHERE dr.transaction_id_normalized = v_normalized_id) THEN RAISE EXCEPTION 'This transaction ID has already been submitted'; END IF;
  INSERT INTO deposit_requests (user_id, payment_method, amount, sender_name, transaction_id, transaction_id_normalized, idempotency_key) VALUES (v_user_id, p_payment_method, p_amount, trim(p_sender_name), trim(p_transaction_id), v_normalized_id, p_idempotency_key) RETURNING id INTO v_request_id;
  INSERT INTO wallet_transactions (user_id, transaction_type, direction, amount, status, reference_type, reference_id, description) VALUES (v_user_id, 'deposit', 'credit', p_amount, 'pending', 'deposit', v_request_id, 'Deposit request pending verification') RETURNING id INTO v_transaction_id;
  UPDATE deposit_requests AS dr SET created_transaction_id = v_transaction_id WHERE dr.id = v_request_id;
  INSERT INTO wallet_notifications (user_id, notification_type, title, message) VALUES (v_user_id, 'deposit_submitted', 'Deposit request submitted', 'Your deposit request is pending administrator verification.');
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION submit_withdrawal(
  p_payment_method text,
  p_amount numeric,
  p_recipient_account text,
  p_account_holder_name text,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_transaction_id uuid;
  v_existing_id uuid;
  v_min numeric;
  v_max numeric;
  v_wallet wallets%ROWTYPE;
  v_account text := regexp_replace(coalesce(trim(p_recipient_account), ''), '[^0-9]', '', 'g');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT wr.id INTO v_existing_id FROM withdrawal_requests AS wr WHERE wr.user_id = v_user_id AND wr.idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
  END IF;
  IF p_payment_method NOT IN ('bkash', 'nagad') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid withdrawal amount'; END IF;
  IF v_account !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid recipient account'; END IF;
  IF p_account_holder_name IS NULL OR length(trim(p_account_holder_name)) < 2 OR length(trim(p_account_holder_name)) > 120 THEN RAISE EXCEPTION 'Invalid account holder name'; END IF;
  IF EXISTS (SELECT 1 FROM withdrawal_requests AS wr WHERE wr.user_id = v_user_id AND wr.status = 'pending') THEN RAISE EXCEPTION 'A withdrawal request is already pending'; END IF;
  SELECT ws.min_withdrawal, ws.max_withdrawal INTO v_min, v_max FROM wallet_settings AS ws LIMIT 1;
  IF p_amount < v_min OR p_amount > v_max THEN RAISE EXCEPTION 'Withdrawal amount is outside the allowed limits'; END IF;
  INSERT INTO wallets (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT w.* INTO v_wallet FROM wallets AS w WHERE w.user_id = v_user_id FOR UPDATE;
  IF p_amount > (v_wallet.balance - v_wallet.reserved_balance) THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;
  INSERT INTO withdrawal_requests (user_id, payment_method, amount, recipient_account, account_holder_name, idempotency_key) VALUES (v_user_id, p_payment_method, p_amount, v_account, trim(p_account_holder_name), p_idempotency_key) RETURNING id INTO v_request_id;
  INSERT INTO wallet_transactions (user_id, transaction_type, direction, amount, status, reference_type, reference_id, description) VALUES (v_user_id, 'withdrawal', 'debit', p_amount, 'pending', 'withdrawal', v_request_id, 'Withdrawal request pending payout') RETURNING id INTO v_transaction_id;
  UPDATE withdrawal_requests AS wr SET created_transaction_id = v_transaction_id WHERE wr.id = v_request_id;
  UPDATE wallets AS w SET reserved_balance = w.reserved_balance + p_amount WHERE w.id = v_wallet.id;
  INSERT INTO wallet_notifications (user_id, notification_type, title, message) VALUES (v_user_id, 'withdrawal_submitted', 'Withdrawal request submitted', 'Your withdrawal request is pending administrator payout confirmation.');
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_wallet_settings(
  p_merchant_number text,
  p_min_deposit numeric,
  p_max_deposit numeric,
  p_min_withdrawal numeric,
  p_max_withdrawal numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_merchant_number IS NULL OR trim(p_merchant_number) !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid merchant number'; END IF;
  IF p_min_deposit IS NULL OR p_max_deposit IS NULL OR p_min_withdrawal IS NULL OR p_max_withdrawal IS NULL OR p_min_deposit <= 0 OR p_max_deposit < p_min_deposit OR p_min_withdrawal <= 0 OR p_max_withdrawal < p_min_withdrawal THEN RAISE EXCEPTION 'Invalid wallet limits'; END IF;
  UPDATE wallet_settings SET merchant_number = trim(p_merchant_number), min_deposit = p_min_deposit, max_deposit = p_max_deposit, min_withdrawal = p_min_withdrawal, max_withdrawal = p_max_withdrawal, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION submit_deposit(text, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_deposit(text, numeric, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION submit_withdrawal(text, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_withdrawal(text, numeric, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION update_wallet_settings(text, numeric, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_wallet_settings(text, numeric, numeric, numeric, numeric) TO authenticated;
