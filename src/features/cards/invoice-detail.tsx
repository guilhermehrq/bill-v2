"use client";

import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InvoiceDetail, InvoiceNavItem } from "./invoice-queries";
import { deriveInvoiceStatus, INVOICE_STATUS_LABEL } from "./invoice-status";
import { PayInvoiceDialog } from "./pay-invoice-dialog";

type Props = {
  invoice: InvoiceDetail | null;
  card: {
    id: string;
    name: string;
    color: string | null;
    closingDay: number;
    dueDay: number;
    defaultAccountId: string | null;
  };
  currentMonth: string;
  invoices: InvoiceNavItem[];
  accounts: Array<{ id: string; name: string }>;
};

const STATUS_TONE: Record<
  ReturnType<typeof deriveInvoiceStatus>,
  "default" | "income" | "expense" | "pending"
> = {
  paid: "income",
  partial: "pending",
  current: "default",
  future: "default",
  overdue: "expense",
};

export function InvoiceDetailView({ invoice, card, currentMonth, invoices, accounts }: Props) {
  const [payOpen, setPayOpen] = useState(false);

  const currentIndex = invoices.findIndex((i) => i.referenceMonth === currentMonth);
  const prev = currentIndex >= 0 ? invoices[currentIndex + 1] : null;
  const next = currentIndex > 0 ? invoices[currentIndex - 1] : null;

  const monthLabel = formatMonthYear(currentMonth);
  const remaining = invoice ? invoice.totalCents - invoice.paidCents : 0;
  const canPay = invoice != null && remaining > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: card.color ?? "#6366f1" }}
        >
          <CreditCard className="size-6 text-white" />
        </div>
        <div className="flex-1">
          <Link href="/cartoes" className="text-muted-foreground hover:text-foreground text-xs">
            ← Cartões
          </Link>
          <h1 className="text-2xl font-semibold">{card.name}</h1>
          <p className="text-muted-foreground text-sm">Fatura de {monthLabel}</p>
        </div>
        {canPay && <Button onClick={() => setPayOpen(true)}>Pagar fatura</Button>}
      </div>

      <div className="flex items-center gap-1">
        {prev ? (
          <Link
            href={`/cartoes/${card.id}?mes=${prev.referenceMonth}`}
            aria-label="Fatura anterior"
            className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <Button variant="ghost" size="icon" disabled>
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <span className="tabular px-3 text-sm font-medium">{monthLabel}</span>
        {next ? (
          <Link
            href={`/cartoes/${card.id}?mes=${next.referenceMonth}`}
            aria-label="Próxima fatura"
            className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <Button variant="ghost" size="icon" disabled>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {!invoice ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma fatura para {monthLabel}. Lance uma compra no cartão para gerar uma fatura
            automaticamente.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-muted-foreground text-xs uppercase">Total</p>
              <p className="tabular text-2xl font-semibold">{format(invoice.totalCents)}</p>
              <p className="text-muted-foreground text-xs">
                {invoice.transactions.length}{" "}
                {invoice.transactions.length === 1 ? "transação" : "transações"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-muted-foreground text-xs uppercase">Fechamento</p>
              <p className="tabular text-lg font-semibold">{formatDate(invoice.closingDate)}</p>
              <p className="text-muted-foreground text-xs">vence {formatDate(invoice.dueDate)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-muted-foreground text-xs uppercase">Status</p>
              {(() => {
                const derived = deriveInvoiceStatus(
                  {
                    paidCents: invoice.paidCents,
                    totalCents: invoice.totalCents,
                    referenceMonth: invoice.referenceMonth,
                  },
                  card.closingDay,
                );
                const tone = STATUS_TONE[derived];
                return (
                  <p
                    className={cn(
                      "text-base font-semibold",
                      tone === "income" && "text-income",
                      tone === "expense" && "text-expense",
                      tone === "pending" && "text-pending",
                    )}
                  >
                    {INVOICE_STATUS_LABEL[derived]}
                  </p>
                );
              })()}
              {invoice.paidCents > 0 && (
                <p className="text-muted-foreground text-xs">
                  {format(invoice.paidCents)} pagos · {format(remaining)} devido
                </p>
              )}
            </Card>
          </div>

          {invoice.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoice.byCategory.slice(0, 6).map((cat) => (
                  <div key={cat.categoryName} className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? "#6366f1" }}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-sm">{cat.categoryName}</span>
                    <span className="tabular text-sm font-medium">{format(cat.totalCents)}</span>
                    <span className="text-muted-foreground tabular w-10 text-right text-xs">
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Transações ({invoice.transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {invoice.transactions.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">Nenhuma transação nesta fatura.</p>
              ) : (
                invoice.transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.category?.color ?? "#6366f1" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {t.category?.parentName
                          ? `${t.category.parentName} › ${t.category.name}`
                          : (t.category?.name ?? "Sem categoria")}
                        {t.installmentTotal && ` · ${t.installmentNumber}/${t.installmentTotal}`}
                      </p>
                    </div>
                    <p className="tabular text-muted-foreground shrink-0 text-xs">
                      {formatDate(t.date)}
                    </p>
                    <p className="tabular shrink-0 text-sm font-semibold">
                      {format(t.amountCents)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <PayInvoiceDialog
            open={payOpen}
            onOpenChange={setPayOpen}
            invoiceId={invoice.id}
            totalCents={invoice.totalCents}
            paidCents={invoice.paidCents}
            dueDate={invoice.dueDate}
            defaultAccountId={card.defaultAccountId}
            accounts={accounts}
          />
        </>
      )}
    </div>
  );
}

function formatMonthYear(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number, number];
  const names = [
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
  return `${names[m - 1]} ${y}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y!.slice(-2)}`;
}
