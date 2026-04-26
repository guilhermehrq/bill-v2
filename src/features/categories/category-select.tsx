"use client";

import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type CategoryOptionItem = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  parentName: string | null;
  parentIcon?: string | null;
  parentColor?: string | null;
  type?: "income" | "expense";
};

// Build a flat [{value, label}] list — passed to <Select items={...}> so the
// trigger renders the selected category as text. Includes the "Sem categoria"
// option when noneLabel is provided.
export function categoryItems(
  categories: CategoryOptionItem[],
  noneValue?: string,
  noneLabel?: string,
): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  if (noneValue && noneLabel) out.push({ value: noneValue, label: noneLabel });
  for (const c of categories) {
    out.push({
      value: c.id,
      label: c.parentName ? `${c.parentName} › ${c.name}` : c.name,
    });
  }
  return out;
}

type Props = {
  categories: CategoryOptionItem[];
  noneValue?: string;
  noneLabel?: string;
};

// Renders <SelectItem>s grouped by parent. Use inside <SelectContent>.
// Parents shown first (bold), children indented underneath.
export function CategorySelectItems({ categories, noneValue, noneLabel }: Props) {
  const groups = groupByParent(categories);

  return (
    <>
      {noneValue && noneLabel && (
        <>
          <SelectItem value={noneValue}>{noneLabel}</SelectItem>
          {groups.length > 0 && <SelectSeparator />}
        </>
      )}
      {groups.map((group, gi) => (
        <SelectGroup key={group.key}>
          {group.parent ? (
            <ParentItem parent={group.parent} />
          ) : (
            <SelectLabel>Sem agrupamento</SelectLabel>
          )}
          {group.children.map((child) => (
            <ChildItem key={child.id} child={child} />
          ))}
          {gi < groups.length - 1 && <SelectSeparator />}
        </SelectGroup>
      ))}
    </>
  );
}

type Group = {
  key: string;
  parent: CategoryOptionItem | null;
  children: CategoryOptionItem[];
};

function groupByParent(categories: CategoryOptionItem[]): Group[] {
  // Parents = items without parentName. Children = items with parentName, grouped.
  const parents = categories.filter((c) => !c.parentName);
  const orphans: CategoryOptionItem[] = [];
  const childrenByParent = new Map<string, CategoryOptionItem[]>();

  for (const c of categories) {
    if (!c.parentName) continue;
    const list = childrenByParent.get(c.parentName) ?? [];
    list.push(c);
    childrenByParent.set(c.parentName, list);
  }

  const groups: Group[] = parents.map((p) => ({
    key: p.id,
    parent: p,
    children: childrenByParent.get(p.name) ?? [],
  }));

  // Children whose parent isn't in the list (e.g. parent archived but child active)
  for (const [parentName, kids] of childrenByParent) {
    if (!parents.some((p) => p.name === parentName)) {
      orphans.push(...kids);
    }
  }
  if (orphans.length > 0) {
    groups.push({ key: "__orphans", parent: null, children: orphans });
  }

  return groups;
}

function ParentItem({ parent }: { parent: CategoryOptionItem }) {
  const Icon = getIconComponent(parent.icon ?? null);
  const color = parent.color ?? "var(--muted-foreground)";
  return (
    <SelectItem value={parent.id} className="font-medium">
      <span className="flex items-center gap-2">
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded"
          style={{ color }}
          aria-hidden
        >
          {Icon ? (
            <Icon className="size-4" />
          ) : (
            <span className="block size-2 rounded-full" style={{ backgroundColor: color }} />
          )}
        </span>
        {parent.name}
      </span>
    </SelectItem>
  );
}

function ChildItem({ child }: { child: CategoryOptionItem }) {
  const color = child.parentColor ?? child.color ?? "var(--muted-foreground)";
  return (
    <SelectItem value={child.id} className={cn("pl-7")}>
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground" aria-hidden>
          └
        </span>
        <span
          className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {child.name}
      </span>
    </SelectItem>
  );
}
