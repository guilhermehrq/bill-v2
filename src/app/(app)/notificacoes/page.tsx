import { redirect } from "next/navigation";
import { NotificationsList } from "@/features/notifications/notifications-list";
import { loadNotifications } from "@/features/notifications/queries";
import { getUserSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notificações · FinPessoal" };

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getUserSettings(user.id);
  const notifications = await loadNotifications(user.id, {
    notificationsLastSeenAt: settings.notificationsLastSeenAt,
    budgetAlertThresholds: settings.budgetAlertThresholds,
    creditCardReportMode: settings.creditCardReportMode,
  });

  return (
    <div className="max-w-3xl py-4">
      <NotificationsList unread={notifications.unread} read={notifications.read} />
    </div>
  );
}
