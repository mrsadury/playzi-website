/*
# PLAYZI Wallet Atomic Operations

1. Server Functions
- `get_or_create_wallet` creates the authenticated user's wallet safely and returns the server record.
- `submit_deposit` validates limits, provider, sender, normalized transaction ID, duplicate state, and 24-hour restrictions before creating a pending request and ledger entry.
- `submit_withdrawal` validates the recipient and limits, locks the wallet row, checks available funds, creates a pending request and ledger entry, and reserves funds atomically.
- `review_deposit` and `review_withdrawal` are administrator-only approval functions that update requests, balances, reservations, ledger status, and notifications together.
- `admin_adjust_wallet` is the shared secure path for future tournament fees, prize credits, and controlled adjustments.
- `update_wallet_settings` is the administrator-only path for merchant and limit configuration.
- `mark_wallet_notification_read` lets a user mark only their own notification as read.

2. Security
- Every function uses the current authenticated session, fixed `public` search path, and administrator checks where required.
- Anonymous execution is revoked. The client cannot set a balance, reserved amount, request status, ledger status, or review identity.
- Database constraints and row locks provide duplicate protection and race-safe balance updates.
*/

CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();

CREATE OR REPLACE FUNCTION get_or_create_wallet()
RETURNS SETOF wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  INSERT INTO wallets (user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY SELECT w.* FROM wallets AS w WHERE w.user_id = auth.uid();
END;
$$;

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
    SELECT dr.id INTO v_existing_id FROM deposit_requests AS dr
    WHERE dr.user_id = v_user_id AND dr.idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
  END IF;
  IF p_payment_method NOT IN ('bkash', 'nagad') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid deposit amount'; END IF;
  IF length(trim(p_sender_name)) < 2 OR length(trim(p_sender_name)) > 120 THEN RAISE EXCEPTION 'Invalid sender name'; END IF;

  v_normalized_id := upper(regexp_replace(trim(p_transaction_id), '\s+', '', 'g'));
  IF v_normalized_id !~ '^[A-Z0-9]{8,20}$' THEN RAISE EXCEPTION 'Invalid transaction ID'; END IF;
  SELECT ws.min_deposit, ws.max_deposit INTO v_min, v_max FROM wallet_settings AS ws LIMIT 1;
  IF p_amount < v_min OR p_amount > v_max THEN RAISE EXCEPTION 'Deposit amount is outside the allowed limits'; END IF;
  IF EXISTS (SELECT 1 FROM deposit_requests AS dr WHERE dr.user_id = v_user_id AND dr.status = 'pending') THEN RAISE EXCEPTION 'A deposit request is already pending'; END IF;
  SELECT dr.restriction_until INTO v_restriction_until
  FROM deposit_requests AS dr
  WHERE dr.user_id = v_user_id AND dr.status = 'rejected' AND dr.restriction_until > now()
  ORDER BY dr.restriction_until DESC LIMIT 1;
  IF v_restriction_until IS NOT NULL THEN RAISE EXCEPTION 'Deposit temporarily restricted'; END IF;
  IF EXISTS (SELECT 1 FROM deposit_requests AS dr WHERE dr.transaction_id_normalized = v_normalized_id) THEN RAISE EXCEPTION 'This transaction ID has already been submitted'; END IF;

  INSERT INTO deposit_requests (user_id, payment_method, amount, sender_name, transaction_id, transaction_id_normalized, idempotency_key)
  VALUES (v_user_id, p_payment_method, p_amount, trim(p_sender_name), trim(p_transaction_id), v_normalized_id, p_idempotency_key)
  RETURNING id INTO v_request_id;
  INSERT INTO wallet_transactions (user_id, transaction_type, direction, amount, status, reference_type, reference_id, description)
  VALUES (v_user_id, 'deposit', 'credit', p_amount, 'pending', 'deposit', v_request_id, 'Deposit request pending verification')
  RETURNING id INTO v_transaction_id;
  UPDATE deposit_requests AS dr SET created_transaction_id = v_transaction_id WHERE dr.id = v_request_id;
  INSERT INTO wallet_notifications (user_id, notification_type, title, message)
  VALUES (v_user_id, 'deposit_submitted', 'Deposit request submitted', 'Your deposit request is pending administrator verification.');
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
  v_account text := regexp_replace(trim(p_recipient_account), '[^0-9]', '', 'g');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT wr.id INTO v_existing_id FROM withdrawal_requests AS wr
    WHERE wr.user_id = v_user_id AND wr.idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
  END IF;
  IF p_payment_method NOT IN ('bkash', 'nagad') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid withdrawal amount'; END IF;
  IF v_account !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid recipient account'; END IF;
  IF length(trim(p_account_holder_name)) < 2 OR length(trim(p_account_holder_name)) > 120 THEN RAISE EXCEPTION 'Invalid account holder name'; END IF;
  IF EXISTS (SELECT 1 FROM withdrawal_requests AS wr WHERE wr.user_id = v_user_id AND wr.status = 'pending') THEN RAISE EXCEPTION 'A withdrawal request is already pending'; END IF;
  SELECT ws.min_withdrawal, ws.max_withdrawal INTO v_min, v_max FROM wallet_settings AS ws LIMIT 1;
  IF p_amount < v_min OR p_amount > v_max THEN RAISE EXCEPTION 'Withdrawal amount is outside the allowed limits'; END IF;

  INSERT INTO wallets (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT w.* INTO v_wallet FROM wallets AS w WHERE w.user_id = v_user_id FOR UPDATE;
  IF p_amount > (v_wallet.balance - v_wallet.reserved_balance) THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;

  INSERT INTO withdrawal_requests (user_id, payment_method, amount, recipient_account, account_holder_name, idempotency_key)
  VALUES (v_user_id, p_payment_method, p_amount, v_account, trim(p_account_holder_name), p_idempotency_key)
  RETURNING id INTO v_request_id;
  INSERT INTO wallet_transactions (user_id, transaction_type, direction, amount, status, reference_type, reference_id, description)
  VALUES (v_user_id, 'withdrawal', 'debit', p_amount, 'pending', 'withdrawal', v_request_id, 'Withdrawal request pending payout')
  RETURNING id INTO v_transaction_id;
  UPDATE withdrawal_requests AS wr SET created_transaction_id = v_transaction_id WHERE wr.id = v_request_id;
  UPDATE wallets AS w SET reserved_balance = w.reserved_balance + p_amount WHERE w.id = v_wallet.id;
  INSERT INTO wallet_notifications (user_id, notification_type, title, message)
  VALUES (v_user_id, 'withdrawal_submitted', 'Withdrawal request submitted', 'Your withdrawal request is pending administrator payout confirmation.');
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION review_deposit(
  p_request_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request deposit_requests%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_reason text := NULLIF(trim(p_rejection_reason), '');
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review decision'; END IF;
  SELECT dr.* INTO v_request FROM deposit_requests AS dr WHERE dr.id = p_request_id FOR UPDATE;
  IF v_request.id IS NULL OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'Deposit request is not pending'; END IF;

  IF p_decision = 'approved' THEN
    INSERT INTO wallets (user_id) VALUES (v_request.user_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT w.* INTO v_wallet FROM wallets AS w WHERE w.user_id = v_request.user_id FOR UPDATE;
    UPDATE wallets AS w SET balance = w.balance + v_request.amount WHERE w.id = v_wallet.id;
    UPDATE deposit_requests AS dr SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL WHERE dr.id = p_request_id;
    UPDATE wallet_transactions AS wt SET status = 'completed', completed_at = now(), description = 'Deposit approved and wallet credited' WHERE wt.reference_type = 'deposit' AND wt.reference_id = p_request_id;
    INSERT INTO wallet_notifications (user_id, notification_type, title, message)
    VALUES (v_request.user_id, 'deposit_approved', 'Deposit approved', format('+ ৳%s was added to your wallet.', to_char(v_request.amount, 'FM999999990.00')));
  ELSE
    UPDATE deposit_requests AS dr SET status = 'rejected', rejection_reason = v_reason, restriction_until = now() + interval '24 hours', reviewed_at = now(), reviewed_by = auth.uid() WHERE dr.id = p_request_id;
    UPDATE wallet_transactions AS wt SET status = 'rejected', completed_at = now(), description = 'Deposit request rejected' WHERE wt.reference_type = 'deposit' AND wt.reference_id = p_request_id;
    INSERT INTO wallet_notifications (user_id, notification_type, title, message)
    VALUES (v_request.user_id, 'deposit_rejected', 'Deposit rejected', COALESCE(v_reason, 'Your deposit request was rejected. You can submit another request after 24 hours.'));
  END IF;
  RETURN p_decision;
END;
$$;

CREATE OR REPLACE FUNCTION review_withdrawal(
  p_request_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request withdrawal_requests%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_reason text := NULLIF(trim(p_rejection_reason), '');
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review decision'; END IF;
  SELECT wr.* INTO v_request FROM withdrawal_requests AS wr WHERE wr.id = p_request_id FOR UPDATE;
  IF v_request.id IS NULL OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal request is not pending'; END IF;
  SELECT w.* INTO v_wallet FROM wallets AS w WHERE w.user_id = v_request.user_id FOR UPDATE;
  IF v_wallet.id IS NULL OR v_wallet.reserved_balance < v_request.amount THEN RAISE EXCEPTION 'Reserved wallet funds are inconsistent'; END IF;

  IF p_decision = 'approved' THEN
    UPDATE wallets AS w SET balance = w.balance - v_request.amount, reserved_balance = w.reserved_balance - v_request.amount WHERE w.id = v_wallet.id;
    UPDATE withdrawal_requests AS wr SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL WHERE wr.id = p_request_id;
    UPDATE wallet_transactions AS wt SET status = 'completed', completed_at = now(), description = 'Withdrawal approved after payout confirmation' WHERE wt.reference_type = 'withdrawal' AND wt.reference_id = p_request_id;
    INSERT INTO wallet_notifications (user_id, notification_type, title, message)
    VALUES (v_request.user_id, 'withdrawal_approved', 'Withdrawal approved', format('- ৳%s was paid from your wallet.', to_char(v_request.amount, 'FM999999990.00')));
  ELSE
    UPDATE wallets AS w SET reserved_balance = w.reserved_balance - v_request.amount WHERE w.id = v_wallet.id;
    UPDATE withdrawal_requests AS wr SET status = 'rejected', rejection_reason = v_reason, reviewed_at = now(), reviewed_by = auth.uid() WHERE wr.id = p_request_id;
    UPDATE wallet_transactions AS wt SET status = 'rejected', completed_at = now(), description = 'Withdrawal request rejected and funds released' WHERE wt.reference_type = 'withdrawal' AND wt.reference_id = p_request_id;
    INSERT INTO wallet_notifications (user_id, notification_type, title, message)
    VALUES (v_request.user_id, 'withdrawal_rejected', 'Withdrawal rejected', format('Your ৳%s was returned to your available wallet balance.', to_char(v_request.amount, 'FM999999990.00')));
  END IF;
  RETURN p_decision;
END;
$$;

CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_direction text,
  p_transaction_type text,
  p_description text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid adjustment amount'; END IF;
  IF p_direction NOT IN ('credit', 'debit') THEN RAISE EXCEPTION 'Invalid adjustment direction'; END IF;
  IF p_transaction_type NOT IN ('tournament_fee', 'prize_money', 'adjustment') THEN RAISE EXCEPTION 'Invalid adjustment type'; END IF;
  INSERT INTO wallets (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT w.* INTO v_wallet FROM wallets AS w WHERE w.user_id = p_user_id FOR UPDATE;
  IF p_direction = 'debit' AND p_amount > (v_wallet.balance - v_wallet.reserved_balance) THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;
  IF p_direction = 'credit' THEN
    UPDATE wallets AS w SET balance = w.balance + p_amount WHERE w.id = v_wallet.id;
  ELSE
    UPDATE wallets AS w SET balance = w.balance - p_amount WHERE w.id = v_wallet.id;
  END IF;
  INSERT INTO wallet_transactions (user_id, transaction_type, direction, amount, status, reference_type, reference_id, description, completed_at)
  VALUES (p_user_id, p_transaction_type, p_direction, p_amount, 'completed', 'admin_adjustment', p_reference_id, trim(p_description), now())
  RETURNING id INTO v_transaction_id;
  INSERT INTO wallet_notifications (user_id, notification_type, title, message)
  VALUES (p_user_id, CASE WHEN p_direction = 'credit' THEN 'wallet_credited' ELSE 'wallet_deducted' END,
    CASE WHEN p_direction = 'credit' THEN 'Wallet credited' ELSE 'Wallet deducted' END,
    format('%s ৳%s', CASE WHEN p_direction = 'credit' THEN '+' ELSE '-' END, to_char(p_amount, 'FM999999990.00')) || ' - ' || trim(p_description));
  RETURN v_transaction_id;
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
  IF trim(p_merchant_number) !~ '^01[3-9][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid merchant number'; END IF;
  IF p_min_deposit <= 0 OR p_max_deposit < p_min_deposit OR p_min_withdrawal <= 0 OR p_max_withdrawal < p_min_withdrawal THEN RAISE EXCEPTION 'Invalid wallet limits'; END IF;
  UPDATE wallet_settings SET merchant_number = trim(p_merchant_number), min_deposit = p_min_deposit, max_deposit = p_max_deposit, min_withdrawal = p_min_withdrawal, max_withdrawal = p_max_withdrawal, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION mark_wallet_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE wallet_notifications AS wn SET read_at = COALESCE(wn.read_at, now())
  WHERE wn.id = p_notification_id AND wn.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION get_or_create_wallet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_or_create_wallet() TO authenticated;
REVOKE ALL ON FUNCTION submit_deposit(text, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_deposit(text, numeric, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION submit_withdrawal(text, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_withdrawal(text, numeric, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION review_deposit(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_deposit(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION review_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_withdrawal(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION admin_adjust_wallet(uuid, numeric, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_adjust_wallet(uuid, numeric, text, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION update_wallet_settings(text, numeric, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_wallet_settings(text, numeric, numeric, numeric, numeric) TO authenticated;
REVOKE ALL ON FUNCTION mark_wallet_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_wallet_notification_read(uuid) TO authenticated;
