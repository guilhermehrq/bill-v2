-- Phase 1.3 · Row Level Security (ADR 007)
-- Enable RLS on every tenant-owned table and apply a single
-- "owns the row" policy that covers SELECT/INSERT/UPDATE/DELETE.
--
-- The `authenticated` role (Supabase default for logged-in users)
-- gets CRUD grants; `anon` stays locked out.
-- Views inherit enforcement from their underlying tables.

---------------------------------------------------------------------
-- Schema-level grants (idempotent)
---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
--> statement-breakpoint

---------------------------------------------------------------------
-- accounts
---------------------------------------------------------------------
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO authenticated;
--> statement-breakpoint
CREATE POLICY "accounts_owner_all" ON accounts
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- credit_cards
---------------------------------------------------------------------
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_cards TO authenticated;
--> statement-breakpoint
CREATE POLICY "credit_cards_owner_all" ON credit_cards
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- categories
---------------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
--> statement-breakpoint
CREATE POLICY "categories_owner_all" ON categories
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- transactions
---------------------------------------------------------------------
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
--> statement-breakpoint
CREATE POLICY "transactions_owner_all" ON transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- credit_card_invoices
---------------------------------------------------------------------
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_card_invoices TO authenticated;
--> statement-breakpoint
CREATE POLICY "credit_card_invoices_owner_all" ON credit_card_invoices
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- budgets
---------------------------------------------------------------------
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;
--> statement-breakpoint
CREATE POLICY "budgets_owner_all" ON budgets
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- recurrences
---------------------------------------------------------------------
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON recurrences TO authenticated;
--> statement-breakpoint
CREATE POLICY "recurrences_owner_all" ON recurrences
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- goals
---------------------------------------------------------------------
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO authenticated;
--> statement-breakpoint
CREATE POLICY "goals_owner_all" ON goals
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- investments
---------------------------------------------------------------------
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON investments TO authenticated;
--> statement-breakpoint
CREATE POLICY "investments_owner_all" ON investments
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- investment_transactions
---------------------------------------------------------------------
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON investment_transactions TO authenticated;
--> statement-breakpoint
CREATE POLICY "investment_transactions_owner_all" ON investment_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- user_settings
---------------------------------------------------------------------
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;
--> statement-breakpoint
CREATE POLICY "user_settings_owner_all" ON user_settings
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- imports
---------------------------------------------------------------------
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON imports TO authenticated;
--> statement-breakpoint
CREATE POLICY "imports_owner_all" ON imports
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- import_mappings
---------------------------------------------------------------------
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON import_mappings TO authenticated;
--> statement-breakpoint
CREATE POLICY "import_mappings_owner_all" ON import_mappings
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint

---------------------------------------------------------------------
-- Views — grant SELECT only (they aggregate over RLS-protected tables).
-- RLS enforcement happens at the underlying tables.
---------------------------------------------------------------------
GRANT SELECT ON v_account_balances TO authenticated;
--> statement-breakpoint
GRANT SELECT ON v_invoice_totals TO authenticated;
--> statement-breakpoint
GRANT SELECT ON v_monthly_cashflow TO authenticated;
--> statement-breakpoint
GRANT SELECT ON v_card_purchases TO authenticated;
