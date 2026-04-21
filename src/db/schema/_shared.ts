import { timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./_auth";

// Columns shared by every tenant-owned table per prompt §4:
// - id:         uuid PK, default gen_random_uuid()
// - user_id:    uuid not null, FK to auth.users, ON DELETE CASCADE
// - created_at: timestamptz default now()
// - updated_at: timestamptz default now()
export const tenantColumns = {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};
