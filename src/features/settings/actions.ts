"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { updateSettingsSchema, type UpdateSettingsInput } from "./schemas";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserId(): Promise<string | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  return user.id;
}

export async function updateUserSettingsAction(input: UpdateSettingsInput): Promise<ActionResult> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof userSettings.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.creditCardReportMode !== undefined) {
    updates.creditCardReportMode = parsed.data.creditCardReportMode;
  }
  if (parsed.data.statementViewMode !== undefined) {
    updates.statementViewMode = parsed.data.statementViewMode;
  }
  if (parsed.data.theme !== undefined) updates.theme = parsed.data.theme;
  if (parsed.data.density !== undefined) updates.density = parsed.data.density;
  if (parsed.data.budgetAlertThresholds !== undefined) {
    const sorted = [...new Set(parsed.data.budgetAlertThresholds)].sort((a, b) => a - b);
    updates.budgetAlertThresholds = sorted;
  }
  if (parsed.data.showBudgetForecasts !== undefined) {
    updates.showBudgetForecasts = parsed.data.showBudgetForecasts;
  }

  const result = await db
    .update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, uid))
    .returning({ id: userSettings.id });

  // Trigger guarantees a row exists; if not (defensive), create one.
  if (result.length === 0) {
    await db.insert(userSettings).values({
      userId: uid,
      creditCardReportMode: parsed.data.creditCardReportMode ?? "purchase_date",
      theme: parsed.data.theme ?? "system",
      density: parsed.data.density ?? "comfortable",
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
