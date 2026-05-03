import { redirect } from "next/navigation";
import type { BudgetTreeCategory } from "@/features/budgets/budget-tree-dialog";
import { BudgetsView } from "@/features/budgets/budgets-view";
import { listMonthsWithBudgets, loadBudgetsOverview } from "@/features/budgets/queries";
import { listCategoriesWithCounts } from "@/features/categories/queries";
import { getUserSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Orçamentos · FinPessoal" };

type SearchParams = Promise<{ mes?: string }>;

export default async function OrcamentosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monthParam = sp.mes ?? defaultMonthKey();
  const month = `${monthParam}-01`;
  const prev = previousMonth(month);

  const settings = await getUserSettings(user.id);
  const [overview, categoryNodes, months] = await Promise.all([
    loadBudgetsOverview(user.id, month, settings.creditCardReportMode, {
      includeForecasts: settings.showBudgetForecasts,
    }),
    listCategoriesWithCounts(user.id),
    listMonthsWithBudgets(user.id),
  ]);

  const categoryTree: BudgetTreeCategory[] = categoryNodes
    .filter((n) => n.type === "expense")
    .map((n) => ({
      id: n.id,
      name: n.name,
      icon: n.icon,
      color: n.color,
      type: n.type,
      archivedAt: n.archivedAt,
      children: n.children.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        archivedAt: c.archivedAt,
      })),
    }));

  const previousMonthHasData = months.includes(prev);

  return (
    <div className="py-4">
      <BudgetsView
        overview={overview}
        categoryTree={categoryTree}
        previousMonth={prev}
        previousMonthHasData={previousMonthHasData}
        creditCardMode={settings.creditCardReportMode}
        showForecasts={settings.showBudgetForecasts}
        budgetAlertThresholds={settings.budgetAlertThresholds}
      />
    </div>
  );
}

function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(monthYYYYMMDD: string): string {
  const [y, m] = monthYYYYMMDD.split("-").map(Number) as [number, number, number];
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
