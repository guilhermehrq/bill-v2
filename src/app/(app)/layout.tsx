import { redirect } from "next/navigation";
import { listFormCardOptions } from "@/features/cards/queries";
import { BottomNav } from "@/features/nav/bottom-nav";
import { KeyboardShortcuts } from "@/features/nav/keyboard-shortcuts";
import { Sidebar } from "@/features/nav/sidebar";
import { Topbar } from "@/features/nav/topbar";
import { getUserSettings } from "@/features/settings/queries";
import { ThemeApplier } from "@/features/settings/theme-applier";
import { listFormAccountOptions, listFormCategoryOptions } from "@/features/transactions/queries";
import { TransactionDrawer } from "@/features/transactions/transaction-drawer";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const name = metadata.full_name || user.email || "Usuário";

  const [accounts, categories, cards, settings] = await Promise.all([
    listFormAccountOptions(user.id),
    listFormCategoryOptions(user.id),
    listFormCardOptions(user.id),
    getUserSettings(user.id),
  ]);

  return (
    <div className="bg-background min-h-dvh">
      <Topbar
        user={{
          name,
          email: user.email ?? "",
          avatarUrl: metadata.avatar_url ?? null,
        }}
      />
      <Sidebar />
      <main className="flex-1 pt-4 pb-20 lg:pb-6 lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">{children}</div>
      </main>
      <BottomNav />
      <TransactionDrawer accounts={accounts} cards={cards} categories={categories} />
      <ThemeApplier theme={settings.theme} />
      <KeyboardShortcuts />
    </div>
  );
}
