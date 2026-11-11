import {
  ArrowDownUp,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Repeat2,
  Tags,
  Timer,
} from "lucide-react";
import type { View } from "../types";

export const ROUTE_ICONS = {
  overview: LayoutDashboard,
  transactions: ArrowDownUp,
  calendar: CalendarDays,
  cards: CreditCard,
  subscriptions: Repeat2,
  installments: Timer,
  categories: Tags,
};

export const ROUTES = [
  {
    view: "overview",
    label: "Overview",
    group: "Workspace",
    title: "Your month at a glance, from cash flow to what’s coming next.",
  },
  {
    view: "transactions",
    label: "Transactions",
    group: "Workspace",
    title: "Find, review, and edit the activity in your ledger.",
  },
  {
    view: "calendar",
    label: "Calendar",
    group: "Workspace",
    title: "Recorded activity and upcoming renewals, in one place.",
  },
  {
    view: "cards",
    label: "Cards",
    group: "Manage",
    title: "Your wallet, recorded purchases, and payment dates.",
  },
  {
    view: "subscriptions",
    label: "Subscriptions",
    group: "Manage",
    title: "Track recurring bills and know when each charge is due.",
  },
  {
    view: "installments",
    label: "Installments",
    group: "Manage",
    title: "Monthly costs, interest, and payment progress.",
  },
  {
    view: "categories",
    label: "Categories",
    group: "Manage",
    title: "Organize your ledger in your own colors.",
  },
] as const satisfies readonly {
  view: View;
  label: string;
  group: string;
  title: string;
}[];

export function viewFromHash(hash: string): View {
  return ROUTES.find(({ view }) => hash === `#/${view}`)?.view || "overview";
}
