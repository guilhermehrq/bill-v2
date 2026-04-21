"use client";

import { GitMerge, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";
import { MergeDialog } from "./merge-dialog";
import type { CategoryNode, CategoryRow } from "./queries";

type Props = {
  nodes: CategoryNode[];
};

export function CategoryTree({ nodes }: Props) {
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState<CategoryRow | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const filtered = nodes.filter((n) => n.type === tab);
  const expenses = nodes.filter((n) => n.type === "expense");
  const incomes = nodes.filter((n) => n.type === "income");

  // Flat list of merge candidates (parents + children — same type filter happens in dialog).
  const allCandidates = nodes.flatMap<CategoryRow>((n) => [n, ...n.children]);
  const parentOptions = nodes.map((n) => ({ id: n.id, name: n.name, type: n.type }));

  function openNew(parentId: string | null = null) {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setDefaultParentId(null);
    setFormOpen(true);
  }

  function openMerge(row: CategoryRow) {
    setMergeSource(row);
    setMergeOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-muted-foreground text-sm">
            Organize as transações em até dois níveis.
          </p>
        </div>
        <Button onClick={() => openNew()}>+ Nova categoria</Button>
      </div>

      <div className="flex gap-1">
        <Button
          variant={tab === "expense" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("expense")}
        >
          Despesas ({expenses.length})
        </Button>
        <Button
          variant={tab === "income" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("income")}
        >
          Receitas ({incomes.length})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma categoria nesse tipo ainda.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((parent) => (
            <ParentRow
              key={parent.id}
              node={parent}
              onEdit={openEdit}
              onMerge={openMerge}
              onAddChild={() => openNew(parent.id)}
            />
          ))}
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        parentOptions={parentOptions}
        defaultType={tab}
        defaultParentId={defaultParentId}
      />
      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        source={mergeSource}
        candidates={allCandidates}
      />
    </div>
  );
}

function ParentRow({
  node,
  onEdit,
  onMerge,
  onAddChild,
}: {
  node: CategoryNode;
  onEdit: (row: CategoryRow) => void;
  onMerge: (row: CategoryRow) => void;
  onAddChild: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 p-3">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: node.color ?? "#6366f1" }}
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-sm font-medium">{node.name}</p>
          <p className="text-muted-foreground text-xs">
            {node.children.length > 0
              ? `${node.children.length} ${node.children.length === 1 ? "subcategoria" : "subcategorias"} · `
              : ""}
            {node.transactionCount} transações
            {node.isSystem && " · padrão"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddChild}>
          <Plus className="size-4" />
        </Button>
        <CategoryActions
          row={node}
          onEdit={() => onEdit(node)}
          onMerge={() => onMerge(node)}
          isPending={isPending}
          startTransition={startTransition}
        />
      </div>

      {node.children.length > 0 && (
        <div className="border-t">
          {node.children.map((child) => (
            <ChildRow key={child.id} row={child} onEdit={onEdit} onMerge={onMerge} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ChildRow({
  row,
  onEdit,
  onMerge,
}: {
  row: CategoryRow;
  onEdit: (row: CategoryRow) => void;
  onMerge: (row: CategoryRow) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 border-t border-transparent px-3 py-2 pl-8">
      <span className="text-muted-foreground">└─</span>
      <div className="flex-1">
        <p className="text-sm">{row.name}</p>
        <p className="text-muted-foreground text-xs">
          {row.transactionCount} transações{row.isSystem && " · padrão"}
        </p>
      </div>
      <CategoryActions
        row={row}
        onEdit={() => onEdit(row)}
        onMerge={() => onMerge(row)}
        isPending={isPending}
        startTransition={startTransition}
      />
    </div>
  );
}

function CategoryActions({
  row,
  onEdit,
  onMerge,
  isPending,
  startTransition,
}: {
  row: CategoryRow;
  onEdit: () => void;
  onMerge: () => void;
  isPending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  function handleDelete() {
    if (!confirm(`Excluir a categoria "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(row.id);
      if (result.ok) {
        toast.success("Categoria excluída");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
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
        <DropdownMenuItem onClick={onMerge} disabled={isPending}>
          <GitMerge /> Mesclar em...
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
