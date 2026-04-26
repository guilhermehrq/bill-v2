-- Phase 2 fase 2 · Archive flow for categories.
--
-- Lets users archive a category (it stops appearing in pickers but stays in
-- the DB so historical transactions still resolve to a name). Once archived,
-- it can be deleted only when no transactions reference it; if it has
-- transactions, the user must merge it into another category first.

ALTER TABLE "categories" ADD COLUMN "archived_at" timestamp with time zone;
