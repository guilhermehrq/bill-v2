"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createTransactionAction, updateTransactionAction } from "./actions";
import { useTransactionDrawer } from "./transaction-drawer-store";
import type { FormAccountOption, FormCategoryOption, TransactionTypeValue } from "./types";

type Props = {
  accounts: FormAccountOption[];
  categories: FormCategoryOption[];
};

export function TransactionDrawer({ accounts, categories }: Props) {
  const { open, editingId, defaults, close } = useTransactionDrawer();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionTypeValue>(defaults.type ?? "expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(defaults.accountId ?? null);
  const [destAccountId, setDestAccountId] = useState<string | null>(
    defaults.destinationAccountId ?? null,
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && !editingId) {
      setType(defaults.type ?? "expense");
      setAmount("");
      setDescription("");
      setCategoryId(null);
      setAccountId(defaults.accountId ?? accounts[0]?.id ?? null);
      setDestAccountId(defaults.destinationAccountId ?? null);
      setDate(new Date().toISOString().slice(0, 10));
      setIsPaid(true);
      setNotes("");
      setError(null);
    }
  }, [open, editingId, defaults, accounts]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type || type === "transfer"),
    [categories, type],
  );

  function handleSubmit() {
    setError(null);

    const parsed = Number.parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }
    const amountCents = toCents(parsed);

    if (!description.trim()) {
      setError("Descreva a transação");
      return;
    }

    if (type === "transfer") {
      if (!accountId || !destAccountId) {
        setError("Informe origem e destino");
        return;
      }
      if (accountId === destAccountId) {
        setError("Origem e destino precisam ser diferentes");
        return;
      }
    } else if (!accountId) {
      setError("Informe a conta");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        const result = await updateTransactionAction(editingId, {
          description: description.trim(),
          amountCents,
          date,
          categoryId: categoryId,
          accountId: accountId,
          isPaid,
          notes: notes.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Transação atualizada");
        close();
        return;
      }

      if (type === "transfer") {
        const result = await createTransactionAction({
          type: "transfer",
          sourceAccountId: accountId!,
          destinationAccountId: destAccountId!,
          description: description.trim(),
          amountCents,
          date,
          notes: notes.trim() || undefined,
          tags: [],
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Transferência registrada");
        close();
        return;
      }

      const result = await createTransactionAction({
        type,
        accountId: accountId!,
        categoryId,
        description: description.trim(),
        amountCents,
        date,
        isPaid,
        notes: notes.trim() || undefined,
        tags: [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Transação criada");
      close();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editingId ? "Editar transação" : "Nova transação"}</SheetTitle>
          <SheetDescription>
            {editingId ? "Ajuste os dados da transação." : "Registre uma movimentação financeira."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {!editingId && (
            <div className="grid grid-cols-3 gap-1 rounded-md border p-1">
              {(["expense", "income", "transfer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm transition-colors",
                    type === t
                      ? t === "income"
                        ? "bg-income text-income-foreground"
                        : t === "expense"
                          ? "bg-expense text-expense-foreground"
                          : "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t === "expense" ? "Despesa" : t === "income" ? "Receita" : "Transferência"}
                </button>
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular text-2xl"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">Use vírgula para centavos.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado Extra"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {type !== "transfer" && (
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
          )}

          {type === "transfer" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="source">De (origem) *</Label>
                <Select value={accountId ?? undefined} onValueChange={(v) => setAccountId(v)}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Selecione a conta de origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Para (destino) *</Label>
                <Select
                  value={destAccountId ?? undefined}
                  onValueChange={(v) => setDestAccountId(v)}
                >
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="Selecione a conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="account">Pagar com *</Label>
              <Select value={accountId ?? undefined} onValueChange={(v) => setAccountId(v)}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {type !== "transfer" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPaid"
                checked={isPaid}
                onCheckedChange={(checked) => setIsPaid(checked === true)}
              />
              <Label htmlFor="isPaid" className="text-sm font-normal">
                Já foi paga
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Detalhes adicionais"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2 px-0">
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
