import type { CSSProperties } from "react";

export type View =
  "overview" | "transactions" | "cards" | "installments" | "categories";
export type TransactionType = "income" | "expense";
export interface Transaction {
  id: string;
  date: string;
  income: number;
  expense: number;
  categories: Record<string, number>;
  category?: string;
  card?: string;
  note?: string;
  source?: "workbook" | "local";
  deleted?: boolean;
}
export interface Card {
  id: string;
  name: string;
  last4: string;
  color: string;
  color2?: string;
  kind?: "credit" | "cash";
  status: string;
  dueDay?: number | null;
  paymentDue?: string | null;
  cycleDue?: string;
  cycleStart?: string;
}
export interface Plan {
  id: string;
  name: string;
  amount: number;
  months: number;
  rate: number;
  interestRate?: number;
  monthly: number;
  total: number;
  status: string;
  startMonth?: string;
  paidMonths?: number;
  card?: string;
}
export interface CategoryMeta {
  type: "Expense" | "Income" | "Both";
  color: string;
}
export interface Workspace {
  mode: "workbook" | "fresh";
  startedAt?: string;
  profile?: { name: string };
  density?: "comfortable" | "compact";
  motion?: "full" | "reduced";
  pinnedPlans?: string[];
}
export interface Totals {
  income: number;
  expense: number;
  net: number;
  categories: Record<string, number>;
}
export interface DailyTotal extends Totals {
  date: string;
  cats: Record<string, number>;
  count: number;
}
export interface MonthlyTotal extends Totals {
  month: string;
}
export interface Filters {
  query: string;
  type: "" | TransactionType;
  category: string;
  card: string;
}
export interface Workbook {
  source: string;
  categories: string[];
  records: Omit<Transaction, "id">[];
  months: { month: string }[];
  installments: Omit<Plan, "id">[];
  cardCycles: {
    card: string;
    status?: string;
    paymentDue?: string;
    cycleDue?: string;
    cycleStart?: string;
  }[];
  cardPayments: {
    month: string;
    total: number;
    cards: Record<string, number>;
    remark?: string | number;
  }[];
}
export interface LedgerState {
  transactions: Transaction[];
  localCards: Card[];
  localPlans: Plan[];
  categoryMeta: Record<string, CategoryMeta>;
  planOverrides: Record<string, Partial<Plan>>;
  cardOverrides: Record<string, Partial<Card>>;
  txOverrides: Record<string, Partial<Transaction>>;
  workspace: Workspace;
  budgets: Record<string, number>;
  aliases: Record<string, string>;
  theme: "light" | "dark";
  undo: {
    transactions: Transaction[];
    txOverrides: Record<string, Partial<Transaction>>;
  } | null;
}
export type StorageAdapter = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export type CSSVars = CSSProperties & { [key: `--${string}`]: string | number };
export type DialogState =
  | {
      kind: "transaction";
      row?: Transaction;
      duplicate?: boolean;
      type?: TransactionType;
      date?: string;
      card?: string;
    }
  | { kind: "day"; date: string; filtered?: boolean }
  | { kind: "card"; card?: Card; cardKind?: "cash" | "credit" }
  | { kind: "plan"; plan?: Plan }
  | { kind: "planDetail"; plan: Plan }
  | { kind: "category"; name?: string }
  | {
      kind:
        | "budget"
        | "settings"
        | "clear"
        | "preferences"
        | "search"
        | "reminders";
    };
