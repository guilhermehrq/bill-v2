import { redirect } from "next/navigation";
import { CardsList } from "@/features/cards/cards-list";
import { listCardsWithCurrentInvoice } from "@/features/cards/queries";
import { listFormAccountOptions } from "@/features/transactions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cartões · FinPessoal" };

export default async function CartoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cards, accounts] = await Promise.all([
    listCardsWithCurrentInvoice(user.id),
    listFormAccountOptions(user.id),
  ]);

  return (
    <div className="py-4">
      <CardsList cards={cards} accounts={accounts} />
    </div>
  );
}
