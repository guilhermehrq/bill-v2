import { redirect } from "next/navigation";
import { CardOverview } from "@/features/cards/card-overview";
import { InvoiceDetailView } from "@/features/cards/invoice-detail";
import { getInvoiceByMonth, listInvoicesForCard } from "@/features/cards/invoice-queries";
import { listCardsWithCurrentInvoice } from "@/features/cards/queries";
import { listFormAccountOptions } from "@/features/transactions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cartão · FinPessoal" };

type Params = Promise<{ cardId: string }>;
type SearchParams = Promise<{ mes?: string; ano?: string }>;

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { cardId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cards = await listCardsWithCurrentInvoice(user.id);
  const card = cards.find((c) => c.id === cardId);
  if (!card) redirect("/cartoes");

  const [invoices, accounts] = await Promise.all([
    listInvoicesForCard(user.id, cardId),
    listFormAccountOptions(user.id),
  ]);

  // No `?mes` → render the year overview with the grid of invoices.
  if (!sp.mes) {
    const requestedYear = sp.ano ? Number(sp.ano) : new Date().getFullYear();
    const year = Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear();

    return (
      <div className="py-4">
        <CardOverview
          card={{
            id: card.id,
            name: card.name,
            brand: card.brand,
            color: card.color,
            icon: card.icon,
            limitCents: card.limitCents,
            closingDay: card.closingDay,
            dueDay: card.dueDay,
          }}
          invoices={invoices}
          year={year}
        />
      </div>
    );
  }

  // `?mes=YYYY-MM[-DD]` → render the specific invoice detail.
  let month = sp.mes;
  if (/^\d{4}-\d{2}$/.test(month)) month = `${month}-01`;
  const invoice = await getInvoiceByMonth(user.id, cardId, month);

  return (
    <div className="py-4">
      <InvoiceDetailView
        invoice={invoice}
        card={{
          id: card.id,
          name: card.name,
          color: card.color,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          defaultAccountId: card.defaultAccountId,
        }}
        currentMonth={month}
        invoices={invoices}
        accounts={accounts}
      />
    </div>
  );
}
