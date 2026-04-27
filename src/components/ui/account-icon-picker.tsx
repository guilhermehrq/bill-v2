"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AccountIcon } from "@/components/ui/account-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ICON_NAMES, getIconComponent } from "@/lib/icons";
import { INSTITUTIONS, buildInstitutionIcon, isInstitutionIcon } from "@/lib/institutions";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (icon: string | null) => void;
  color?: string | null;
  className?: string;
};

type Tab = "institution" | "generic";

export function AccountIconPicker({ value, onChange, color, className }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() =>
    isInstitutionIcon(value) ? "institution" : "institution",
  );
  const [query, setQuery] = useState("");

  const filteredInstitutions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INSTITUTIONS;
    return INSTITUTIONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [query]);

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.includes(q));
  }, [query]);

  function pick(next: string | null) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Escolher ícone da conta"
        className={cn(
          "hover:bg-accent bg-background inline-flex shrink-0 items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
          className,
        )}
      >
        <AccountIcon icon={value} color={color} size="sm" />
        <span className="text-muted-foreground text-xs">Trocar ícone</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ícone da conta</DialogTitle>
            <DialogDescription>
              Escolha o logo da instituição financeira ou um ícone genérico.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-md border p-1">
            <Button
              type="button"
              variant={tab === "institution" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setTab("institution")}
            >
              Instituições ({INSTITUTIONS.length})
            </Button>
            <Button
              type="button"
              variant={tab === "generic" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setTab("generic")}
            >
              Genéricos ({ICON_NAMES.length})
            </Button>
          </div>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-2 left-2 size-4" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "institution" ? "Ex: Nubank, Itaú..." : "Ex: wallet, piggy-bank..."
              }
              className="pl-8"
              autoFocus
            />
          </div>

          {tab === "institution" ? (
            filteredInstitutions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nenhuma instituição encontrada.
              </p>
            ) : (
              <div className="grid max-h-[360px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {filteredInstitutions.map((inst) => {
                  const iconValue = buildInstitutionIcon(inst.slug);
                  const selected = value === iconValue;
                  return (
                    <button
                      key={inst.slug}
                      type="button"
                      onClick={() => pick(iconValue)}
                      title={inst.name}
                      aria-label={inst.name}
                      aria-pressed={selected}
                      className={cn(
                        "hover:bg-accent flex flex-col items-center gap-1 rounded-md border p-2 transition-colors",
                        selected && "ring-ring bg-accent ring-2",
                      )}
                    >
                      <span className="bg-background flex size-10 items-center justify-center overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={inst.logoUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="object-contain"
                          loading="lazy"
                        />
                      </span>
                      <span className="text-muted-foreground line-clamp-1 text-[10px] leading-tight">
                        {inst.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : filteredIcons.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum ícone encontrado.
            </p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-8 gap-1 overflow-y-auto pr-1">
              {filteredIcons.map((name) => {
                const Icon = getIconComponent(name)!;
                const selected = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pick(name)}
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
              onClick={() => pick(null)}
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
