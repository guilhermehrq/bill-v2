"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createGoalAction, updateGoalAction } from "./actions";
import type { GoalRow } from "./queries";

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
];

type Account = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalRow | null;
  accounts: Account[];
};

export function GoalForm({ open, onOpenChange, goal, accounts }: Props) {
  const isEdit = goal != null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetCents, setTargetCents] = useState(0);
  const [targetDate, setTargetDate] = useState<string>("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [color, setColor] = useState<string>(PALETTE[0]!);

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setTargetCents(goal.targetCents);
      setTargetDate(goal.targetDate ?? "");
      setAccountId(goal.accountId);
      setColor(goal.color ?? PALETTE[0]!);
    } else {
      setName("");
      setTargetCents(0);
      setTargetDate("");
      setAccountId(null);
      setColor(PALETTE[0]!);
    }
    setError(null);
  }, [open, goal]);

  function handleSubmit() {
    setError(null);
    if (targetCents <= 0) {
      setError("Valor alvo inválido");
      return;
    }
    if (!name.trim()) {
      setError("Informe um nome");
      return;
    }

    const payload = {
      name: name.trim(),
      targetCents,
      targetDate: targetDate || null,
      accountId,
      color,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateGoalAction(goal!.id, payload)
        : await createGoalAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Meta atualizada" : "Meta criada");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar meta" : "Nova meta"}</SheetTitle>
          <SheetDescription>
            Vincule a uma conta para ver o progresso automaticamente, ou registre aportes manuais.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Viagem Japão, Reserva de emergência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Valor alvo</Label>
            <MoneyInput id="target" valueCents={targetCents} onChange={setTargetCents} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Data alvo (opcional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="account">Conta vinculada (opcional)</Label>
              <Select
                value={accountId ?? "none"}
                onValueChange={(v) => setAccountId(v === "none" ? null : v)}
                items={[
                  { value: "none", label: "Nenhuma — aportes manuais" },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Nenhuma (aportes manuais)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma — aportes manuais</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Vinculada: progresso reflete o saldo da conta em tempo real.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2 px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
