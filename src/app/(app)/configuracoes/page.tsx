import { redirect } from "next/navigation";
import { getUserSettings } from "@/features/settings/queries";
import { SettingsForm } from "@/features/settings/settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações · FinPessoal" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getUserSettings(user.id);

  return (
    <div className="max-w-2xl py-4">
      <SettingsForm initial={settings} />
    </div>
  );
}
