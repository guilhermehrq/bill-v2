import { sql } from "drizzle-orm";
import { bigint, boolean, check, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { tenantColumns } from "./_shared";

export const creditCards = pgTable(
  "credit_cards",
  {
    ...tenantColumns,
    name: text().notNull(),
    brand: text(),
    lastDigits: text("last_digits"),
    limitCents: bigint("limit_cents", { mode: "number" }).notNull(),
    closingDay: smallint("closing_day").notNull(),
    dueDay: smallint("due_day").notNull(),
    defaultAccountId: uuid("default_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    color: text(),
    icon: text(),
    archived: boolean().default(false).notNull(),
  },
  (t) => [
    check("chk_credit_cards_closing_day", sql`${t.closingDay} BETWEEN 1 AND 31`),
    check("chk_credit_cards_due_day", sql`${t.dueDay} BETWEEN 1 AND 31`),
    check(
      "chk_credit_cards_last_digits",
      sql`${t.lastDigits} IS NULL OR length(${t.lastDigits}) = 4`,
    ),
  ],
);
