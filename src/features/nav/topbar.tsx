import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

type Props = {
  user: { name: string; email: string; avatarUrl?: string | null };
};

export function Topbar({ user }: Props) {
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

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hidden md:inline-flex"
        aria-label="Notificações"
        disabled
      >
        <Bell className="size-4" />
      </Button>

      <UserMenu {...user} />
    </header>
  );
}
