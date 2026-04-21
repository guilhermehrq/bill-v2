import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  integer,
  pgTable,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { creditCards } from "./credit-cards";
import { recurrenceFrequency, transactionType } from "./_enums";
import { tenantColumns } from "./_shared";

export const recurrences = pgTable(
  "recurrences",
  {
    ...tenantColumns,
    description: text().notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    type: transactionType().notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCards.id, {
      onDelete: "cascade",
    }),
    frequency: recurrenceFrequency().notNull(),
    interval: smallint().default(1).notNull(),
    dayOfMonth: smallint("day_of_month"),
    dayOfWeek: smallint("day_of_week"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    maxOccurrences: integer("max_occurrences"),
    active: boolean().default(true).notNull(),
    lastGeneratedDate: date("last_generated_date"),
  },
  (t) => [
    check("chk_recurrences_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "chk_recurrences_either_account_or_card",
      sql`(${t.accountId} IS NOT NULL) <> (${t.creditCardId} IS NOT NULL)`,
    ),
    check("chk_recurrences_interval_positive", sql`${t.interval} > 0`),
    check(
      "chk_recurrences_day_of_month",
      sql`${t.dayOfMonth} IS NULL OR ${t.dayOfMonth} BETWEEN 1 AND 31`,
    ),
    check(
      "chk_recurrences_day_of_week",
      sql`${t.dayOfWeek} IS NULL OR ${t.dayOfWeek} BETWEEN 0 AND 6`,
    ),
  ],
);
