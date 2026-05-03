"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { togglePaidAction } from "@/features/transactions/actions";
import { markAllNotificationsReadAction } from "./actions";
import type { Notification } from "./queries";

type Props = {
  unread: Notification[];
  read: Notification[];
};

export function NotificationsList({ unread, read }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="text-muted-foreground text-sm">
            Contas a vencer, orçamentos no limite e outros avisos.
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={pending}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {unread.length === 0 && read.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Sem notificações no momento.</p>
        </Card>
      ) : (
        <>
          {unread.length > 0 && <Section title={`Não lidas (${unread.length})`} items={unread} />}
          {read.length > 0 && <Section title="Antigas" items={read} muted />}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: Notification[];
  muted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <Card className={muted ? "divide-y opacity-80" : "divide-y"}>
        {items.map((n) => (
          <div key={n.id} className="px-4 py-3">
            {n.kind === "bill" ? <BillItem n={n} /> : <BudgetItem n={n} />}
          </div>
        ))}
      </Card>
    </div>
  );
}

function BillItem({ n }: { n: Extract<Notification, { kind: "bill" }> }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isOverdue = n.status === "overdue";
  const isIncome = n.type === "income";

  function handleTogglePaid() {
    startTransition(async () => {
      const result = await togglePaidAction(n.transactionId, true);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isIncome ? "Recebimento confirmado" : "Pagamento confirmado");
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3">
      <span
        className={
          isOverdue
            ? "text-destructive mt-0.5"
            : isIncome
              ? "mt-0.5 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground mt-0.5"
        }
      >
        {isOverdue ? <AlertTriangle className="size-5" /> : <Clock className="size-5" />}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{n.description}</p>
        <p className="text-muted-foreground text-xs">
          {isIncome ? "A receber" : "A pagar"} · {formatMoney(n.amountCents)} ·{" "}
          {isOverdue
            ? `vencido há ${Math.abs(n.daysUntil)} dia${Math.abs(n.daysUntil) === 1 ? "" : "s"}`
            : n.daysUntil === 0
              ? "vence hoje"
              : `vence em ${n.daysUntil} dia${n.daysUntil === 1 ? "" : "s"}`}
        </p>
        {(n.accountName || n.categoryName) && (
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            {[n.categoryName, n.accountName].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={handleTogglePaid} disabled={pending}>
        <CheckCircle2 className="size-4" />
        <span className="ml-1.5">
          {pending ? "..." : isIncome ? "Marcar recebida" : "Marcar paga"}
        </span>
      </Button>
    </div>
  );
}

function BudgetItem({ n }: { n: Extract<Notification, { kind: "budget" }> }) {
  const isOver = n.threshold >= 100;
  return (
    <Link href="/orcamentos" className="flex items-start gap-3">
      <span className={isOver ? "text-destructive mt-0.5" : "mt-0.5 text-amber-500"}>
        <AlertTriangle className="size-5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {n.parentName ? `${n.parentName} › ${n.categoryName}` : n.categoryName}
        </p>
        <p className="text-muted-foreground text-xs">
          {isOver ? "Orçamento estourado" : `Atingiu ${n.threshold}% do limite`} ·{" "}
          {formatMoney(n.spentCents)} de {formatMoney(n.amountCents)}
        </p>
      </div>
    </Link>
  );
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
