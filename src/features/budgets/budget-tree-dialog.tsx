"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { bulkUpsertBudgetsAction } from "./actions";

export type BudgetTreeCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: "income" | "expense";
  archivedAt: Date | string | null;
  children: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    archivedAt: Date | string | null;
  }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  monthLabel: string;
  categories: BudgetTreeCategory[];
  existingByCategoryId: Record<string, number>; // amount cents
};

export function BudgetTreeDialog({
  open,
  onOpenChange,
  month,
  monthLabel,
  categories,
  existingByCategoryId,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(new Set());

  const expenseTree = useMemo(
    () =>
      categories
        .filter((n) => n.type === "expense" && !n.archivedAt)
        .map((n) => ({ ...n, children: n.children.filter((c) => !c.archivedAt) })),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    setDrafts({ ...existingByCategoryId });
    // Auto-open inputs for categories that already have a budget.
    setOpenCategoryIds(new Set(Object.keys(existingByCategoryId)));
    setError(null);
  }, [open, existingByCategoryId]);

  function setAmount(categoryId: string, amountCents: number) {
    setDrafts((prev) => ({ ...prev, [categoryId]: amountCents }));
  }

  function openInput(categoryId: string) {
    setOpenCategoryIds((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });
  }

  function removeBudget(categoryId: string) {
    setOpenCategoryIds((prev) => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      // Mark for deletion if it existed; otherwise just drop it.
      if (existingByCategoryId[categoryId] !== undefined) {
        next[categoryId] = 0;
      } else {
        delete next[categoryId];
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);

    const entries: Array<{ categoryId: string; amountCents: number }> = [];
    for (const [categoryId, amountCents] of Object.entries(drafts)) {
      const previous = existingByCategoryId[categoryId] ?? 0;
      if (amountCents === 0 && previous === 0) continue; // nothing to do
      if (amountCents === previous) continue; // unchanged
      entries.push({ categoryId, amountCents });
    }

    if (entries.length === 0) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      const result = await bulkUpsertBudgetsAction({ month, entries });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { saved, deleted } = result.data;
      toast.success(
        deleted > 0 && saved === 0
          ? `${deleted} ${deleted === 1 ? "orçamento removido" : "orçamentos removidos"}`
          : saved > 0 && deleted === 0
            ? `${saved} ${saved === 1 ? "orçamento salvo" : "orçamentos salvos"}`
            : `${saved} salvos · ${deleted} removidos`,
      );
      onOpenChange(false);
    });
  }

  const totalCents = Object.entries(drafts).reduce((acc, [, v]) => acc + (v > 0 ? v : 0), 0);
  const definedCount = Object.entries(drafts).filter(([, v]) => v > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Definir orçamentos — {monthLabel}</DialogTitle>
          <DialogDescription>
            Escolha o limite para cada categoria de despesa. Use o botão + ao lado de uma
            subcategoria para definir um limite específico para ela.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="-mx-2 max-h-[55vh] overflow-y-auto px-2">
          {expenseTree.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhuma categoria de despesa cadastrada.
            </p>
          ) : (
            <div className="space-y-2">
              {expenseTree.map((node) => (
                <CategoryNodeRow
                  key={node.id}
                  node={node}
                  drafts={drafts}
                  openIds={openCategoryIds}
                  onOpen={openInput}
                  onRemove={removeBudget}
                  onChangeAmount={setAmount}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
          <span>
            {definedCount === 0
              ? "Nenhum limite definido"
              : `${definedCount} ${definedCount === 1 ? "categoria" : "categorias"} com limite`}
          </span>
          <span className="tabular">Total orçado: {formatMoney(totalCents)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar orçamentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryNodeRow({
  node,
  drafts,
  openIds,
  onOpen,
  onRemove,
  onChangeAmount,
}: {
  node: BudgetTreeCategory;
  drafts: Record<string, number>;
  openIds: Set<string>;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onChangeAmount: (id: string, cents: number) => void;
}) {
  return (
    <div className="rounded-md border">
      <CategoryEditableRow
        id={node.id}
        name={node.name}
        icon={node.icon}
        color={node.color}
        drafts={drafts}
        openIds={openIds}
        onOpen={onOpen}
        onRemove={onRemove}
        onChangeAmount={onChangeAmount}
      />
      {node.children.length > 0 && (
        <div className="border-t">
          {node.children.map((child) => (
            <div key={child.id} className="border-b last:border-b-0">
              <CategoryEditableRow
                id={child.id}
                name={child.name}
                icon={child.icon}
                color={child.color}
                drafts={drafts}
                openIds={openIds}
                onOpen={onOpen}
                onRemove={onRemove}
                onChangeAmount={onChangeAmount}
                indent
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryEditableRow({
  id,
  name,
  icon,
  color,
  drafts,
  openIds,
  onOpen,
  onRemove,
  onChangeAmount,
  indent = false,
}: {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  drafts: Record<string, number>;
  openIds: Set<string>;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onChangeAmount: (id: string, cents: number) => void;
  indent?: boolean;
}) {
  const Icon = getIconComponent(icon);
  const c = color ?? "#6366f1";
  const value = drafts[id] ?? 0;
  const hasInput = openIds.has(id);

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2", indent && "pl-9")}>
      {indent && <span className="text-muted-foreground">└─</span>}
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border",
          indent ? "size-6" : "size-7",
        )}
        style={{ borderColor: `${c}40`, color: c, backgroundColor: `${c}1a` }}
        aria-hidden
      >
        {Icon ? (
          <Icon className={indent ? "size-3" : "size-3.5"} />
        ) : (
          <span className="block size-1.5 rounded-full" style={{ backgroundColor: c }} />
        )}
      </span>
      <span className={cn("flex-1 truncate text-sm", indent && "text-muted-foreground")}>
        {name}
      </span>
      {hasInput ? (
        <div className="flex items-center gap-1">
          <MoneyInput
            valueCents={value}
            onChange={(v) => onChangeAmount(id, v)}
            className="h-8 w-32 text-right text-sm"
            autoFocus={value === 0}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(id)}
            aria-label="Remover limite"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onOpen(id);
            if (drafts[id] === undefined) onChangeAmount(id, 0);
          }}
        >
          <Plus className="size-3.5" />
          <span className="ml-1">Definir limite</span>
        </Button>
      )}
    </div>
  );
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
