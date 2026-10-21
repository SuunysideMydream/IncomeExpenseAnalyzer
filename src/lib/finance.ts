// Reuse the exact dependency-free calculation core tested by the original app.
import "../../finance-core.js";
import type {
  Card,
  DailyTotal,
  Filters,
  MonthlyTotal,
  Plan,
  Totals,
  Transaction,
  Workbook,
} from "../types";
interface FinanceAPI {
  money(value: number): number;
  localDate(date?: Date): string;
  validDate(value: string): boolean;
  records(
    base: Workbook["records"],
    local?: Transaction[],
    overrides?: Record<string, Partial<Transaction>>,
  ): Transaction[];
  totals(rows: Transaction[]): Totals;
  monthly(rows: Transaction[], seeds?: string[]): MonthlyTotal[];
  months(rows: Transaction[], seeds?: string[], today?: string): string[];
  daily(rows: Transaction[]): DailyTotal[];
  filter(
    rows: Transaction[],
    filters: Partial<Filters> & { month?: string },
    cards?: Card[],
  ): Transaction[];
  validateTransaction(row: Transaction): Transaction;
  csv(rows: Transaction[], cards?: Card[]): string;
}
export const Finance = (globalThis as unknown as { Finance: FinanceAPI })
  .Finance;
export const COLORS = [
  "#2c9b72",
  "#df725f",
  "#4d79b8",
  "#9a78ce",
  "#c58a39",
  "#397c86",
  "#bc6088",
  "#687c52",
  "#a35f4d",
];
export const TERMS = [1, 3, 4, 6, 10, 12, 15, 18, 24, 36];
export const RATES = [0, 0.59, 0.65, 0.69, 0.74];
export const baht = (value: number) =>
  `฿${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.abs(value || 0))}`;
export const baht2 = (value: number) =>
  `฿${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value || 0))}`;
export const signedMoney = (value: number) =>
  `${value < 0 ? "−" : ""}${baht2(value)}`;
export const monthText = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
export function nextMonth(month: string, offset = 1) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return Finance.localDate(date).slice(0, 7);
}
export function calcPlan(amount: number, months: number, rate: number) {
  const no = amount / (months || 1),
    interest = (amount * rate) / 100,
    monthly = no + interest;
  return { no, interest, monthly, total: monthly * (months || 1) };
}
export function normalizeColor(value: string) {
  let hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex))
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}
export const safeColor = (value: string | undefined, fallback = "#8d7cde") =>
  value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function contrastInk(color: string) {
  const hex = safeColor(color).slice(1);
  const rgb = [0, 2, 4]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#111111"
    : "#FFFFFF";
}
export function dueDateForMonth(card: Card, month: string) {
  const day = Number(card.dueDay || card.paymentDue?.slice(8, 10));
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const [year, m] = month.split("-").map(Number),
    last = new Date(year, m, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export function planProgress(plan: Plan) {
  const paid = Math.min(plan.months, Math.max(0, Number(plan.paidMonths) || 0));
  return {
    paid,
    remaining: plan.months - paid,
    percent: (paid / plan.months) * 100,
  };
}
