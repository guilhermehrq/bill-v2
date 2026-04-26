import { redirect } from "next/navigation";
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
    loadBudgetsOverview(user.id, month, settings.creditCardReportMode),
    listCategoriesWithCounts(user.id),
    listMonthsWithBudgets(user.id),
  ]);

  const categoryOptions = categoryNodes
    .filter((n) => n.type === "expense" && !n.archivedAt)
    .flatMap((n) => [
      {
        id: n.id,
        name: n.name,
        parentName: null as string | null,
        icon: n.icon,
        color: n.color,
        parentColor: null as string | null,
      },
      ...n.children
        .filter((c) => !c.archivedAt)
        .map((c) => ({
          id: c.id,
          name: c.name,
          parentName: n.name,
          icon: c.icon,
          color: c.color,
          parentColor: n.color,
        })),
    ]);

  const previousMonthHasData = months.includes(prev);

  return (
    <div className="py-4">
      <BudgetsView
        overview={overview}
        categoryOptions={categoryOptions}
        previousMonth={prev}
        previousMonthHasData={previousMonthHasData}
        creditCardMode={settings.creditCardReportMode}
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
