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
import { Textarea } from "@/components/ui/textarea";
import type { FormCardOption } from "@/features/cards/queries";
import { toCents, toReais } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  createTransactionAction,
  loadTransactionForEditAction,
  updateTransactionAction,
} from "./actions";
import { useTransactionDrawer } from "./transaction-drawer-store";
import type { FormAccountOption, FormCategoryOption, TransactionTypeValue } from "./types";

type Props = {
  accounts: FormAccountOption[];
  cards: FormCardOption[];
  categories: FormCategoryOption[];
};

type PaymentTarget = { kind: "account"; id: string } | { kind: "card"; id: string } | null;

const ACCOUNT_PREFIX = "acc:";
const CARD_PREFIX = "card:";

function encodeTarget(t: PaymentTarget): string | undefined {
  if (!t) return undefined;
  return `${t.kind === "account" ? ACCOUNT_PREFIX : CARD_PREFIX}${t.id}`;
}

function decodeTarget(value: string | null): PaymentTarget {
  if (!value) return null;
  if (value.startsWith(ACCOUNT_PREFIX))
    return { kind: "account", id: value.slice(ACCOUNT_PREFIX.length) };
  if (value.startsWith(CARD_PREFIX)) return { kind: "card", id: value.slice(CARD_PREFIX.length) };
  return null;
}

export function TransactionDrawer({ accounts, cards, categories }: Props) {
  const { open, editingId, defaults, close } = useTransactionDrawer();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionTypeValue>(defaults.type ?? "expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>(
    defaults.accountId ? { kind: "account", id: defaults.accountId } : null,
  );
  const [destAccountId, setDestAccountId] = useState<string | null>(
    defaults.destinationAccountId ?? null,
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    if (!open) return;

    if (!editingId) {
      setType(defaults.type ?? "expense");
      setAmount("");
      setDescription("");
      setCategoryId(null);
      setPaymentTarget(
        defaults.accountId
          ? { kind: "account", id: defaults.accountId }
          : accounts[0]
            ? { kind: "account", id: accounts[0].id }
            : null,
      );
      setDestAccountId(defaults.destinationAccountId ?? null);
      setDate(new Date().toISOString().slice(0, 10));
      setIsPaid(true);
      setNotes("");
      setInstallments(1);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);
    loadTransactionForEditAction(editingId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const t = result.data;
      setType(t.type);
      setAmount(toReais(t.amountCents).toFixed(2).replace(".", ","));
      setDescription(t.description);
      setCategoryId(t.categoryId);
      setPaymentTarget(
        t.accountId
          ? { kind: "account", id: t.accountId }
          : t.creditCardId
            ? { kind: "card", id: t.creditCardId }
            : null,
      );
      setDestAccountId(t.type === "transfer" ? t.transferPairAccountId : null);
      setDate(t.date);
      setIsPaid(t.isPaid);
      setNotes(t.notes ?? "");
    });

    return () => {
      cancelled = true;
    };
  }, [open, editingId, defaults, accounts]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type || type === "transfer"),
    [categories, type],
  );

  const isCard = paymentTarget?.kind === "card";

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
      if (!paymentTarget || paymentTarget.kind !== "account" || !destAccountId) {
        setError("Transferências só entre contas. Informe origem e destino.");
        return;
      }
      if (paymentTarget.id === destAccountId) {
        setError("Origem e destino precisam ser diferentes");
        return;
      }
    } else if (!paymentTarget) {
      setError("Informe a conta ou cartão");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        const result = await updateTransactionAction(editingId, {
          description: description.trim(),
          amountCents,
          date,
          categoryId,
          accountId: paymentTarget?.kind === "account" ? paymentTarget.id : null,
          creditCardId: paymentTarget?.kind === "card" ? paymentTarget.id : null,
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
          sourceAccountId: (paymentTarget as { kind: "account"; id: string }).id,
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

      const isCardExpense =
        paymentTarget!.kind === "card" && type === "expense" && installments > 1;

      const result = await createTransactionAction({
        type,
        accountId: paymentTarget!.kind === "account" ? paymentTarget!.id : null,
        creditCardId: paymentTarget!.kind === "card" ? paymentTarget!.id : null,
        categoryId,
        description: description.trim(),
        amountCents,
        date,
        isPaid,
        notes: notes.trim() || undefined,
        tags: [],
        installmentTotal: isCardExpense ? installments : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        isCardExpense ? `Parcelamento em ${installments}x registrado` : "Transação criada",
      );
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
                <Select
                  value={paymentTarget?.kind === "account" ? paymentTarget.id : undefined}
                  onValueChange={(v) => setPaymentTarget(v ? { kind: "account", id: v } : null)}
                  disabled={Boolean(editingId)}
                >
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
                  disabled={Boolean(editingId)}
                >
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="Selecione a conta de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => paymentTarget?.kind !== "account" || a.id !== paymentTarget.id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {editingId && (
                <p className="text-muted-foreground text-xs">
                  As contas de uma transferência são imutáveis. Delete e crie uma nova se precisar
                  trocar.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target">Pagar com *</Label>
              <Select
                value={encodeTarget(paymentTarget)}
                onValueChange={(v) => setPaymentTarget(decodeTarget(v))}
              >
                <SelectTrigger id="target">
                  <SelectValue placeholder="Selecione conta ou cartão" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {accounts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Contas</SelectLabel>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={`${ACCOUNT_PREFIX}${a.id}`}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {cards.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Cartões</SelectLabel>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={`${CARD_PREFIX}${c.id}`}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {isCard && (
                <p className="text-muted-foreground text-xs">
                  A transação entrará na fatura do mês correto automaticamente.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!editingId && isCard && type === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelamento</Label>
              <Select
                value={String(installments)}
                onValueChange={(v) => setInstallments(Number(v))}
              >
                <SelectTrigger id="installments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="1">À vista</SelectItem>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {installments > 1 && (
                <InstallmentPreview
                  installments={installments}
                  amountText={amount}
                  startDate={date}
                />
              )}
            </div>
          )}

          {type !== "transfer" && !isCard && (
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

function InstallmentPreview({
  installments,
  amountText,
  startDate,
}: {
  installments: number;
  amountText: string;
  startDate: string;
}) {
  const amount = Number.parseFloat(amountText.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    return (
      <p className="text-muted-foreground text-xs">
        {installments}x — preencha o valor para ver a prévia.
      </p>
    );
  }
  const totalCents = toCents(amount);
  const base = Math.floor(totalCents / installments);
  const remainder = totalCents - base * installments;
  const firstCents = remainder > 0 ? base + 1 : base;
  const rest = base;

  const [y, m, d] = startDate.split("-").map(Number) as [number, number, number];
  const firstDate = new Date(y, m - 1, d);
  const lastDate = new Date(y, m - 1 + (installments - 1), d);

  const pt = (date: Date) =>
    `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;

  const equal = remainder === 0;
  const valueLabel = equal
    ? `${installments}× R$ ${(rest / 100).toFixed(2).replace(".", ",")}`
    : `1× R$ ${(firstCents / 100).toFixed(2).replace(".", ",")} + ${installments - 1}× R$ ${(rest / 100).toFixed(2).replace(".", ",")}`;

  return (
    <p className="text-muted-foreground text-xs">
      {valueLabel} · primeira em {pt(firstDate)}, última em {pt(lastDate)}.
    </p>
  );
}
