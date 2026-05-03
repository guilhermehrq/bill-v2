"use client";

import { Bell, CheckCircle2, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { togglePaidAction } from "@/features/transactions/actions";
import { markAllNotificationsReadAction } from "./actions";
import type { Notification } from "./queries";

type Props = {
  unread: Notification[];
  unreadCount: number;
};

export function NotificationsBell({ unread, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && unreadCount > 0) {
      // Mark as read when closing the dropdown.
      startTransition(async () => {
        await markAllNotificationsReadAction();
        router.refresh();
      });
    }
  }

  const top = unread.slice(0, 8);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className="hover:bg-accent text-muted-foreground hover:text-foreground relative inline-flex size-9 items-center justify-center rounded-md outline-hidden md:inline-flex"
        aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : "Notificações"}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <span className="text-muted-foreground text-xs">{unreadCount} não lidas</span>
          )}
        </div>
        <div className="border-t" />

        {top.length === 0 ? (
          <div className="text-muted-foreground px-3 py-6 text-center text-sm">
            Sem novidades. 🎉
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {top.map((n) => (
              <li key={n.id} className="border-b last:border-b-0">
                {n.kind === "bill" ? (
                  <BillRow notification={n} onAfter={() => setOpen(false)} />
                ) : (
                  <BudgetRow notification={n} onAfter={() => setOpen(false)} />
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t p-2">
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="hover:bg-accent flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
          >
            <span>Ver notificações antigas</span>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BillRow({
  notification,
  onAfter,
}: {
  notification: Extract<Notification, { kind: "bill" }>;
  onAfter: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isOverdue = notification.status === "overdue";
  const isIncome = notification.type === "income";

  function handleTogglePaid() {
    startTransition(async () => {
      const result = await togglePaidAction(notification.transactionId, true);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isIncome ? "Recebimento confirmado" : "Pagamento confirmado");
      router.refresh();
      onAfter();
    });
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      <span
        className={
          isOverdue
            ? "text-destructive mt-0.5"
            : isIncome
              ? "mt-0.5 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground mt-0.5"
        }
      >
        {isOverdue ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{notification.description}</p>
        <p className="text-muted-foreground text-xs">
          {isIncome ? "A receber" : "A pagar"} ·{" "}
          {isOverdue
            ? `vencido há ${Math.abs(notification.daysUntil)} ${
                Math.abs(notification.daysUntil) === 1 ? "dia" : "dias"
              }`
            : notification.daysUntil === 0
              ? "vence hoje"
              : `vence em ${notification.daysUntil} ${notification.daysUntil === 1 ? "dia" : "dias"}`}{" "}
          · {formatMoney(notification.amountCents)}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={handleTogglePaid}
        disabled={pending}
      >
        <CheckCircle2 className="size-3.5" />
        <span className="ml-1 hidden sm:inline">{isIncome ? "Recebida" : "Paga"}</span>
      </Button>
    </div>
  );
}

function BudgetRow({
  notification,
  onAfter,
}: {
  notification: Extract<Notification, { kind: "budget" }>;
  onAfter: () => void;
}) {
  const isOver = notification.threshold >= 100;
  return (
    <Link
      href="/orcamentos"
      onClick={onAfter}
      className="hover:bg-accent flex items-start gap-2 px-3 py-2.5"
    >
      <span className={isOver ? "text-destructive mt-0.5" : "mt-0.5 text-amber-500"}>
        <AlertTriangle className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {notification.parentName
            ? `${notification.parentName} › ${notification.categoryName}`
            : notification.categoryName}
        </p>
        <p className="text-muted-foreground text-xs">
          {isOver ? "Estourou o orçamento" : `Atingiu ${notification.threshold}% do orçamento`} ·{" "}
          {formatMoney(notification.spentCents)} de {formatMoney(notification.amountCents)}
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
