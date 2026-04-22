"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCents, toReais } from "@/lib/money";
import { upsertBudgetAction } from "./actions";

type CategoryOption = { id: string; name: string; parentName: string | null };

type ExistingBudget = {
  id: string;
  categoryId: string;
  categoryName: string;
  amountCents: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  existing: ExistingBudget | null;
  categoryOptions: CategoryOption[];
};

export function BudgetForm({ open, onOpenChange, month, existing, categoryOptions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");

  const isEdit = existing != null;

  useEffect(() => {
    if (!open) return;
    setCategoryId(existing?.categoryId ?? categoryOptions[0]?.id ?? null);
    setAmountText(existing ? toReais(existing.amountCents).toFixed(2).replace(".", ",") : "");
    setError(null);
  }, [open, existing, categoryOptions]);

  function handleSubmit() {
    setError(null);
    if (!categoryId) {
      setError("Escolha uma categoria");
      return;
    }
    const parsed = Number.parseFloat(amountText.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }

    startTransition(async () => {
      const result = await upsertBudgetAction({
        categoryId,
        month,
        amountCents: toCents(parsed),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            Defina um limite de gastos para a categoria neste mês.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={categoryId ?? undefined}
              onValueChange={(v) => setCategoryId(v)}
              disabled={isEdit}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-muted-foreground text-xs">
                Para trocar de categoria, delete e crie um novo orçamento.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Limite (R$)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="tabular"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
