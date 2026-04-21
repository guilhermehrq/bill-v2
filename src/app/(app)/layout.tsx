import { redirect } from "next/navigation";
import { BottomNav } from "@/features/nav/bottom-nav";
import { Sidebar } from "@/features/nav/sidebar";
import { Topbar } from "@/features/nav/topbar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const name = metadata.full_name || user.email || "Usuário";

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
    </div>
  );
}
