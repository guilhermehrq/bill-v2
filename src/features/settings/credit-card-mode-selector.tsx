"use client";

import { ChevronDown, CreditCard, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateUserSettingsAction } from "./actions";
import { CREDIT_CARD_MODE_LABELS, type CreditCardReportMode } from "./constants";

type Variant = "badge" | "button";

type Props = {
  currentMode: CreditCardReportMode;
  variant?: Variant;
  className?: string;
};

const MODES: CreditCardReportMode[] = ["purchase_date", "invoice_date", "installment_date"];

export function CreditCardModeSelector({ currentMode, variant = "badge", className }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const info = CREDIT_CARD_MODE_LABELS[currentMode];

  function handleChange(value: string) {
    if (value === currentMode) return;
    startTransition(async () => {
      const result = await updateUserSettingsAction({
        creditCardReportMode: value as CreditCardReportMode,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const nextLabel = CREDIT_CARD_MODE_LABELS[value as CreditCardReportMode].label;
      toast.success(`Modo alterado para ${nextLabel.toLowerCase()}`);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={`Modo de exibição de cartão: ${info.label}`}
        title={info.description}
        className={cn(
          variant === "badge"
            ? "text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:opacity-50"
            : "border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-50",
          className,
        )}
      >
        {variant === "badge" ? (
          <Info className="size-3" aria-hidden />
        ) : (
          <CreditCard className="size-4" aria-hidden />
        )}
        <span>
          {variant === "button" && <span className="hidden sm:inline">Cartão: </span>}
          {variant === "badge" ? `Cartão: ${info.short}` : info.short}
        </span>
        <ChevronDown className={variant === "badge" ? "size-3" : "size-3 opacity-60"} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Modo de exibição de cartão</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={currentMode} onValueChange={handleChange}>
          {MODES.map((m) => {
            const opt = CREDIT_CARD_MODE_LABELS[m];
            return (
              <DropdownMenuRadioItem
                key={m}
                value={m}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {opt.description}
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
