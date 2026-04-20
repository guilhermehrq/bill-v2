import "server-only";
import { createClient } from "@supabase/supabase-js";

// Admin client using service_role — bypasses RLS. See ADR 007.
// Use only from server-side code that legitimately requires bypass
// (migrations, seeds, cron jobs, bulk import Server Actions).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
