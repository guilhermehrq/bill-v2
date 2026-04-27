"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { AccountIcon } from "@/components/ui/account-icon";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteCardAction, setCardArchivedAction } from "./actions";
import type { CardWithInvoice } from "./queries";

type Props = {
  card: CardWithInvoice;
  onEdit: () => void;
};

export function CreditCardDisplay({ card, onEdit }: Props) {
  const [isPending, startTransition] = useTransition();

  const limitUsedPct = card.limitUsedPct;
  const statusTone =
    limitUsedPct >= 90
      ? "text-expense"
      : limitUsedPct >= 70
        ? "text-pending"
        : "text-muted-foreground";

  function handleArchive() {
    startTransition(async () => {
      const result = await setCardArchivedAction(card.id, !card.archived);
      if (result.ok) toast.success(card.archived ? "Cartão desarquivado" : "Cartão arquivado");
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Excluir o cartão "${card.name}"? Todas as faturas e transações vinculadas serão removidas.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCardAction(card.id);
      if (result.ok) toast.success("Cartão excluído");
      else toast.error(result.error);
    });
  }

  return (
    <Card className={cn("p-4", card.archived && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Link
          href={`/cartoes/${card.id}`}
          className="shrink-0 transition-transform hover:scale-105"
          aria-label={`Abrir cartão ${card.name}`}
        >
          <AccountIcon icon={card.icon} color={card.color} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/cartoes/${card.id}`} className="hover:underline">
            <h3 className="truncate text-base font-semibold">{card.name}</h3>
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "—"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent rounded-md p-1 outline-hidden"
            aria-label="Ações"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} disabled={isPending}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} disabled={isPending}>
              {card.archived ? (
                <>
                  <ArchiveRestore /> Desarquivar
                </>
              ) : (
                <>
                  <Archive /> Arquivar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase">Fatura atual</p>
          <p className="tabular text-xl font-semibold">
            {format(card.currentInvoice?.totalCents ?? 0)}
          </p>
          {card.currentInvoice && (
            <p className="text-muted-foreground text-xs">
              fecha dia {card.closingDay} · vence dia {card.dueDay}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Limite</span>
            <span className={cn("tabular font-medium", statusTone)}>
              {limitUsedPct}% de {format(card.limitCents)}
            </span>
          </div>
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full transition-all",
                limitUsedPct >= 90 ? "bg-expense" : limitUsedPct >= 70 ? "bg-pending" : "bg-brand",
              )}
              style={{ width: `${limitUsedPct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
