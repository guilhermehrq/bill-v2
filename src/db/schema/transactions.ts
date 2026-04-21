import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { creditCardInvoices } from "./credit-card-invoices";
import { creditCards } from "./credit-cards";
import { imports } from "./imports";
import { recurrences } from "./recurrences";
import { transactionType } from "./_enums";
import { tenantColumns } from "./_shared";

export const transactions = pgTable(
  "transactions",
  {
    ...tenantColumns,
    description: text().notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    type: transactionType().notNull(),
    date: date().notNull(),
    purchaseDate: date("purchase_date").notNull(),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCards.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    transferPairId: uuid("transfer_pair_id").references((): AnyPgColumn => transactions.id, {
      onDelete: "set null",
    }),
    isPaid: boolean("is_paid").default(true).notNull(),
    paidAt: date("paid_at"),
    invoiceId: uuid("invoice_id").references(() => creditCardInvoices.id, {
      onDelete: "set null",
    }),
    installmentOfId: uuid("installment_of_id").references((): AnyPgColumn => transactions.id, {
      onDelete: "cascade",
    }),
    installmentNumber: smallint("installment_number"),
    installmentTotal: smallint("installment_total"),
    recurrenceId: uuid("recurrence_id").references(() => recurrences.id, {
      onDelete: "set null",
    }),
    tags: text()
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    notes: text(),
    attachmentUrl: text("attachment_url"),
    importId: uuid("import_id").references(() => imports.id, {
      onDelete: "set null",
    }),
    sourceExternalId: text("source_external_id"),
  },
  (t) => [
    check("chk_transactions_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "chk_transactions_either_account_or_card",
      sql`(${t.accountId} IS NOT NULL) <> (${t.creditCardId} IS NOT NULL)`,
    ),
    check(
      "chk_transactions_installment_range",
      sql`${t.installmentNumber} IS NULL OR (${t.installmentNumber} BETWEEN 1 AND ${t.installmentTotal})`,
    ),
    index("idx_transactions_user_date").on(t.userId, t.date.desc()),
    index("idx_transactions_user_purchase_date").on(t.userId, t.purchaseDate.desc()),
    index("idx_transactions_account")
      .on(t.accountId)
      .where(sql`${t.accountId} IS NOT NULL`),
    index("idx_transactions_card")
      .on(t.creditCardId)
      .where(sql`${t.creditCardId} IS NOT NULL`),
    index("idx_transactions_invoice")
      .on(t.invoiceId)
      .where(sql`${t.invoiceId} IS NOT NULL`),
    index("idx_transactions_description_trgm").using("gin", sql`${t.description} gin_trgm_ops`),
    index("idx_transactions_source_external")
      .on(t.userId, t.sourceExternalId)
      .where(sql`${t.sourceExternalId} IS NOT NULL`),
  ],
);
