import type { SearchableSelectItem } from "@/components/ui/searchable-select";
import { getIconComponent } from "@/lib/icons";
import type { FormCategoryOption } from "./types";

export function buildCategoryOptions(categories: FormCategoryOption[]): SearchableSelectItem[] {
  const parents = categories.filter((c) => !c.parentName);
  const childrenByParent = new Map<string, FormCategoryOption[]>();
  for (const c of categories) {
    if (!c.parentName) continue;
    const list = childrenByParent.get(c.parentName) ?? [];
    list.push(c);
    childrenByParent.set(c.parentName, list);
  }

  const out: SearchableSelectItem[] = [];
  for (const parent of parents) {
    out.push({
      value: parent.id,
      label: parent.name,
      node: <CategoryNode category={parent} />,
    });
    for (const child of childrenByParent.get(parent.name) ?? []) {
      out.push({
        value: child.id,
        label: child.name,
        keywords: parent.name,
        node: <CategoryNode category={child} indent />,
      });
    }
  }

  for (const [parentName, kids] of childrenByParent) {
    if (parents.some((p) => p.name === parentName)) continue;
    for (const child of kids) {
      out.push({
        value: child.id,
        label: child.name,
        keywords: parentName,
        node: <CategoryNode category={child} indent />,
      });
    }
  }

  return out;
}

export function CategoryNode({
  category,
  indent,
}: {
  category: FormCategoryOption;
  indent?: boolean;
}) {
  const Icon = indent ? null : getIconComponent(category.icon ?? null);
  const color = indent
    ? (category.parentColor ?? category.color ?? "var(--muted-foreground)")
    : (category.color ?? "var(--muted-foreground)");

  if (indent) {
    return (
      <span className="flex items-center gap-2 pl-5 text-sm">
        <span className="text-muted-foreground" aria-hidden>
          └
        </span>
        <span
          className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {category.name}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 font-medium">
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
      {category.name}
    </span>
  );
}
