"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NewTransactionTrigger } from "@/features/transactions/new-transaction-trigger";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed right-0 bottom-0 left-0 z-40 flex h-14 items-center justify-around border-t lg:hidden">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}

      <div className="relative flex-1">
        <NewTransactionTrigger
          variant="icon-fab"
          className="absolute -top-6 left-1/2 -translate-x-1/2"
        />
      </div>

      <button
        type="button"
        className="text-muted-foreground flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs"
        aria-label="Mais"
        disabled
      >
        <Menu className="size-5" />
        <span>Mais</span>
      </button>
    </nav>
  );
}
