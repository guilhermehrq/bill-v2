"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, SETTINGS_ITEM, type NavItem } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-background fixed top-14 left-0 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r lg:block">
      <nav className="flex h-full flex-col overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <h3 className="text-muted-foreground mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
              {section.label}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} isActive={pathname === item.href} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-auto border-t pt-3">
          <SidebarLink item={SETTINGS_ITEM} isActive={pathname === SETTINGS_ITEM.href} />
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="bg-brand absolute top-1 bottom-1 left-0 w-0.5 rounded-r" aria-hidden />
      )}
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{item.title}</span>
      {item.phase && (
        <span className="text-muted-foreground/60 text-[10px] font-medium">F{item.phase}</span>
      )}
    </Link>
  );
}
