"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
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
import { CategorySelectItems, categoryItems } from "@/features/categories/category-select";
import { listOpenInvoicesAction } from "@/features/cards/invoice-actions";
import type { InvoiceNavItem } from "@/features/cards/invoice-queries";
import { createRecurrenceAction } from "@/features/recurrences/actions";
import { ChevronDown, Repeat } from "lucide-react";
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
  const [amountCents, setAmountCents] = useState(0);
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
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [openInvoices, setOpenInvoices] = useState<InvoiceNavItem[]>([]);

  // Recorrência inline (apenas no modo criação, não em edição)
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatExpanded, setRepeatExpanded] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    "monthly",
  );
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatEndDate, setRepeatEndDate] = useState("");

  useEffect(() => {
    if (!open) return;

    if (!editingId) {
      setType(defaults.type ?? "expense");
      setAmountCents(0);
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
      setInvoiceId(null);
      setRepeatEnabled(false);
      setRepeatExpanded(false);
      setRepeatFrequency("monthly");
      setRepeatInterval(1);
      setRepeatEndDate("");
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
      setAmountCents(t.amountCents);
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
  const cardId = isCard ? paymentTarget.id : null;

  useEffect(() => {
    if (!cardId) {
      setOpenInvoices([]);
      setInvoiceId(null);
      return;
    }
    let cancelled = false;
    listOpenInvoicesAction(cardId).then((result) => {
      if (cancelled) return;
      if (result.ok) setOpenInvoices(result.data);
      else setOpenInvoices([]);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  function handleSubmit() {
    setError(null);

    if (amountCents <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }

    const finalDescription = type === "transfer" ? "Transferência" : description.trim();

    if (type !== "transfer" && !finalDescription) {
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
          description: finalDescription,
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
          description: finalDescription,
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
        invoiceId: paymentTarget!.kind === "card" ? invoiceId : null,
        description: finalDescription,
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

      if (repeatEnabled && !isCardExpense) {
        const [yy, mm, dd] = date.split("-").map(Number) as [number, number, number];
        const recResult = await createRecurrenceAction({
          description: finalDescription,
          amountCents,
          type,
          categoryId,
          accountId: paymentTarget!.kind === "account" ? paymentTarget!.id : null,
          creditCardId: paymentTarget!.kind === "card" ? paymentTarget!.id : null,
          frequency: repeatFrequency,
          interval: repeatInterval,
          dayOfMonth: repeatFrequency === "monthly" ? dd : null,
          dayOfWeek: repeatFrequency === "weekly" ? new Date(yy, mm - 1, dd).getDay() : null,
          startDate: date,
          endDate: repeatEndDate || null,
          // Mark this date as already generated so the worker creates the *next* one.
          lastGeneratedDate: date,
        });
        if (!recResult.ok) {
          // Transaction was created; surface the recurrence error but don't roll back.
          toast.error(`Transação criada, mas a recorrência falhou: ${recResult.error}`);
          close();
          return;
        }
        toast.success("Transação criada e recorrência configurada");
      } else {
        toast.success(
          isCardExpense ? `Parcelamento em ${installments}x registrado` : "Transação criada",
        );
      }
      close();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editingId ? "Editar transação" : "Nova transação"}</SheetTitle>
          <SheetDescription>
            {editingId ? "Ajuste os dados da transação." : "Registre uma movimentação financeira."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
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
            <MoneyInput
              id="amount"
              valueCents={amountCents}
              onChange={setAmountCents}
              className="text-2xl"
              autoFocus
            />
          </div>

          {type !== "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado Extra"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {type !== "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={categoryId ?? "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? null : v)}
                items={categoryItems(filteredCategories, "none", "Sem categoria")}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <CategorySelectItems
                    categories={filteredCategories}
                    noneValue="none"
                    noneLabel="Sem categoria"
                  />
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
                  items={accounts.map((a) => ({ value: a.id, label: a.name }))}
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
                  items={accounts
                    .filter((a) => paymentTarget?.kind !== "account" || a.id !== paymentTarget.id)
                    .map((a) => ({ value: a.id, label: a.name }))}
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
              <Label htmlFor="target">Conta/Cartão *</Label>
              <Select
                value={encodeTarget(paymentTarget)}
                onValueChange={(v) => setPaymentTarget(decodeTarget(v))}
                items={[
                  ...accounts.map((a) => ({ value: `${ACCOUNT_PREFIX}${a.id}`, label: a.name })),
                  ...cards.map((c) => ({ value: `${CARD_PREFIX}${c.id}`, label: c.name })),
                ]}
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

          {!editingId && isCard && (
            <div className="space-y-2">
              <Label htmlFor="invoice">Fatura</Label>
              <Select
                value={invoiceId ?? "auto"}
                onValueChange={(v) => setInvoiceId(v === "auto" ? null : v)}
                items={[
                  { value: "auto", label: "Automática (pela data)" },
                  ...openInvoices.map((inv) => ({
                    value: inv.id,
                    label: formatInvoiceLabel(inv),
                  })),
                ]}
              >
                <SelectTrigger id="invoice">
                  <SelectValue placeholder="Automática" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="auto">Automática (pela data)</SelectItem>
                  {openInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {formatInvoiceLabel(inv)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Em &ldquo;Automática&rdquo; o sistema escolhe a fatura pelo dia de fechamento.
              </p>
            </div>
          )}

          {!editingId && isCard && type === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelamento</Label>
              <Select
                value={String(installments)}
                onValueChange={(v) => setInstallments(Number(v))}
                items={[
                  { value: "1", label: "À vista" },
                  ...Array.from({ length: 23 }, (_, i) => i + 2).map((n) => ({
                    value: String(n),
                    label: `${n}x`,
                  })),
                ]}
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
                  amountCents={amountCents}
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

          {!editingId && type !== "transfer" && (
            <div className="rounded-md border">
              <button
                type="button"
                onClick={() => {
                  if (!repeatEnabled) {
                    setRepeatEnabled(true);
                    setRepeatExpanded(true);
                  } else {
                    setRepeatExpanded((v) => !v);
                  }
                }}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
                aria-expanded={repeatExpanded}
              >
                <Repeat className="size-4" aria-hidden />
                <span className="flex-1 font-medium">Repetir esta transação</span>
                {repeatEnabled && (
                  <span className="text-muted-foreground text-xs">
                    {repeatFrequency === "daily"
                      ? "diária"
                      : repeatFrequency === "weekly"
                        ? "semanal"
                        : repeatFrequency === "monthly"
                          ? "mensal"
                          : "anual"}
                    {repeatInterval > 1 && ` · a cada ${repeatInterval}`}
                  </span>
                )}
                <ChevronDown
                  className={cn("size-4 transition-transform", repeatExpanded && "rotate-180")}
                  aria-hidden
                />
              </button>

              {repeatExpanded && (
                <div className="space-y-3 border-t p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="repeat-enabled"
                      checked={repeatEnabled}
                      onCheckedChange={(v) => setRepeatEnabled(v === true)}
                    />
                    <Label htmlFor="repeat-enabled" className="text-sm font-normal">
                      Gerar próximas ocorrências automaticamente
                    </Label>
                  </div>

                  {repeatEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="repeat-frequency">Frequência</Label>
                          <Select
                            value={repeatFrequency}
                            onValueChange={(v) => setRepeatFrequency(v as typeof repeatFrequency)}
                            items={[
                              { value: "daily", label: "Diária" },
                              { value: "weekly", label: "Semanal" },
                              { value: "monthly", label: "Mensal" },
                              { value: "yearly", label: "Anual" },
                            ]}
                          >
                            <SelectTrigger id="repeat-frequency">
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
                          <Label htmlFor="repeat-interval">A cada</Label>
                          <Input
                            id="repeat-interval"
                            type="number"
                            min={1}
                            max={24}
                            value={repeatInterval}
                            onChange={(e) =>
                              setRepeatInterval(Math.max(1, Number(e.target.value) || 1))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="repeat-end">Termina em (opcional)</Label>
                        <Input
                          id="repeat-end"
                          type="date"
                          value={repeatEndDate}
                          onChange={(e) => setRepeatEndDate(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                          Em branco = repete indefinidamente. A primeira ocorrência será a transação
                          que você está criando agora.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
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
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function formatInvoiceLabel(inv: InvoiceNavItem): string {
  const [y, m] = inv.referenceMonth.split("-").map(Number) as [number, number, number];
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
  const month = names[m - 1] ?? String(m).padStart(2, "0");
  const statusLabel =
    inv.status === "open"
      ? "aberta"
      : inv.status === "closed"
        ? "fechada"
        : inv.status === "partial"
          ? "parcial"
          : "vencida";
  return `${month}/${String(y).slice(-2)} · ${statusLabel}`;
}

function InstallmentPreview({
  installments,
  amountCents,
  startDate,
}: {
  installments: number;
  amountCents: number;
  startDate: string;
}) {
  if (amountCents <= 0) {
    return (
      <p className="text-muted-foreground text-xs">
        {installments}x — preencha o valor para ver a prévia.
      </p>
    );
  }
  const totalCents = amountCents;
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
