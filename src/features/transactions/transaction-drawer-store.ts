"use client";

import { create } from "zustand";
import type { TransactionTypeValue } from "./types";

type Defaults = {
  type?: TransactionTypeValue;
  accountId?: string;
  cardId?: string;
  destinationAccountId?: string;
};

type State = {
  open: boolean;
  editingId: string | null;
  defaults: Defaults;
  openCreate: (defaults?: Defaults) => void;
  openEdit: (id: string) => void;
  close: () => void;
};

export const useTransactionDrawer = create<State>((set) => ({
  open: false,
  editingId: null,
  defaults: {},
  openCreate: (defaults) => set({ open: true, editingId: null, defaults: defaults ?? {} }),
  openEdit: (id) => set({ open: true, editingId: id, defaults: {} }),
  close: () => set({ open: false }),
}));
