-- Phase 1.3b · DEFAULT auth.uid() on user_id for every tenant table.
-- Standard Supabase pattern so clients don't need to send user_id; the
-- WITH CHECK RLS policy then becomes trivially satisfied.

ALTER TABLE accounts ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE credit_cards ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE categories ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE credit_card_invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE budgets ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE recurrences ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE goals ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE investments ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE investment_transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
-- user_settings is populated by fn_create_user_settings trigger;
-- the default is still useful if something else inserts directly.
ALTER TABLE user_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE imports ALTER COLUMN user_id SET DEFAULT auth.uid();
--> statement-breakpoint
ALTER TABLE import_mappings ALTER COLUMN user_id SET DEFAULT auth.uid();
