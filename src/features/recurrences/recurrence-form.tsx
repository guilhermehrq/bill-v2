"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { toCents, toReais } from "@/lib/money";
import { createRecurrenceAction, updateRecurrenceAction } from "./actions";
import type { RecurrenceListItem } from "./queries";

type Account = { id: string; name: string };
type Card = { id: string; name: string };
type Category = { id: string; name: string; type: "income" | "expense"; parentName: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  existing: RecurrenceListItem | null;
};

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function RecurrenceForm({
  open,
  onOpenChange,
  accounts,
  cards,
  categories,
  existing,
}: Props) {
  const isEdit = existing != null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentValue, setPaymentValue] = useState<string>("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [interval, setInterval] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDescription(existing.description);
      setAmountText(toReais(existing.amountCents).toFixed(2).replace(".", ","));
      setType(existing.type);
      setCategoryId(existing.categoryId);
      setPaymentValue(
        existing.accountId
          ? `acc:${existing.accountId}`
          : existing.creditCardId
            ? `card:${existing.creditCardId}`
            : "",
      );
      setFrequency(existing.frequency);
      setInterval(existing.interval);
      setDayOfMonth(existing.dayOfMonth);
      setDayOfWeek(existing.dayOfWeek);
      setStartDate(existing.startDate);
      setEndDate(existing.endDate ?? "");
    } else {
      setDescription("");
      setAmountText("");
      setType("expense");
      setCategoryId(null);
      setPaymentValue(accounts[0] ? `acc:${accounts[0].id}` : "");
      setFrequency("monthly");
      setInterval(1);
      setDayOfMonth(new Date().getDate());
      setDayOfWeek(null);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
    }
    setError(null);
  }, [open, existing, accounts]);

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit() {
    setError(null);
    const parsedAmount = Number.parseFloat(amountText.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }
    if (!description.trim()) {
      setError("Informe a descrição");
      return;
    }
    if (!paymentValue) {
      setError("Escolha a conta ou o cartão");
      return;
    }
    const [kind, id] = paymentValue.split(":");
    if (!id) {
      setError("Escolha a conta ou o cartão");
      return;
    }

    const payload = {
      description: description.trim(),
      amountCents: toCents(parsedAmount),
      type,
      categoryId,
      accountId: kind === "acc" ? id : null,
      creditCardId: kind === "card" ? id : null,
      frequency,
      interval,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      startDate,
      endDate: endDate || null,
      maxOccurrences: null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateRecurrenceAction(existing!.id, payload)
        : await createRecurrenceAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Recorrência atualizada" : "Recorrência criada");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar recorrência" : "Nova recorrência"}</SheetTitle>
          <SheetDescription>
            Modelos de transações que o sistema vai gerar automaticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-md border p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  type === t
                    ? t === "income"
                      ? "bg-income text-income-foreground rounded px-3 py-1.5 text-sm"
                      : "bg-expense text-expense-foreground rounded px-3 py-1.5 text-sm"
                    : "text-muted-foreground hover:bg-accent rounded px-3 py-1.5 text-sm"
                }
                disabled={isEdit}
              >
                {t === "income" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Aluguel, Netflix"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="tabular"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={categoryId ?? "none"}
              onValueChange={(v) => setCategoryId(v === "none" ? null : v)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="none">Sem categoria</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment">Pagar com</Label>
            <Select value={paymentValue} onValueChange={(v) => setPaymentValue(v ?? "")}>
              <SelectTrigger id="payment">
                <SelectValue placeholder="Conta ou cartão" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {accounts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Contas</SelectLabel>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={`acc:${a.id}`}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {cards.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Cartões</SelectLabel>
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={`card:${c.id}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">A cada</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                max={24}
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Dia do mês</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth ?? ""}
                onChange={(e) => setDayOfMonth(Number(e.target.value) || null)}
              />
            </div>
          )}

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Dia da semana</Label>
              <Select
                value={dayOfWeek !== null ? String(dayOfWeek) : undefined}
                onValueChange={(v) => setDayOfWeek(v !== null ? Number(v) : null)}
              >
                <SelectTrigger id="dayOfWeek">
                  <SelectValue placeholder="Dia da semana" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Começa em</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Termina em (opcional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
