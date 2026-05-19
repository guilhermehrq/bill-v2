import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AccountIcon } from "@/components/ui/account-icon";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { INVOICE_STATUS_LABEL, type DerivedInvoiceStatus } from "./invoice-status";
import type { InvoiceNavItem } from "./invoice-queries";

type CardSummary = {
  id: string;
  name: string;
  brand: string | null;
  color: string | null;
  icon: string | null;
  limitCents: number;
  closingDay: number;
  dueDay: number;
};

type Props = {
  card: CardSummary;
  invoices: InvoiceNavItem[];
  year: number;
};

const STATUS_TONE: Record<DerivedInvoiceStatus, string> = {
  paid: "border-income/40 bg-income/5 text-income",
  partial: "border-pending/40 bg-pending/5 text-pending",
  current: "border-info/40 bg-info/5 text-info",
  future: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  overdue: "border-expense/40 bg-expense/5 text-expense",
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function CardOverview({ card, invoices, year }: Props) {
  const yearInvoices = invoices.filter((inv) => inv.referenceMonth.startsWith(`${year}-`));
  const totalYearCents = yearInvoices.reduce((acc, inv) => acc + inv.totalCents, 0);
  const paidYearCents = yearInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + inv.totalCents, 0);

  // Build a map by month so we can render all 12 slots, even where no invoice exists yet.
  const byMonth = new Map(yearInvoices.map((inv) => [inv.referenceMonth.slice(5, 7), inv]));

  return (
    <div className="space-y-6">
      <Link
        href="/cartoes"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Voltar para cartões
      </Link>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <AccountIcon icon={card.icon} color={card.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{card.name}</h1>
            <p className="text-muted-foreground text-sm">
              {card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "—"}
              {" · "}
              fecha dia {card.closingDay} · vence dia {card.dueDay}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Limite</p>
            <p className="tabular text-2xl font-semibold">{format(card.limitCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Faturas em {year}</p>
            <p className="tabular text-lg">{format(totalYearCents)}</p>
            <p className="text-muted-foreground text-xs">
              {yearInvoices.length} {yearInvoices.length === 1 ? "fatura" : "faturas"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Pago em {year}</p>
            <p className="tabular text-income text-lg">{format(paidYearCents)}</p>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">Faturas {year}</h2>
          <YearSwitcher cardId={card.id} year={year} hasInvoicesIn={uniqueYears(invoices)} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => {
            const monthKey = String(i + 1).padStart(2, "0");
            const inv = byMonth.get(monthKey);
            return (
              <InvoiceTile
                key={monthKey}
                cardId={card.id}
                year={year}
                monthIndex={i}
                invoice={inv ?? null}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function InvoiceTile({
  cardId,
  year,
  monthIndex,
  invoice,
}: {
  cardId: string;
  year: number;
  monthIndex: number;
  invoice: InvoiceNavItem | null;
}) {
  const monthKey = String(monthIndex + 1).padStart(2, "0");
  const monthName = MONTH_NAMES[monthIndex] ?? "";
  const href = `/cartoes/${cardId}?mes=${year}-${monthKey}-01`;

  if (!invoice) {
    return (
      <div className="border-border/40 bg-muted/20 text-muted-foreground rounded-md border border-dashed p-3 text-sm">
        <p className="font-medium">{monthName}</p>
        <p className="tabular text-muted-foreground/70 text-xs">Sem fatura</p>
      </div>
    );
  }

  const tone = STATUS_TONE[invoice.status];
  const label = INVOICE_STATUS_LABEL[invoice.status];

  return (
    <Link
      href={href}
      className="hover:bg-accent bg-background flex flex-col gap-1.5 rounded-md border p-3 transition-colors"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{monthName}</p>
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", tone)}>
          {label}
        </span>
      </div>
      <p className="tabular text-lg font-semibold">{format(invoice.totalCents)}</p>
    </Link>
  );
}

function YearSwitcher({
  cardId,
  year,
  hasInvoicesIn,
}: {
  cardId: string;
  year: number;
  hasInvoicesIn: number[];
}) {
  const prev = year - 1;
  const next = year + 1;
  const canGoPrev = hasInvoicesIn.includes(prev);
  const canGoNext = hasInvoicesIn.includes(next);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={canGoPrev ? `/cartoes/${cardId}?ano=${prev}` : "#"}
        aria-disabled={!canGoPrev}
        tabIndex={canGoPrev ? 0 : -1}
        className={cn(
          "rounded-md px-2 py-1 text-xs",
          canGoPrev
            ? "hover:bg-accent text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/40 pointer-events-none",
        )}
      >
        ← {prev}
      </Link>
      <Link
        href={canGoNext ? `/cartoes/${cardId}?ano=${next}` : "#"}
        aria-disabled={!canGoNext}
        tabIndex={canGoNext ? 0 : -1}
        className={cn(
          "rounded-md px-2 py-1 text-xs",
          canGoNext
            ? "hover:bg-accent text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/40 pointer-events-none",
        )}
      >
        {next} →
      </Link>
    </div>
  );
}

function uniqueYears(invoices: InvoiceNavItem[]): number[] {
  const years = new Set<number>();
  for (const inv of invoices) {
    const y = Number(inv.referenceMonth.slice(0, 4));
    if (Number.isFinite(y)) years.add(y);
  }
  return Array.from(years);
}
