-- Phase 2.3 · Transfer direction on transactions.
--
-- Transfers are stored as two mirrored rows (source + destination) joined by
-- transfer_pair_id. Without an explicit direction the balance view can't tell
-- which side loses vs. gains money. This migration adds the column, enforces
-- the invariant via a CHECK constraint, and updates v_account_balances to
-- account for transfers.

CREATE TYPE transfer_direction AS ENUM ('in', 'out');
--> statement-breakpoint

ALTER TABLE transactions ADD COLUMN transfer_direction transfer_direction;
--> statement-breakpoint

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_transfer_direction
  CHECK (
    (type = 'transfer' AND transfer_direction IS NOT NULL)
    OR (type <> 'transfer' AND transfer_direction IS NULL)
  );
--> statement-breakpoint

CREATE OR REPLACE VIEW v_account_balances AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.name,
  a.currency,
  a.initial_balance_cents + COALESCE(SUM(
    CASE
      WHEN t.type = 'income'  THEN t.amount_cents
      WHEN t.type = 'expense' THEN -t.amount_cents
      WHEN t.type = 'transfer' AND t.transfer_direction = 'in'  THEN t.amount_cents
      WHEN t.type = 'transfer' AND t.transfer_direction = 'out' THEN -t.amount_cents
      ELSE 0
    END
  ), 0) AS balance_cents
FROM accounts a
LEFT JOIN transactions t
  ON t.account_id = a.id
 AND t.is_paid = true
GROUP BY a.id, a.user_id, a.name, a.currency, a.initial_balance_cents;
