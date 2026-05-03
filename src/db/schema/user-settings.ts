import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./_auth";
import { creditCardReportMode, densityMode, statementViewMode, themeMode } from "./_enums";

// 1:1 with auth.users — row created by trigger on signup.
// user_id is both FK to auth.users AND carries a unique index.
export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    creditCardReportMode: creditCardReportMode("credit_card_report_mode")
      .default("purchase_date")
      .notNull(),
    statementViewMode: statementViewMode("statement_view_mode").default("all_entries").notNull(),
    theme: themeMode().default("system").notNull(),
    density: densityMode().default("comfortable").notNull(),
    defaultCurrency: text("default_currency").default("BRL").notNull(),
    timezone: text().default("America/Sao_Paulo").notNull(),
    locale: text().default("pt-BR").notNull(),
    notificationsLastSeenAt: timestamp("notifications_last_seen_at", { withTimezone: true }),
    budgetAlertThresholds: smallint("budget_alert_thresholds")
      .array()
      .default(sql`'{50,80,100}'::smallint[]`)
      .notNull(),
    showBudgetForecasts: boolean("show_budget_forecasts").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_user_settings_user").on(t.userId)],
);
