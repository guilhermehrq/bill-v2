"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTransactionDrawer } from "@/features/transactions/transaction-drawer-store";
import { useKeyboardShortcuts, type Shortcut } from "@/lib/hooks/use-keyboard-shortcuts";

type Entry = { keys: string[]; description: string; group: string };

const ENTRIES: Entry[] = [
  { keys: ["N"], description: "Nova transação", group: "Ações" },
  { keys: ["?"], description: "Mostrar atalhos", group: "Ações" },
  { keys: ["G", "D"], description: "Ir para Dashboard", group: "Navegação" },
  { keys: ["G", "T"], description: "Ir para Extrato", group: "Navegação" },
  { keys: ["G", "O"], description: "Ir para Orçamentos", group: "Navegação" },
  { keys: ["G", "R"], description: "Ir para Relatórios", group: "Navegação" },
  { keys: ["G", "C"], description: "Ir para Contas", group: "Navegação" },
  { keys: ["G", "S"], description: "Ir para Configurações", group: "Navegação" },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const openDrawer = useTransactionDrawer((s) => s.openCreate);
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { keys: "n", description: "Nova transação", handler: () => openDrawer() },
      { keys: "?", description: "Mostrar atalhos", handler: () => setHelpOpen(true) },
      { keys: "g d", description: "Dashboard", handler: () => router.push("/") },
      { keys: "g t", description: "Extrato", handler: () => router.push("/extrato") },
      { keys: "g o", description: "Orçamentos", handler: () => router.push("/orcamentos") },
      { keys: "g r", description: "Relatórios", handler: () => router.push("/relatorios") },
      { keys: "g c", description: "Contas", handler: () => router.push("/contas") },
      { keys: "g s", description: "Configurações", handler: () => router.push("/configuracoes") },
    ],
    [router, openDrawer],
  );

  useKeyboardShortcuts(shortcuts);

  const groups = Array.from(new Set(ENTRIES.map((e) => e.group)));

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Pressione <KeyHint>?</KeyHint> a qualquer momento para abrir esta lista.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                {group}
              </p>
              <ul className="space-y-1.5">
                {ENTRIES.filter((e) => e.group === group).map((e) => (
                  <li key={e.keys.join("+")} className="flex items-center justify-between text-sm">
                    <span>{e.description}</span>
                    <span className="flex items-center gap-1">
                      {e.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground text-xs">depois</span>}
                          <KeyHint>{k}</KeyHint>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted border-border text-foreground inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-xs font-medium">
      {children}
    </kbd>
  );
}
