"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserId(): Promise<string | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  return user.id;
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  await db
    .update(userSettings)
    .set({ notificationsLastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(userSettings.userId, uid));

  revalidatePath("/", "layout");
  revalidatePath("/notificacoes");
  return { ok: true, data: undefined };
}
