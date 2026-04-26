"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: c.parentName ? `${c.parentName} › ${c.name}` : c.name,
      })),
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
    const c = categoryOptions.find((x) => x.id === categoryId);
    if (c) activeChips.push({ key: "category", label: `Categoria: ${c.label}` });
  }
  if (initialQuery) activeChips.push({ key: "q", label: `"${initialQuery}"` });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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

        <Select
          value={accountId}
          onValueChange={(v) => pushParams({ account: v })}
          items={[
            { value: "all", label: "Todas contas" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryId}
          onValueChange={(v) => pushParams({ category: v })}
          items={[
            { value: "all", label: "Todas categorias" },
            ...categoryOptions.map((c) => ({ value: c.id, label: c.label })),
          ]}
        >
          <SelectTrigger size="sm" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">Todas categorias</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) => pushParams({ type: v })}
          items={[
            { value: "all", label: "Todos tipos" },
            { value: "income", label: "Receitas" },
            { value: "expense", label: "Despesas" },
            { value: "transfer", label: "Transferências" },
          ]}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>

        <form onSubmit={submitSearch} className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descrição..."
            className="pl-8"
          />
        </form>
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
