"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTransactionDrawer } from "./transaction-drawer-store";

type Props = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "icon-fab";
  size?: "sm" | "default" | "lg" | "icon";
  accountId?: string;
  cardId?: string;
  label?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function defaultsFromPathname(pathname: string | null): {
  accountId?: string;
  cardId?: string;
} {
  if (!pathname) return {};
  const accountMatch = pathname.match(/^\/contas\/([^/]+)/);
  const accountId = accountMatch?.[1];
  if (accountId && UUID_RE.test(accountId)) return { accountId };
  const cardMatch = pathname.match(/^\/cartoes\/([^/]+)/);
  const cardId = cardMatch?.[1];
  if (cardId && UUID_RE.test(cardId)) return { cardId };
  return {};
}

export function NewTransactionTrigger({
  className,
  variant = "default",
  size = "default",
  accountId,
  cardId,
  label,
}: Props) {
  const open = useTransactionDrawer((s) => s.openCreate);
  const pathname = usePathname();

  function handleOpen() {
    const fromPath = defaultsFromPathname(pathname);
    open({
      accountId: accountId ?? fromPath.accountId,
      cardId: cardId ?? fromPath.cardId,
    });
  }

  if (variant === "icon-fab") {
    return (
      <Button
        type="button"
        size="icon"
        onClick={handleOpen}
        className={cn(
          "bg-brand hover:bg-brand/90 text-brand-foreground size-12 rounded-full shadow-lg",
          className,
        )}
        aria-label="Nova transação"
      >
        <Plus className="size-6" />
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleOpen} className={className}>
      <Plus className="size-4" />
      {label ?? "Nova transação"}
    </Button>
  );
}
