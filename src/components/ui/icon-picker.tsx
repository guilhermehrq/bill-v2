"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ICON_NAMES, getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (icon: string | null) => void;
  color?: string | null;
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
};

export function IconPicker({
  value,
  onChange,
  color,
  size = "default",
  className,
  ariaLabel = "Escolher ícone",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.includes(q));
  }, [query]);

  const Selected = getIconComponent(value);
  const triggerSize = size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className={cn(
          "bg-background hover:bg-accent inline-flex shrink-0 items-center justify-center rounded-md border transition-colors",
          triggerSize,
          className,
        )}
        style={color ? { borderColor: color, color } : undefined}
      >
        {Selected ? (
          <Selected className={iconSize} aria-hidden />
        ) : (
          <span className="text-muted-foreground text-xs">+</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolher ícone</DialogTitle>
            <DialogDescription>
              {ICON_NAMES.length} ícones disponíveis. Use a busca para filtrar.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-2 left-2 size-4" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: home, food, car..."
              className="pl-8"
              autoFocus
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum ícone encontrado.
            </p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-8 gap-1 overflow-y-auto pr-1">
              {filtered.map((name) => {
                const Icon = getIconComponent(name)!;
                const selected = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    title={name}
                    aria-label={name}
                    aria-pressed={selected}
                    className={cn(
                      "hover:bg-accent inline-flex size-9 items-center justify-center rounded-md transition-colors",
                      selected && "bg-accent ring-ring ring-2",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground self-start text-xs underline"
            >
              Remover ícone
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
