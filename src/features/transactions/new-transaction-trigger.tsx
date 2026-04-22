"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTransactionDrawer } from "./transaction-drawer-store";

type Props = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "icon-fab";
  size?: "sm" | "default" | "lg" | "icon";
  accountId?: string;
  label?: string;
};

export function NewTransactionTrigger({
  className,
  variant = "default",
  size = "default",
  accountId,
  label,
}: Props) {
  const open = useTransactionDrawer((s) => s.openCreate);

  if (variant === "icon-fab") {
    return (
      <Button
        type="button"
        size="icon"
        onClick={() => open({ accountId })}
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
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => open({ accountId })}
      className={className}
    >
      <Plus className="size-4" />
      {label ?? "Nova transação"}
    </Button>
  );
}
