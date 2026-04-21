-- Phase 1.2 · Triggers, views, and helper functions
-- Implements prompt §4.2:
--   * trg_transactions_set_purchase_date   (ADR 015)
--   * trg_transactions_assign_invoice
--   * fn_recalculate_invoice + trg_transactions_invoice_autorecalc
--   * trg_create_user_settings_on_signup
--   * v_card_purchases, v_account_balances, v_invoice_totals, v_monthly_cashflow

---------------------------------------------------------------------
-- 1. purchase_date inheritance trigger (ADR 015)
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_purchase_date()
RETURNS trigger AS $$
BEGIN
  IF NEW.installment_of_id IS NOT NULL THEN
    SELECT purchase_date INTO NEW.purchase_date
    FROM transactions WHERE id = NEW.installment_of_id;
  ELSE
    NEW.purchase_date := NEW.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_transactions_set_purchase_date
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION fn_set_purchase_date();
--> statement-breakpoint

---------------------------------------------------------------------
-- 2. Invoice auto-assignment for credit card transactions
-- Based on closing_day of the card, decides which invoice the row
-- belongs to; creates the invoice row lazily if needed.
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_assign_invoice()
RETURNS trigger AS $$
DECLARE
  v_closing_day smallint;
  v_due_day smallint;
  v_reference_month date;
  v_closing_date date;
  v_due_date date;
  v_month_end date;
  v_next_month_end date;
  v_invoice_id uuid;
BEGIN
  IF NEW.credit_card_id IS NULL OR NEW.invoice_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT closing_day, due_day
    INTO v_closing_day, v_due_day
  FROM credit_cards
  WHERE id = NEW.credit_card_id;

  IF EXTRACT(DAY FROM NEW.date)::smallint <= v_closing_day THEN
    v_reference_month := date_trunc('month', NEW.date)::date;
  ELSE
    v_reference_month := (date_trunc('month', NEW.date) + INTERVAL '1 month')::date;
  END IF;

  v_month_end := (v_reference_month + INTERVAL '1 month - 1 day')::date;
  v_next_month_end := (v_reference_month + INTERVAL '2 months - 1 day')::date;

  v_closing_date := LEAST(
    (v_reference_month + make_interval(days => v_closing_day - 1))::date,
    v_month_end
  );

  IF v_due_day > v_closing_day THEN
    v_due_date := LEAST(
      (v_reference_month + make_interval(days => v_due_day - 1))::date,
      v_month_end
    );
  ELSE
    v_due_date := LEAST(
      (v_reference_month + INTERVAL '1 month' + make_interval(days => v_due_day - 1))::date,
      v_next_month_end
    );
  END IF;

  INSERT INTO credit_card_invoices
    (user_id, credit_card_id, reference_month, closing_date, due_date, status)
  VALUES
    (NEW.user_id, NEW.credit_card_id, v_reference_month, v_closing_date, v_due_date, 'open')
  ON CONFLICT (credit_card_id, reference_month) DO NOTHING
  RETURNING id INTO v_invoice_id;

  IF v_invoice_id IS NULL THEN
    SELECT id INTO v_invoice_id
    FROM credit_card_invoices
    WHERE credit_card_id = NEW.credit_card_id
      AND reference_month = v_reference_month;
  END IF;

  NEW.invoice_id := v_invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_transactions_assign_invoice
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION fn_assign_invoice();
--> statement-breakpoint

---------------------------------------------------------------------
-- 3. Invoice total recalculation
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalculate_invoice(p_invoice_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE credit_card_invoices
  SET total_cents = COALESCE((
        SELECT SUM(
                 CASE
                   WHEN type = 'expense' THEN amount_cents
                   WHEN type = 'income'  THEN -amount_cents
                   ELSE 0
                 END
               )
        FROM transactions
        WHERE invoice_id = p_invoice_id
      ), 0),
      updated_at = now()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION fn_invoice_autorecalc()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM fn_recalculate_invoice(OLD.invoice_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    PERFORM fn_recalculate_invoice(NEW.invoice_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id
     AND OLD.invoice_id IS NOT NULL THEN
    PERFORM fn_recalculate_invoice(OLD.invoice_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_transactions_invoice_autorecalc
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION fn_invoice_autorecalc();
--> statement-breakpoint

---------------------------------------------------------------------
-- 4. Auto-create user_settings on signup
-- SECURITY DEFINER so the function can insert into public.user_settings
-- from within the auth.users INSERT trigger context.
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_user_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_create_user_settings_on_signup ON auth.users;
--> statement-breakpoint

CREATE TRIGGER trg_create_user_settings_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION fn_create_user_settings();
--> statement-breakpoint

---------------------------------------------------------------------
-- 5. Views (prompt §4.2)
---------------------------------------------------------------------

-- v_card_purchases: aggregates card transactions by "purchase" (collapses installments).
CREATE OR REPLACE VIEW v_card_purchases AS
SELECT
  COALESCE(installment_of_id, id) AS purchase_id,
  user_id,
  credit_card_id,
  category_id,
  MAX(purchase_date) AS purchase_date,
  MIN(description)  AS description,
  SUM(amount_cents) AS total_amount_cents,
  MAX(installment_total) AS total_installments,
  COUNT(*) AS parcels_in_scope
FROM transactions
WHERE credit_card_id IS NOT NULL
GROUP BY COALESCE(installment_of_id, id), user_id, credit_card_id, category_id;
--> statement-breakpoint

-- v_account_balances: current balance per account.
-- Transfers are currently counted as zero because the direction is
-- not yet explicit in the schema (to be addressed before transfer CRUD).
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
      ELSE 0
    END
  ), 0) AS balance_cents
FROM accounts a
LEFT JOIN transactions t
  ON t.account_id = a.id
 AND t.is_paid = true
GROUP BY a.id, a.user_id, a.name, a.currency, a.initial_balance_cents;
--> statement-breakpoint

-- v_invoice_totals: total per open invoice (mirrors the trigger-maintained field, handy for reporting).
CREATE OR REPLACE VIEW v_invoice_totals AS
SELECT
  i.id AS invoice_id,
  i.user_id,
  i.credit_card_id,
  i.reference_month,
  i.closing_date,
  i.due_date,
  i.status,
  COALESCE(SUM(
    CASE
      WHEN t.type = 'expense' THEN t.amount_cents
      WHEN t.type = 'income'  THEN -t.amount_cents
      ELSE 0
    END
  ), 0) AS total_cents,
  COUNT(t.id) AS transaction_count
FROM credit_card_invoices i
LEFT JOIN transactions t ON t.invoice_id = i.id
GROUP BY i.id;
--> statement-breakpoint

-- v_monthly_cashflow: monthly income/expense aggregates per user.
CREATE OR REPLACE VIEW v_monthly_cashflow AS
SELECT
  user_id,
  date_trunc('month', date)::date AS month,
  SUM(CASE WHEN type = 'income'  THEN amount_cents ELSE 0 END) AS income_cents,
  SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expense_cents,
  SUM(
    CASE
      WHEN type = 'income'  THEN amount_cents
      WHEN type = 'expense' THEN -amount_cents
      ELSE 0
    END
  ) AS net_cents,
  COUNT(*) AS transaction_count
FROM transactions
WHERE is_paid = true
GROUP BY user_id, date_trunc('month', date);
