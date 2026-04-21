import { bigint, date, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { creditCards } from "./credit-cards";
import { invoiceStatus } from "./_enums";
import { tenantColumns } from "./_shared";

export const creditCardInvoices = pgTable(
  "credit_card_invoices",
  {
    ...tenantColumns,
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "cascade" }),
    referenceMonth: date("reference_month").notNull(),
    closingDate: date("closing_date").notNull(),
    dueDate: date("due_date").notNull(),
    status: invoiceStatus().default("open").notNull(),
    totalCents: bigint("total_cents", { mode: "number" }).default(0).notNull(),
    paidCents: bigint("paid_cents", { mode: "number" }).default(0).notNull(),
  },
  (t) => [uniqueIndex("uq_invoices_card_reference_month").on(t.creditCardId, t.referenceMonth)],
);
