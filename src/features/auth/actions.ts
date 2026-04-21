"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updatePasswordSchema,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
  type UpdatePasswordInput,
} from "./schemas";
import { translateAuthError } from "./translate-error";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: translateAuthError(error.message) };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function signupAction(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  // If email confirmation is enabled in Supabase, session will be null here.
  if (!data.session) {
    return { ok: true, data: undefined };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  return { ok: true, data: undefined };
}

export async function updatePasswordAction(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function googleSignInAction(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  if (!data.url) return { ok: false, error: "Não foi possível iniciar o login com Google" };

  return { ok: true, data: { url: data.url } };
}
