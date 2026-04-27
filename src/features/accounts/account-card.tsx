"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { AccountIcon } from "@/components/ui/account-icon";
import { Button } from "@/components/ui/button";
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
import { deleteAccountAction, setAccountArchivedAction } from "./actions";
import type { AccountWithBalance } from "./queries";
import { ACCOUNT_TYPES } from "./types";

type Props = {
  account: AccountWithBalance;
  onEdit: () => void;
};

export function AccountCard({ account, onEdit }: Props) {
  const [isPending, startTransition] = useTransition();

  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;
  const isNegative = account.balanceCents < 0;

  function handleArchive() {
    startTransition(async () => {
      const result = await setAccountArchivedAction(account.id, !account.archived);
      if (result.ok) {
        toast.success(account.archived ? "Conta desarquivada" : "Conta arquivada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Excluir a conta "${account.name}"? Transações relacionadas serão removidas. Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAccountAction(account.id);
      if (result.ok) {
        toast.success("Conta excluída");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className={cn("relative flex flex-col gap-2 p-4", account.archived && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/contas/${account.id}`}
          className="hover:bg-accent/40 -m-1 flex flex-1 items-center gap-3 rounded-md p-1 transition-colors"
        >
          <AccountIcon icon={account.icon} color={account.color} size="md" />
          <div className="min-w-0">
            <h3 className="truncate text-sm leading-tight font-semibold">{account.name}</h3>
            <p className="text-muted-foreground truncate text-xs">
              {typeLabel}
              {account.institution ? ` · ${account.institution}` : ""}
              {!account.includeInTotalBalance && " · fora do saldo"}
            </p>
          </div>
        </Link>
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
              {account.archived ? (
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

      <div className="mt-2">
        <p
          className={cn(
            "tabular text-2xl font-semibold",
            isNegative ? "text-expense" : "text-foreground",
          )}
        >
          {format(account.balanceCents)}
        </p>
        <p className="text-muted-foreground text-xs">
          {account.transactionCount === 0
            ? "sem transações"
            : `${account.transactionCount} ${account.transactionCount === 1 ? "transação" : "transações"}`}
        </p>
      </div>
    </Card>
  );
}

export function NewAccountCard({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:border-foreground/50 h-auto min-h-[128px] flex-col gap-2 border-dashed"
    >
      <span className="text-2xl">+</span>
      <span className="text-sm">Nova conta</span>
    </Button>
  );
}
