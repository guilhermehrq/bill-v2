import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Minimal reference to Supabase's auth.users so we can wire up
// ON DELETE CASCADE foreign keys. See ADR 002 / ADR 007.
const auth = pgSchema("auth");

export const authUsers = auth.table("users", {
  id: uuid().primaryKey(),
});
