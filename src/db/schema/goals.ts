import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { tenantColumns } from "./_shared";

export const goals = pgTable(
  "goals",
  {
    ...tenantColumns,
    name: text().notNull(),
    targetCents: bigint("target_cents", { mode: "number" }).notNull(),
    currentCents: bigint("current_cents", { mode: "number" }).default(0).notNull(),
    targetDate: date("target_date"),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    icon: text(),
    color: text(),
    archived: boolean().default(false).notNull(),
  },
  (t) => [check("chk_goals_target_positive", sql`${t.targetCents} > 0`)],
);
