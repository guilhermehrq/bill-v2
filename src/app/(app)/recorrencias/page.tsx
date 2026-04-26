import { redirect } from "next/navigation";
import { listFormCardOptions } from "@/features/cards/queries";
import { listCategoriesWithCounts } from "@/features/categories/queries";
import { listRecurrences } from "@/features/recurrences/queries";
import { RecurrencesView } from "@/features/recurrences/recurrences-view";
import { listFormAccountOptions } from "@/features/transactions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Recorrências · FinPessoal" };

export default async function RecorrenciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recurrences, accounts, cards, categoryNodes] = await Promise.all([
    listRecurrences(user.id),
    listFormAccountOptions(user.id),
    listFormCardOptions(user.id),
    listCategoriesWithCounts(user.id),
  ]);

  const categoryOptions = categoryNodes
    .filter((n) => !n.archivedAt)
    .flatMap((n) => [
      {
        id: n.id,
        name: n.name,
        type: n.type,
        parentName: null as string | null,
        icon: n.icon,
        color: n.color,
        parentColor: null as string | null,
      },
      ...n.children
        .filter((c) => !c.archivedAt)
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: n.type,
          parentName: n.name,
          icon: c.icon,
          color: c.color,
          parentColor: n.color,
        })),
    ]);

  return (
    <div className="py-4">
      <RecurrencesView
        recurrences={recurrences}
        accounts={accounts}
        cards={cards}
        categories={categoryOptions}
      />
    </div>
  );
}
