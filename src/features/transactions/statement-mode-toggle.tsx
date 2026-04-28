"use client";

import { Pin } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUserSettingsAction } from "@/features/settings/actions";
import { STATEMENT_VIEW_MODE_LABELS, type StatementViewMode } from "@/features/settings/constants";
import { cn } from "@/lib/utils";

type Props = {
  current: StatementViewMode;
  defaultMode: StatementViewMode;
};

const ORDER: StatementViewMode[] = ["cashflow", "all_entries"];

export function StatementModeToggle({ current, defaultMode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setMode(mode: StatementViewMode) {
    if (mode === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (mode === defaultMode) {
      params.delete("modo");
    } else {
      params.set("modo", mode);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function pinAsDefault() {
    startTransition(async () => {
      const result = await updateUserSettingsAction({ statementViewMode: current });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Modo definido como padrão");
      // Drop the `modo` query param since it now matches the default.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("modo");
      router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const info = STATEMENT_VIEW_MODE_LABELS[current];
  const isAtDefault = current === defaultMode;

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className="bg-muted/50 inline-flex rounded-md border p-0.5"
        role="tablist"
        aria-label="Modo de visualização"
      >
        {ORDER.map((m) => {
          const selected = m === current;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(m)}
              disabled={isPending}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                isPending && "opacity-50",
              )}
            >
              {STATEMENT_VIEW_MODE_LABELS[m].label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground hidden text-xs sm:block" title={info.description}>
          {info.description.length > 70 ? `${info.description.slice(0, 70)}…` : info.description}
        </p>
        {!isAtDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={pinAsDefault}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2 text-xs"
          >
            <Pin className="size-3" aria-hidden />
            Definir como padrão
          </Button>
        )}
      </div>
    </div>
  );
}
