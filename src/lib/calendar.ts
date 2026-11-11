import type { CalendarFilter, Card, Transaction } from "../types";
import { dueDateForMonth } from "./finance";
import { monthDay, type Renewal } from "./recurring";

export type CalendarItem =
  | {
      id: string;
      kind: "income" | "expense";
      date: string;
      title: string;
      amount: number;
      transaction: Transaction;
      card?: Card;
    }
  | {
      id: string;
      kind: "renewal";
      date: string;
      title: string;
      amount: number;
      renewal: Renewal;
    }
  | { id: string; kind: "card-due"; date: string; title: string; card: Card };

export function calendarItems(
  month: string,
  filter: CalendarFilter,
  rows: Transaction[],
  cards: Card[],
  renewals: Renewal[],
): CalendarItem[] {
  const items: CalendarItem[] = [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  if (filter !== "renewals") {
    for (const row of rows) {
      if (!row.date.startsWith(month) || (filter === "cards" && !row.card))
        continue;
      const card = row.card ? byId.get(row.card) : undefined;
      if (row.income && filter !== "cards")
        items.push({
          id: `income:${row.id}`,
          kind: "income",
          date: row.date,
          title: row.note || row.category || "Recorded income",
          amount: row.income,
          transaction: row,
          card,
        });
      if (row.expense)
        items.push({
          id: `expense:${row.id}`,
          kind: "expense",
          date: row.date,
          title:
            filter === "cards" && card
              ? card.name
              : row.note || row.category || card?.name || "Recorded spending",
          amount: row.expense,
          transaction: row,
          card,
        });
    }
  }
  if (filter === "all" || filter === "renewals") {
    for (const renewal of renewals) {
      if (!renewal.date.startsWith(month)) continue;
      if (filter === "all" && renewal.transaction?.date === renewal.date)
        continue;
      const { subscription, date, transaction } = renewal;
      items.push({
        id: `renewal:${subscription.id}:${date}`,
        kind: "renewal",
        date,
        title: subscription.name,
        amount: transaction?.expense ?? subscription.amount,
        renewal,
      });
    }
  }
  if (filter === "all" || filter === "cards") {
    for (const card of cards) {
      const date = dueDateForMonth(card, month);
      if (date && card.status !== "Completed")
        items.push({
          id: `card-due:${card.id}`,
          kind: "card-due",
          date,
          title: `${card.name} due`,
          card,
        });
    }
  }
  const priority = { renewal: 0, "card-due": 1, income: 2, expense: 3 };
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      priority[a.kind] - priority[b.kind] ||
      a.title.localeCompare(b.title),
  );
}

export const monthRange = (month: string) =>
  [monthDay(month, 1), monthDay(month, 31)] as const;
