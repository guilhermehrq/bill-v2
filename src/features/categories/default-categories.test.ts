import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "./default-categories";

describe("default categories", () => {
  it("contains the canonical set with at least 6 incomes and 10 expense parents", () => {
    const incomes = DEFAULT_CATEGORIES.filter((c) => c.type === "income");
    const expenses = DEFAULT_CATEGORIES.filter((c) => c.type === "expense");
    expect(incomes.length).toBeGreaterThanOrEqual(6);
    expect(expenses.length).toBeGreaterThanOrEqual(10);
  });

  it("totals roughly 40 entries when expanded (parents + children)", () => {
    const total = DEFAULT_CATEGORIES.reduce((acc, c) => acc + 1 + (c.children?.length ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(35);
    expect(total).toBeLessThanOrEqual(50);
  });

  it("has no duplicate names at the top level", () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("child names are unique within each parent", () => {
    for (const parent of DEFAULT_CATEGORIES) {
      if (!parent.children) continue;
      const childNames = parent.children.map((c) => c.name);
      expect(new Set(childNames).size).toBe(childNames.length);
    }
  });
});
