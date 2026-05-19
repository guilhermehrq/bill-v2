"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/searchable-select";
import { buildCategoryOptions } from "./category-options";
import type { FormAccountOption, FormCategoryOption } from "./types";

type Props = {
  accounts: FormAccountOption[];
  categories: FormCategoryOption[];
};

const TYPE_LABELS: Record<string, string> = {
  income: "Receitas",
  expense: "Despesas",
  transfer: "Transferências",
};

export function TransactionFilters({ accounts, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMonth = searchParams.get("month") ?? defaultMonth();
  const accountId = searchParams.get("account") ?? "all";
  const categoryId = searchParams.get("category") ?? "all";
  const type = searchParams.get("type") ?? "all";
  const initialQuery = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(initialQuery);

  const accountItems = useMemo<SearchableSelectItem[]>(
    () => [
      { value: "all", label: "Todas" },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts],
  );

  const categoryItems = useMemo<SearchableSelectItem[]>(
    () => [{ value: "all", label: "Todas" }, ...buildCategoryOptions(categories)],
    [categories],
  );

  function pushParams(update: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(update)) {
      if (value === null || value === "" || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function shiftMonth(delta: number) {
    const [y, m] = currentMonth.split("-").map(Number);
    const newDate = new Date(y!, m! - 1 + delta, 1);
    const next = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`;
    pushParams({ month: next });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: search.trim() || null });
  }

  const activeChips: Array<{ key: string; label: string }> = [];
  if (type !== "all")
    activeChips.push({ key: "type", label: `Tipo: ${TYPE_LABELS[type] ?? type}` });
  if (accountId !== "all") {
    const a = accounts.find((x) => x.id === accountId);
    if (a) activeChips.push({ key: "account", label: `Conta: ${a.name}` });
  }
  if (categoryId !== "all") {
    const c = categories.find((x) => x.id === categoryId);
    if (c) {
      const label = c.parentName ? `${c.parentName} › ${c.name}` : c.name;
      activeChips.push({ key: "category", label: `Categoria: ${label}` });
    }
  }
  if (initialQuery) activeChips.push({ key: "q", label: `"${initialQuery}"` });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_1fr_1fr_2fr]">
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="invisible text-xs font-medium">.</span>
          <div className="flex items-center gap-1 rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular min-w-[9ch] text-center text-sm font-medium">
              {formatMonthLabel(currentMonth)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftMonth(1)}
              aria-label="Mês seguinte"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-account" className="text-xs font-medium">
            Conta
          </Label>
          <SearchableSelect
            id="filter-account"
            value={accountId}
            onValueChange={(v) => pushParams({ account: v ?? "all" })}
            items={accountItems}
            placeholder="Todas"
            searchPlaceholder="Buscar conta…"
            emptyMessage="Nenhuma conta encontrada"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category" className="text-xs font-medium">
            Categoria
          </Label>
          <SearchableSelect
            id="filter-category"
            value={categoryId}
            onValueChange={(v) => pushParams({ category: v ?? "all" })}
            items={categoryItems}
            placeholder="Todas"
            searchPlaceholder="Buscar categoria…"
            emptyMessage="Nenhuma categoria encontrada"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-type" className="text-xs font-medium">
            Tipo
          </Label>
          <Select
            value={type}
            onValueChange={(v) => pushParams({ type: v })}
            items={[
              { value: "all", label: "Todos" },
              { value: "income", label: "Receitas" },
              { value: "expense", label: "Despesas" },
              { value: "transfer", label: "Transferências" },
            ]}
          >
            <SelectTrigger id="filter-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="transfer">Transferências</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="filter-search" className="text-xs font-medium">
            Busca
          </Label>
          <form onSubmit={submitSearch} className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-2 left-2 size-4"
              aria-hidden
            />
            <Input
              id="filter-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descrição..."
              className="pl-8"
            />
          </form>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => pushParams({ [chip.key]: null })}
              className="bg-secondary hover:bg-secondary/80 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => pushParams({ type: null, account: null, category: null, q: null })}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {isPending && <p className="text-muted-foreground text-xs">Atualizando...</p>}
    </div>
  );
}

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y!, m! - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}
