import { redirect } from "next/navigation";
import { ForecastView } from "@/features/forecast/components/forecast-view";
import { loadForecastData } from "@/features/forecast/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Previsão · FinPessoal" };

export default async function PrevisaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await loadForecastData(user.id);

  return <ForecastView data={data} />;
}
