import { redirect } from "next/navigation";
import { AccountsList } from "@/features/accounts/accounts-list";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Contas · FinPessoal" };

export default async function ContasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listAccountsWithBalances(user.id);

  return (
    <div className="py-4">
      <AccountsList accounts={accounts} />
    </div>
  );
}
