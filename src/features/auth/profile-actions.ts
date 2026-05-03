"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "./translate-error";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120, "Nome muito longo"),
  avatarUrl: z.string().trim().url("URL inválida").max(500, "URL muito longa").nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfileAction(input: {
  name: string;
  avatarUrl: string | null;
}): Promise<ActionResult> {
  const normalized = {
    name: input.name,
    avatarUrl: input.avatarUrl && input.avatarUrl.length > 0 ? input.avatarUrl : null,
  };
  const parsed = updateProfileSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.name,
      avatar_url: parsed.data.avatarUrl,
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function updatePasswordFromProfileAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Não autenticado" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return { ok: false, error: "Senha atual incorreta" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  return { ok: true, data: undefined };
}
