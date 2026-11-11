import type { CSSProperties } from "react";
import type { CardNetwork, CoverFrame, PlanGlyph } from "./lib/appearance";
import type { SiteIcon } from "./lib/site-icon";

export type View =
  | "overview"
  | "transactions"
  | "calendar"
  | "cards"
  | "subscriptions"
  | "installments"
  | "categories";
export type CalendarFilter = "all" | "activity" | "renewals" | "cards";
export type CalendarDetailSection = "activity" | "cards" | "renewals";
export type BillingCadence = "weekly" | "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "paused" | "archived";
export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cadence: BillingCadence;
  startDate: string;
  status: SubscriptionStatus;
  category?: string;
  card?: string;
  note?: string;
  skippedDates?: string[];
  siteIcon?: SiteIcon;
}
export interface RenewalLink {
  subscriptionId: string;
  scheduledFor: string;
}
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
  renewal?: RenewalLink;
}
export interface Card {
  id: string;
  name: string;
  last4: string;
  color: string;
  color2?: string;
  kind?: "credit" | "cash";
  network?: CardNetwork;
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
  emoji?: string;
  glyph?: PlanGlyph;
  coverPhoto?: string;
  coverFrame?: CoverFrame;
  siteIcon?: SiteIcon;
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
  subscriptions: Subscription[];
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
      renewal?: RenewalLink;
    }
  | { kind: "day"; date: string; filtered?: boolean }
  | { kind: "calendarDay"; date: string; section: CalendarDetailSection }
  | { kind: "card"; card?: Card; cardKind?: "cash" | "credit" }
  | { kind: "plan"; plan?: Plan }
  | { kind: "planDetail"; plan: Plan }
  | { kind: "category"; name?: string }
  | { kind: "subscription"; subscription?: Subscription; date?: string }
  | { kind: "renewal"; subscriptionId: string; date: string }
  | {
      kind:
        | "budget"
        | "settings"
        | "clear"
        | "preferences"
        | "search"
        | "reminders";
    };
