import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/auth/profile-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Perfil · FinPessoal" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const provider =
    user.app_metadata?.provider ??
    (Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers[0] : null) ??
    "email";

  const initial = {
    name: metadata.full_name || user.email || "",
    email: user.email ?? "",
    avatarUrl: metadata.avatar_url ?? null,
    provider: typeof provider === "string" ? provider : "email",
    createdAt: user.created_at ?? null,
  };

  return (
    <div className="max-w-2xl py-4">
      <ProfileForm initial={initial} />
    </div>
  );
}
