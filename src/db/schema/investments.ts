import { bigint, boolean, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { investmentType } from "./_enums";
import { tenantColumns } from "./_shared";

export const investments = pgTable("investments", {
  ...tenantColumns,
  name: text().notNull(),
  ticker: text(),
  type: investmentType().notNull(),
  broker: text(),
  quantity: numeric({ precision: 20, scale: 8 }).default("0").notNull(),
  averagePriceCents: bigint("average_price_cents", { mode: "number" }).default(0).notNull(),
  currentPriceCents: bigint("current_price_cents", { mode: "number" }),
  archived: boolean().default(false).notNull(),
});
