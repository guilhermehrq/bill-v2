import { pgEnum } from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", [
  "checking",
  "savings",
  "cash",
  "investment",
  "other",
]);

export const categoryType = pgEnum("category_type", ["income", "expense"]);

export const transactionType = pgEnum("transaction_type", ["income", "expense", "transfer"]);

export const invoiceStatus = pgEnum("invoice_status", [
  "open",
  "closed",
  "paid",
  "overdue",
  "partial",
]);

export const recurrenceFrequency = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const investmentType = pgEnum("investment_type", [
  "stock",
  "fii",
  "fixed_income",
  "crypto",
  "fund",
  "other",
]);

export const investmentTransactionType = pgEnum("investment_transaction_type", [
  "buy",
  "sell",
  "dividend",
  "jcp",
  "bonus",
]);

export const themeMode = pgEnum("theme_mode", ["system", "light", "dark"]);

export const densityMode = pgEnum("density_mode", ["comfortable", "compact"]);

export const creditCardReportMode = pgEnum("credit_card_report_mode", [
  "invoice_date",
  "purchase_date",
  "installment_date",
]);

export const importSourceType = pgEnum("import_source_type", ["account", "card", "category"]);

export const importTargetType = pgEnum("import_target_type", [
  "account",
  "card",
  "category",
  "ignore",
]);

export const importStatus = pgEnum("import_status", [
  "pending",
  "processing",
  "success",
  "partial_failure",
  "failed",
]);
