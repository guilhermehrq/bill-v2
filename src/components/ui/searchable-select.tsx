"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableSelectItem = {
  value: string;
  label: string;
  /** Optional group label used to bucket items in the popup. */
  group?: string;
  /** Extra text appended to the search index so users can find by aliases. */
  keywords?: string;
  /** Custom node rendered inside the popup item (defaults to `label`). */
  node?: React.ReactNode;
};

type Props = {
  id?: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  items: SearchableSelectItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Render the selected label in the trigger (defaults to `item.label`). */
  renderValue?: (item: SearchableSelectItem) => React.ReactNode;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function searchMatch(item: SearchableSelectItem, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  const haystack = normalize(`${item.label} ${item.group ?? ""} ${item.keywords ?? ""}`);
  return haystack.includes(q);
}

export function SearchableSelect({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  searchPlaceholder = "Buscar…",
  emptyMessage = "Nada encontrado",
  disabled,
  className,
  renderValue,
}: Props) {
  const selected = React.useMemo(
    () => (value == null ? null : (items.find((i) => i.value === value) ?? null)),
    [items, value],
  );

  const { rootItems, hasGroups } = React.useMemo(() => {
    const groupMap = new Map<string, SearchableSelectItem[]>();
    const ungrouped: SearchableSelectItem[] = [];
    for (const item of items) {
      if (item.group) {
        const list = groupMap.get(item.group) ?? [];
        list.push(item);
        groupMap.set(item.group, list);
      } else {
        ungrouped.push(item);
      }
    }
    if (groupMap.size > 0) {
      const groups: Array<{ name: string; items: SearchableSelectItem[] }> = [];
      for (const [name, groupItems] of groupMap) {
        groups.push({ name, items: groupItems });
      }
      if (ungrouped.length > 0) {
        groups.push({ name: "Outros", items: ungrouped });
      }
      return { rootItems: groups, hasGroups: true };
    }
    return { rootItems: items, hasGroups: false };
  }, [items]);

  return (
    <Combobox.Root<SearchableSelectItem>
      items={rootItems}
      value={selected}
      onValueChange={(v) => onValueChange(v?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={searchMatch}
      disabled={disabled}
      autoHighlight
    >
      <Combobox.Trigger
        id={id}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
      >
        <span className="flex flex-1 items-center gap-1.5 text-left">
          {selected ? (
            renderValue ? (
              renderValue(selected)
            ) : (
              selected.label
            )
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <Combobox.Icon
          render={<ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />}
        />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup
            className={cn(
              "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative isolate z-50 flex max-h-[min(var(--available-height),20rem)] w-(--anchor-width) min-w-44 origin-(--transform-origin) flex-col overflow-hidden rounded-lg shadow-md ring-1 duration-100",
            )}
          >
            <div className="border-input flex items-center gap-1.5 border-b px-2.5 py-1.5">
              <SearchIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <Combobox.Input
                placeholder={searchPlaceholder}
                className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            <Combobox.List className="flex-1 overflow-y-auto p-1">
              {hasGroups
                ? (group: { name: string; items: SearchableSelectItem[] }) => (
                    <Combobox.Group key={group.name} items={group.items} className="scroll-my-1">
                      <Combobox.GroupLabel className="text-muted-foreground px-1.5 py-1 text-xs">
                        {group.name}
                      </Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(item: SearchableSelectItem) => (
                          <SearchableItem key={item.value} item={item} />
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )
                : (item: SearchableSelectItem) => <SearchableItem key={item.value} item={item} />}
            </Combobox.List>

            <Combobox.Empty className="text-muted-foreground px-3 py-6 text-center text-xs">
              {emptyMessage}
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function SearchableItem({ item }: { item: SearchableSelectItem }) {
  return (
    <Combobox.Item
      value={item}
      className="focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
    >
      <span className="flex flex-1 shrink-0 items-center gap-2 whitespace-nowrap">
        {item.node ?? item.label}
      </span>
      <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}
