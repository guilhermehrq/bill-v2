"use client";

import {
  Archive,
  ArchiveRestore,
  GitMerge,
  MoreHorizontal,
  Pencil,
  Plus,
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
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { archiveCategoryAction, deleteCategoryAction, unarchiveCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";
import { MergeDialog } from "./merge-dialog";
import type { CategoryNode, CategoryRow } from "./queries";

type Tab = "expense" | "income" | "archived";

type Props = {
  nodes: CategoryNode[];
};

export function CategoryTree({ nodes }: Props) {
  const [tab, setTab] = useState<Tab>("expense");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState<CategoryRow | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  // Active = not archived. Show in expense/income tabs.
  const activeNodes = nodes
    .filter((n) => !n.archivedAt)
    .map((n) => ({ ...n, children: n.children.filter((c) => !c.archivedAt) }));

  // Archived = either the parent itself archived, or a child archived (regardless of parent state).
  const archivedRows: CategoryRow[] = nodes.flatMap((n) => {
    const archivedChildren = n.children.filter((c) => c.archivedAt);
    return n.archivedAt ? [n, ...archivedChildren] : archivedChildren;
  });

  const expenses = activeNodes.filter((n) => n.type === "expense");
  const incomes = activeNodes.filter((n) => n.type === "income");
  const visible = tab === "expense" ? expenses : tab === "income" ? incomes : [];

  // Merge candidates pool: only ACTIVE rows (you don't merge into something archived).
  const mergeCandidates: CategoryRow[] = activeNodes.flatMap((n) => [n, ...n.children]);

  // Parent options for the form: only active parents.
  const parentOptions = activeNodes.map((n) => ({ id: n.id, name: n.name, type: n.type }));

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
            Organize as transações em até dois níveis. Arquive categorias antigas — elas saem dos
            seletores mas o histórico continua visível.
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
        <Button
          variant={tab === "archived" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("archived")}
        >
          Arquivadas ({archivedRows.length})
        </Button>
      </div>

      {tab === "archived" ? (
        <ArchivedList rows={archivedRows} onMerge={openMerge} />
      ) : visible.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma categoria nesse tipo ainda.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((parent) => (
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
        defaultType={tab === "income" ? "income" : "expense"}
        defaultParentId={defaultParentId}
      />
      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        source={mergeSource}
        candidates={mergeCandidates}
      />
    </div>
  );
}

function CategoryGlyph({ row, size = "md" }: { row: CategoryRow; size?: "sm" | "md" }) {
  const Icon = getIconComponent(row.icon);
  const dim = size === "sm" ? "size-7" : "size-9";
  const iconDim = size === "sm" ? "size-3.5" : "size-4";
  const color = row.color ?? "#6366f1";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md border", dim)}
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}1a` }}
      aria-hidden
    >
      {Icon ? (
        <Icon className={iconDim} />
      ) : (
        <span className="block size-2 rounded-full" style={{ backgroundColor: color }} />
      )}
    </span>
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
        <CategoryGlyph row={node} />
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
        <ActiveActions
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
    <div className="flex items-center gap-3 border-t border-transparent px-3 py-2 pl-6">
      <span className="text-muted-foreground">└─</span>
      <CategoryGlyph row={row} size="sm" />
      <div className="flex-1">
        <p className="text-sm">{row.name}</p>
        <p className="text-muted-foreground text-xs">
          {row.transactionCount} transações{row.isSystem && " · padrão"}
        </p>
      </div>
      <ActiveActions
        row={row}
        onEdit={() => onEdit(row)}
        onMerge={() => onMerge(row)}
        isPending={isPending}
        startTransition={startTransition}
      />
    </div>
  );
}

function ActiveActions({
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
  function handleArchive() {
    startTransition(async () => {
      const result = await archiveCategoryAction(row.id);
      if (result.ok) {
        toast.success("Categoria arquivada");
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
        <DropdownMenuItem onClick={handleArchive} disabled={isPending}>
          <Archive /> Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ArchivedList({
  rows,
  onMerge,
}: {
  rows: CategoryRow[];
  onMerge: (row: CategoryRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma categoria arquivada.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-0 p-0">
      {rows.map((row, i) => (
        <ArchivedRow key={row.id} row={row} onMerge={onMerge} divider={i > 0} />
      ))}
    </Card>
  );
}

function ArchivedRow({
  row,
  onMerge,
  divider,
}: {
  row: CategoryRow;
  onMerge: (row: CategoryRow) => void;
  divider: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleUnarchive() {
    startTransition(async () => {
      const result = await unarchiveCategoryAction(row.id);
      if (result.ok) toast.success("Categoria desarquivada");
      else toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir definitivamente "${row.name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(row.id);
      if (result.ok) toast.success("Categoria excluída");
      else toast.error(result.error);
    });
  }

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 opacity-70", divider && "border-t")}>
      <CategoryGlyph row={row} size="sm" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {row.name}
          <span className="text-muted-foreground ml-2 text-xs">
            ({row.type === "income" ? "Receita" : "Despesa"})
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {row.transactionCount} transações associadas
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="hover:bg-accent rounded-md p-1 outline-hidden"
          aria-label="Ações"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleUnarchive} disabled={isPending}>
            <ArchiveRestore /> Desarquivar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMerge(row)} disabled={isPending}>
            <GitMerge /> Mesclar em...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
