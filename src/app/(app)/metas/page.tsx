import { redirect } from "next/navigation";
import { listGoals } from "@/features/goals/queries";
import { GoalsView } from "@/features/goals/goals-view";
import { listFormAccountOptions } from "@/features/transactions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Metas · FinPessoal" };

export default async function MetasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [goals, accounts] = await Promise.all([
    listGoals(user.id),
    listFormAccountOptions(user.id),
  ]);

  return (
    <div className="py-4">
      <GoalsView goals={goals} accounts={accounts} />
    </div>
  );
}
