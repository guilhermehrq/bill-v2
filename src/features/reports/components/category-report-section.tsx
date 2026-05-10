"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { getIconComponent } from "@/lib/icons";
import { format as formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { loadCategoryReportTransactionsAction, type CategoryReportTransaction } from "../actions";
import type { CategoryGroupRow } from "../queries";
import { CategoryPieChart } from "./category-pie-chart";

type Props = {
  title: string;
  groups: CategoryGroupRow[];
  totalCents: number;
  tone: "expense" | "income";
  type: "expense" | "income";
  from: string;
  to: string;
  emptyMessage: string;
};

// Identifier for the synthetic "Sem subcategoria" item that surfaces
// transactions tagged directly to the parent.
const PARENT_DIRECT_SUFFIX = ":parent-direct";

export function CategoryReportSection({
  title,
  groups,
  totalCents,
  tone,
  type,
  from,
  to,
  emptyMessage,
}: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedLeaf, setExpandedLeaf] = useState<string | null>(null);
  const [transactionsCache, setTransactionsCache] = useState<
    Record<string, CategoryReportTransaction[]>
  >({});
  const [loadingLeaf, setLoadingLeaf] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groupKey = (g: CategoryGroupRow) => g.parentCategoryId ?? "__uncategorized__";

  function fetchTransactions(leafKey: string, leafCategoryId: string | null) {
    if (transactionsCache[leafKey]) return;
    setLoadingLeaf(leafKey);
    startTransition(async () => {
      const result = await loadCategoryReportTransactionsAction({
        categoryId: leafCategoryId,
        from,
        to,
        type,
      });
      setLoadingLeaf((curr) => (curr === leafKey ? null : curr));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTransactionsCache((cache) => ({ ...cache, [leafKey]: result.data }));
    });
  }

  function toggleGroup(g: CategoryGroupRow) {
    const key = groupKey(g);
    if (expandedGroup === key) {
      setExpandedGroup(null);
      setExpandedLeaf(null);
      return;
    }
    setExpandedGroup(key);
    setExpandedLeaf(null);
    // If the group has no subcategories, the parent itself is the leaf —
    // fetch its transactions immediately.
    if (g.children.length === 0 && g.parentDirectCents > 0) {
      const leafKey = `${key}${PARENT_DIRECT_SUFFIX}`;
      setExpandedLeaf(leafKey);
      fetchTransactions(leafKey, g.parentCategoryId);
    }
  }

  function toggleLeaf(leafKey: string, leafCategoryId: string | null) {
    if (expandedLeaf === leafKey) {
      setExpandedLeaf(null);
      return;
    }
    setExpandedLeaf(leafKey);
    fetchTransactions(leafKey, leafCategoryId);
  }

  const toneClass = tone === "income" ? "text-income" : "text-expense";

  return (
    <Card className="space-y-0 overflow-hidden p-0">
      <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        <p className={`tabular text-sm font-semibold ${toneClass}`}>{formatMoney(totalCents)}</p>
      </div>

      {groups.length === 0 || totalCents === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_320px]">
          <ul className="divide-border divide-y" role="list">
            {groups.map((g) => {
              const key = groupKey(g);
              const isExpanded = expandedGroup === key;
              const pct = totalCents > 0 ? (g.totalCents / totalCents) * 100 : 0;
              return (
                <li key={key}>
                  <GroupRow
                    group={g}
                    expanded={isExpanded}
                    pct={pct}
                    onToggle={() => toggleGroup(g)}
                    tone={tone}
                  />
                  {isExpanded &&
                    (g.children.length === 0 ? (
                      // No subcategories — show transactions directly.
                      (() => {
                        const leafKey = `${key}${PARENT_DIRECT_SUFFIX}`;
                        return (
                          <div className="bg-muted/30 border-border border-t">
                            <TransactionList
                              transactions={transactionsCache[leafKey]}
                              loading={loadingLeaf === leafKey}
                            />
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-muted/30 border-border border-t">
                        <ul className="divide-border divide-y" role="list">
                          {g.children.map((child) => {
                            const leafKey = `${key}:${child.categoryId}`;
                            const leafExpanded = expandedLeaf === leafKey;
                            const leafLoading = loadingLeaf === leafKey;
                            return (
                              <li key={leafKey}>
                                <LeafRow
                                  name={child.name}
                                  color={child.color}
                                  icon={child.icon}
                                  amountCents={child.totalCents}
                                  count={child.count}
                                  expanded={leafExpanded}
                                  loading={leafLoading}
                                  onToggle={() => toggleLeaf(leafKey, child.categoryId)}
                                />
                                {leafExpanded && (
                                  <TransactionList
                                    transactions={transactionsCache[leafKey]}
                                    loading={leafLoading}
                                  />
                                )}
                              </li>
                            );
                          })}
                          {g.parentDirectCents > 0 &&
                            (() => {
                              const leafKey = `${key}${PARENT_DIRECT_SUFFIX}`;
                              const leafExpanded = expandedLeaf === leafKey;
                              const leafLoading = loadingLeaf === leafKey;
                              return (
                                <li>
                                  <LeafRow
                                    name="Sem subcategoria"
                                    color={g.color}
                                    icon={null}
                                    amountCents={g.parentDirectCents}
                                    count={g.parentDirectCount}
                                    expanded={leafExpanded}
                                    loading={leafLoading}
                                    onToggle={() => toggleLeaf(leafKey, g.parentCategoryId)}
                                  />
                                  {leafExpanded && (
                                    <TransactionList
                                      transactions={transactionsCache[leafKey]}
                                      loading={leafLoading}
                                    />
                                  )}
                                </li>
                              );
                            })()}
                        </ul>
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
          <div className="md:border-border md:border-l md:pl-4">
            <CategoryPieChart groups={groups} totalCents={totalCents} tone={tone} />
          </div>
        </div>
      )}
    </Card>
  );
}

function GroupRow({
  group,
  expanded,
  pct,
  onToggle,
  tone,
}: {
  group: CategoryGroupRow;
  expanded: boolean;
  pct: number;
  onToggle: () => void;
  tone: "expense" | "income";
}) {
  const Icon = getIconComponent(group.icon);
  const color = group.color ?? "#6366f1";
  const toneClass = tone === "income" ? "text-income" : "";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="hover:bg-accent/40 flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
    >
      <ChevronRight
        className={cn(
          "text-muted-foreground size-4 shrink-0 transition-transform",
          expanded && "rotate-90",
        )}
        aria-hidden
      />
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color, color: "#ffffff" }}
        aria-hidden
      >
        {Icon ? (
          <Icon className="size-4" />
        ) : (
          <span className="text-xs font-semibold">{group.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="flex-1 truncate font-medium">{group.name}</span>
      <span className="tabular text-right">
        <span className={`block font-semibold ${toneClass}`}>{formatMoney(group.totalCents)}</span>
        <span className="text-muted-foreground block text-[11px]">{pct.toFixed(2)}%</span>
      </span>
    </button>
  );
}

function LeafRow({
  name,
  color,
  icon,
  amountCents,
  count,
  expanded,
  loading,
  onToggle,
}: {
  name: string;
  color: string | null;
  icon: string | null;
  amountCents: number;
  count: number;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const Icon = getIconComponent(icon);
  const dotColor = color ?? "var(--muted-foreground)";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="hover:bg-accent/40 flex w-full items-center gap-3 py-2 pr-3 pl-9 text-left text-sm transition-colors"
    >
      <ChevronRight
        className={cn(
          "text-muted-foreground size-3.5 shrink-0 transition-transform",
          expanded && "rotate-90",
        )}
        aria-hidden
      />
      {Icon ? (
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: dotColor, color: "#ffffff" }}
          aria-hidden
        >
          <Icon className="size-3" />
        </span>
      ) : (
        <span
          className="block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
      )}
      <span className="text-muted-foreground flex-1 truncate">{name}</span>
      <span className="text-muted-foreground hidden text-[11px] sm:inline">
        {count} {count === 1 ? "lançamento" : "lançamentos"}
      </span>
      {loading && <Loader2 className="text-muted-foreground size-3 animate-spin" aria-hidden />}
      <span className="tabular text-right text-sm font-medium">{formatMoney(amountCents)}</span>
    </button>
  );
}

function TransactionList({
  transactions,
  loading,
}: {
  transactions: CategoryReportTransaction[] | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 pl-12 text-xs">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Carregando lançamentos...
      </div>
    );
  }

  if (!transactions) return null;

  if (transactions.length === 0) {
    return <p className="text-muted-foreground py-3 pl-12 text-xs">Nenhum lançamento.</p>;
  }

  return (
    <ul className="bg-background/60 divide-border divide-y" role="list">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2 pr-4 pl-12 text-xs">
          <span className="text-muted-foreground tabular shrink-0">{formatBrDate(t.date)}</span>
          <span className="flex-1 truncate">
            {t.description}
            {t.installmentTotal && t.installmentNumber && (
              <span className="text-muted-foreground">
                {" "}
                ({t.installmentNumber}/{t.installmentTotal})
              </span>
            )}
          </span>
          <span className="text-muted-foreground hidden truncate sm:inline">
            {t.cardName ?? t.accountName ?? ""}
          </span>
          <span className="tabular shrink-0 text-right font-medium">
            {formatMoney(t.amountCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${(y ?? "").slice(2)}`;
}
