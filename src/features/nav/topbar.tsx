import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import type { Notification } from "@/features/notifications/queries";
import { NewTransactionTrigger } from "@/features/transactions/new-transaction-trigger";
import { UserMenu } from "./user-menu";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null };
  notifications: { unread: Notification[]; unreadCount: number };
};

export function Topbar({ user, notifications }: Props) {
  return (
    <header className="bg-background/95 sticky top-0 z-40 flex h-14 w-full items-center gap-3 border-b px-4 backdrop-blur">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        FinPessoal
      </Link>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hidden md:inline-flex"
        aria-label="Buscar"
        disabled
      >
        <Search className="size-4" />
      </Button>

      <NotificationsBell unread={notifications.unread} unreadCount={notifications.unreadCount} />

      <NewTransactionTrigger size="sm" className="hidden lg:inline-flex" />

      <UserMenu {...user} />
    </header>
  );
}
