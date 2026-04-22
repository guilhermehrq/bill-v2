"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardForm } from "./card-form";
import { CreditCardDisplay } from "./card-display";
import type { CardWithInvoice } from "./queries";

type Props = {
  cards: CardWithInvoice[];
  accounts: Array<{ id: string; name: string }>;
};

export function CardsList({ cards, accounts }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CardWithInvoice | null>(null);

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(card: CardWithInvoice) {
    setEditing(card);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cartões</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie cartões de crédito, ciclos de fatura e limites.
          </p>
        </div>
        <Button onClick={openNew}>+ Novo cartão</Button>
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum cartão cadastrado ainda.</p>
          <Button className="mt-3" onClick={openNew}>
            Cadastrar primeiro cartão
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((card) => (
            <CreditCardDisplay key={card.id} card={card} onEdit={() => openEdit(card)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Arquivados ({archived.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((card) => (
              <CreditCardDisplay key={card.id} card={card} onEdit={() => openEdit(card)} />
            ))}
          </div>
        </div>
      )}

      <CardForm open={formOpen} onOpenChange={setFormOpen} card={editing} accounts={accounts} />
    </div>
  );
}
