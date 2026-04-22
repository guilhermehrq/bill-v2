"use client";

import { MoreHorizontal, Pause, Pencil, Play, RefreshCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteRecurrenceAction, setRecurrenceActiveAction } from "./actions";
import type { RecurrenceListItem } from "./queries";
import { RecurrenceForm } from "./recurrence-form";

type Props = {
  recurrences: RecurrenceListItem[];
  accounts: Array<{ id: string; name: string }>;
  cards: Array<{ id: string; name: string }>;
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
    parentName: string | null;
  }>;
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export function RecurrencesView({ recurrences, accounts, cards, categories }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurrenceListItem | null>(null);

  const incomes = recurrences.filter((r) => r.type === "income");
  const expenses = recurrences.filter((r) => r.type === "expense");
  const activeCount = recurrences.filter((r) => r.active).length;
  const pausedCount = recurrences.length - activeCount;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(r: RecurrenceListItem) {
    setEditing(r);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Recorrências</h1>
          <p className="text-muted-foreground text-sm">
            {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
            {pausedCount > 0 && ` · ${pausedCount} pausadas`}
          </p>
        </div>
        <Button onClick={openNew}>+ Nova recorrência</Button>
      </div>

      {recurrences.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma recorrência configurada. Cadastre salário, aluguel e assinaturas para receber
            transações previstas automaticamente.
          </p>
          <Button className="mt-3" onClick={openNew}>
            Criar primeira
          </Button>
        </Card>
      ) : (
        <>
          {incomes.length > 0 && (
            <Section title="Receitas">
              {incomes.map((r) => (
                <RecurrenceRow key={r.id} recurrence={r} onEdit={() => openEdit(r)} />
              ))}
            </Section>
          )}
          {expenses.length > 0 && (
            <Section title="Despesas">
              {expenses.map((r) => (
                <RecurrenceRow key={r.id} recurrence={r} onEdit={() => openEdit(r)} />
              ))}
            </Section>
          )}
        </>
      )}

      <RecurrenceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        accounts={accounts}
        cards={cards}
        categories={categories}
        existing={editing}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <Card className="divide-y overflow-hidden p-0">{children}</Card>
    </div>
  );
}

function RecurrenceRow({
  recurrence: r,
  onEdit,
}: {
  recurrence: RecurrenceListItem;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const source = r.accountName ?? r.creditCardName ?? "—";
  const freq = FREQ_LABELS[r.frequency] ?? r.frequency;
  const dayHint =
    r.frequency === "monthly" && r.dayOfMonth
      ? `dia ${r.dayOfMonth}`
      : r.frequency === "weekly" && r.dayOfWeek !== null
        ? ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][r.dayOfWeek]
        : null;

  function handleToggle() {
    startTransition(async () => {
      const result = await setRecurrenceActiveAction(r.id, !r.active);
      if (result.ok) toast.success(r.active ? "Recorrência pausada" : "Recorrência ativada");
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Excluir a recorrência "${r.description}"? Transações previstas já geradas serão mantidas (sem vínculo).`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteRecurrenceAction(r.id);
      if (result.ok) toast.success("Recorrência excluída");
      else toast.error(result.error);
    });
  }

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2", !r.active && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {r.description}
          {!r.active && " · pausada"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {freq}
          {dayHint && ` · ${dayHint}`}
          {r.interval > 1 && ` (a cada ${r.interval})`}
          {" · "}
          {source}
          {r.nextDate && ` · próx. ${formatDateShort(r.nextDate)}`}
        </p>
      </div>
      <p
        className={cn(
          "tabular shrink-0 text-sm font-semibold",
          r.type === "income" ? "text-income" : "text-expense",
        )}
      >
        {format(r.amountCents)}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="hover:bg-accent rounded-md p-1 outline-hidden"
          aria-label="Ações"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit} disabled={isPending}>
            <Pencil /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggle} disabled={isPending}>
            {r.active ? (
              <>
                <Pause /> Pausar
              </>
            ) : (
              <>
                <Play /> Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!isPending && <RefreshCcw aria-hidden className="hidden" />}
    </div>
  );
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
