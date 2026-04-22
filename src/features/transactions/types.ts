export const TRANSACTION_TYPES = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "transfer", label: "Transferência" },
] as const;

export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number]["value"];

export type FormAccountOption = {
  id: string;
  name: string;
  color: string | null;
};

export type FormCategoryOption = {
  id: string;
  name: string;
  type: "income" | "expense";
  parentName: string | null;
  color: string | null;
};
