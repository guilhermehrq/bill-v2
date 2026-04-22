import { redirect } from "next/navigation";
import { InvoiceDetailView } from "@/features/cards/invoice-detail";
import {
  getCurrentInvoiceMonth,
  getInvoiceByMonth,
  listInvoicesForCard,
} from "@/features/cards/invoice-queries";
import { listCardsWithCurrentInvoice } from "@/features/cards/queries";
import { listFormAccountOptions } from "@/features/transactions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Fatura · FinPessoal" };

type Params = Promise<{ cardId: string }>;
type SearchParams = Promise<{ mes?: string }>;

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

  const [invoices, accounts, fallbackCurrent] = await Promise.all([
    listInvoicesForCard(user.id, cardId),
    listFormAccountOptions(user.id),
    getCurrentInvoiceMonth(user.id, cardId),
  ]);

  // Resolve the reference month to display.
  let month = sp.mes;
  if (!month) {
    month = fallbackCurrent ?? invoices[0]?.referenceMonth ?? firstDayOfThisMonth();
  }
  // Normalize: if user passed YYYY-MM, turn into YYYY-MM-01.
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

function firstDayOfThisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
