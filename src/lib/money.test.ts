import { describe, it, expect } from "vitest";
import { toCents, toReais, format, formatWithSign } from "./money";

describe("money helpers", () => {
  describe("toCents", () => {
    it("converts reais to integer cents", () => {
      expect(toCents(1.23)).toBe(123);
      expect(toCents(100)).toBe(10000);
      expect(toCents(0.01)).toBe(1);
    });

    it("rounds floating point imprecision", () => {
      expect(toCents(0.1 + 0.2)).toBe(30);
    });
  });

  describe("toReais", () => {
    it("converts cents to decimal reais", () => {
      expect(toReais(123)).toBe(1.23);
      expect(toReais(0)).toBe(0);
    });
  });

  describe("format", () => {
    it("formats cents as pt-BR currency", () => {
      expect(format(12345)).toMatch(/R\$\s?123,45/);
      expect(format(0)).toMatch(/R\$\s?0,00/);
      expect(format(100000)).toMatch(/R\$\s?1\.000,00/);
    });
  });

  describe("formatWithSign", () => {
    it("prefixes + for income", () => {
      expect(formatWithSign(100, "income")).toMatch(/^\+/);
    });

    it("prefixes - for expense", () => {
      expect(formatWithSign(100, "expense")).toMatch(/^-/);
    });

    it("no prefix for transfer", () => {
      expect(formatWithSign(100, "transfer")).not.toMatch(/^[+-]/);
    });
  });
});
