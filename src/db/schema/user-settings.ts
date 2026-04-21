import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./_auth";
import { creditCardReportMode, densityMode, themeMode } from "./_enums";

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
    theme: themeMode().default("system").notNull(),
    density: densityMode().default("comfortable").notNull(),
    defaultCurrency: text("default_currency").default("BRL").notNull(),
    timezone: text().default("America/Sao_Paulo").notNull(),
    locale: text().default("pt-BR").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_user_settings_user").on(t.userId)],
);
