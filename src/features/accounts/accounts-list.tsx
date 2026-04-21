"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/money";
import { AccountCard, NewAccountCard } from "./account-card";
import { AccountForm } from "./account-form";
import type { AccountWithBalance } from "./queries";

type Props = {
  accounts: AccountWithBalance[];
};

export function AccountsList({ accounts }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const totalActiveCents = active.reduce((acc, a) => acc + a.balanceCents, 0);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(account: AccountWithBalance) {
    setEditing(account);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-muted-foreground text-sm">
            Bancos, carteira e demais lugares onde seu dinheiro mora.
          </p>
        </div>
        <Button onClick={openNew}>+ Nova conta</Button>
      </div>

      {active.length > 0 && (
        <Card className="bg-secondary/40 flex items-center justify-between p-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Saldo total</p>
            <p className="tabular text-2xl font-semibold">{format(totalActiveCents)}</p>
          </div>
          <p className="text-muted-foreground text-sm">
            {active.length} {active.length === 1 ? "conta ativa" : "contas ativas"}
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((account) => (
          <AccountCard key={account.id} account={account} onEdit={() => openEdit(account)} />
        ))}
        <NewAccountCard onClick={openNew} />
      </div>

      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Arquivadas ({archived.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((account) => (
              <AccountCard key={account.id} account={account} onEdit={() => openEdit(account)} />
            ))}
          </div>
        </div>
      )}

      <AccountForm open={formOpen} onOpenChange={setFormOpen} account={editing} />
    </div>
  );
}
