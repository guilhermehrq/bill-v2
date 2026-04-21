import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// RLS integration test (ADR 007).
// Creates two users via the service_role admin client, inserts private data as each,
// then verifies each user can only read their own rows when authenticated.
//
// Requires real Supabase credentials in .env.local. Skipped when env vars look like
// the CI placeholders so the unit suite stays hermetic.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasRealCredentials =
  supabaseUrl !== undefined &&
  anonKey !== undefined &&
  serviceRoleKey !== undefined &&
  !supabaseUrl.includes("placeholder") &&
  !anonKey.includes("placeholder") &&
  !serviceRoleKey.includes("placeholder");

const describeIfReal = hasRealCredentials ? describe : describe.skip;

type Ctx = {
  admin: SupabaseClient;
  userA: { id: string; email: string; password: string; client: SupabaseClient };
  userB: { id: string; email: string; password: string; client: SupabaseClient };
};

describeIfReal("RLS — accounts isolation between tenants", () => {
  const ctx = {} as Ctx;

  beforeAll(async () => {
    ctx.admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stamp = Date.now();
    ctx.userA = await createTestUser(ctx.admin, `rls-a-${stamp}@test.local`);
    ctx.userB = await createTestUser(ctx.admin, `rls-b-${stamp}@test.local`);
  });

  afterAll(async () => {
    if (ctx.userA?.id) await ctx.admin.auth.admin.deleteUser(ctx.userA.id);
    if (ctx.userB?.id) await ctx.admin.auth.admin.deleteUser(ctx.userB.id);
  });

  it("user A cannot read user B's accounts", async () => {
    const { error: insertErrorA } = await ctx.userA.client
      .from("accounts")
      .insert({ name: "Conta A", type: "checking" });
    expect(insertErrorA).toBeNull();

    const { error: insertErrorB } = await ctx.userB.client
      .from("accounts")
      .insert({ name: "Conta B", type: "checking" });
    expect(insertErrorB).toBeNull();

    const { data: aSees } = await ctx.userA.client.from("accounts").select("name");
    const names = (aSees ?? []).map((r: { name: string }) => r.name);
    expect(names).toContain("Conta A");
    expect(names).not.toContain("Conta B");
  });

  it("user A cannot insert a row impersonating user B", async () => {
    const { error } = await ctx.userA.client
      .from("accounts")
      .insert({ name: "Forjada", type: "checking", user_id: ctx.userB.id });
    expect(error).not.toBeNull();
  });

  it("anon client sees nothing", async () => {
    const anon = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false },
    });
    const { data } = await anon.from("accounts").select("name");
    expect(data ?? []).toHaveLength(0);
  });
});

async function createTestUser(admin: SupabaseClient, email: string) {
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("failed to create test user");

  const client = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, password, client };
}
