"use client";

import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
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
import { deleteGoalAction, setGoalArchivedAction } from "./actions";
import { ContributeDialog } from "./contribute-dialog";
import { GoalForm } from "./goal-form";
import type { GoalRow } from "./queries";

type Props = {
  goals: GoalRow[];
  accounts: Array<{ id: string; name: string }>;
};

export function GoalsView({ goals, accounts }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [contribOpen, setContribOpen] = useState(false);
  const [contribTarget, setContribTarget] = useState<GoalRow | null>(null);

  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(g: GoalRow) {
    setEditing(g);
    setFormOpen(true);
  }
  function openContribute(g: GoalRow) {
    setContribTarget(g);
    setContribOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Metas</h1>
          <p className="text-muted-foreground text-sm">
            {active.length} {active.length === 1 ? "meta ativa" : "metas ativas"}
            {archived.length > 0 && ` · ${archived.length} arquivadas`}
          </p>
        </div>
        <Button onClick={openNew}>+ Nova meta</Button>
      </div>

      {goals.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="text-muted-foreground mx-auto mb-2 size-8" aria-hidden />
          <p className="text-muted-foreground text-sm">
            Defina objetivos — uma viagem, reserva de emergência, troca de celular. O progresso é
            acompanhado automaticamente quando você vincula uma conta.
          </p>
          <Button className="mt-3" onClick={openNew}>
            Criar primeira meta
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => openEdit(g)}
              onContribute={() => openContribute(g)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Arquivadas ({archived.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {archived.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => openEdit(g)}
                onContribute={() => openContribute(g)}
              />
            ))}
          </div>
        </div>
      )}

      <GoalForm open={formOpen} onOpenChange={setFormOpen} goal={editing} accounts={accounts} />
      <ContributeDialog
        open={contribOpen}
        onOpenChange={setContribOpen}
        goalId={contribTarget?.id ?? null}
        goalName={contribTarget?.name ?? null}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onContribute,
}: {
  goal: GoalRow;
  onEdit: () => void;
  onContribute: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const achieved = goal.pctAchieved >= 100;

  function handleArchive() {
    startTransition(async () => {
      const result = await setGoalArchivedAction(goal.id, !goal.archived);
      if (result.ok) toast.success(goal.archived ? "Meta desarquivada" : "Meta arquivada");
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir a meta "${goal.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteGoalAction(goal.id);
      if (result.ok) toast.success("Meta excluída");
      else toast.error(result.error);
    });
  }

  const projectionText = achieved
    ? null
    : goal.monthsToTarget && goal.projectedCompletionDate
      ? `no ritmo atual: ${formatMonth(goal.projectedCompletionDate)}`
      : goal.accountId
        ? "sem aportes recentes para projetar"
        : "registre aportes para ver projeção";

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4",
        goal.archived && "opacity-60",
        achieved && "ring-income/30 ring-2",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: goal.color ?? "#6366f1" }}
        >
          <Target className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{goal.name}</h3>
          {goal.accountName && (
            <p className="text-muted-foreground text-xs">via {goal.accountName}</p>
          )}
        </div>
        {achieved && (
          <span className="text-income-foreground bg-income rounded-full px-2 py-0.5 text-xs font-medium">
            conquistada
          </span>
        )}
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
            {!goal.accountId && (
              <DropdownMenuItem onClick={onContribute} disabled={isPending}>
                <Plus /> Aporte manual
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleArchive} disabled={isPending}>
              {goal.archived ? (
                <>
                  <ArchiveRestore /> Desarquivar
                </>
              ) : (
                <>
                  <Archive /> Arquivar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="tabular text-lg font-semibold">{format(goal.currentCents)}</span>
          <span className="text-muted-foreground tabular text-sm">
            de {format(goal.targetCents)}
          </span>
        </div>
        <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn("h-full transition-all", achieved ? "bg-income" : "bg-brand")}
            style={{ width: `${Math.min(100, goal.pctAchieved)}%` }}
          />
        </div>
        <p className="text-muted-foreground tabular mt-1 text-xs">
          {Math.round(goal.pctAchieved)}% concluído
          {goal.targetDate && ` · meta: ${formatMonth(goal.targetDate)}`}
          {projectionText && ` · ${projectionText}`}
        </p>
      </div>
    </Card>
  );
}

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${names[Number(m) - 1]}/${y!.slice(-2)}`;
}
