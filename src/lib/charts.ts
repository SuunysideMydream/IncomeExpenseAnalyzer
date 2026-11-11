import { Finance, nextMonth } from "./finance";
import type { Transaction } from "../types";

export interface FlowPoint {
  month: string;
  date: string;
  label: string;
  income: number;
  expense: number;
}

export function flowPoints(
  rows: Transaction[],
  month: string,
  mode: "monthly" | "daily",
  seeds: string[] = [],
): FlowPoint[] {
  if (mode === "monthly") {
    return Finance.monthly(rows, [...seeds, month])
      .filter((row) => row.month <= month)
      .slice(-6)
      .map((row) => ({
        ...row,
        date: "",
        label: new Date(`${row.month}-01T12:00:00`).toLocaleDateString(
          "en-US",
          { month: "short" },
        ),
      }));
  }
  const daily = new Map(
    Finance.daily(rows.filter((row) => row.date.startsWith(month))).map(
      (row) => [row.date, row],
    ),
  );
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`,
      row = daily.get(date);
    return {
      month,
      date,
      label: String(index + 1),
      income: row?.income || 0,
      expense: row?.expense || 0,
    };
  });
}

function cumulativeSpending(points: FlowPoint[]) {
  let total = 0;
  return points.map(({ date, expense }) => {
    total = Finance.money(total + expense);
    return { date, total };
  });
}

export function spendingPace(
  rows: Transaction[],
  month: string,
  today: string,
) {
  const previousMonth = nextMonth(month, -1);
  const previousRows = rows.filter((row) => row.date.startsWith(previousMonth));
  const current = flowPoints(rows, month, "daily");
  const previous = previousRows.length
    ? cumulativeSpending(flowPoints(previousRows, previousMonth, "daily"))
    : [];
  const currentMonth = today.startsWith(month);
  const todayIndex = Number(today.slice(8, 10)) - 1;
  const latestExpense = current.reduce(
    (last, point, index) => (point.expense !== 0 ? index : last),
    -1,
  );
  const lastIndex = currentMonth
    ? Math.max(todayIndex, latestExpense)
    : current.length - 1;
  return {
    previousMonth,
    initialIndex: currentMonth ? todayIndex : lastIndex,
    days: cumulativeSpending(current.slice(0, lastIndex + 1)).map(
      (day, index) => ({
        ...day,
        // When the earlier month is shorter, its closing total is the comparison.
        previous: previous[Math.min(index, previous.length - 1)] ?? null,
      }),
    ),
  };
}

// Horizontal control handles keep each segment between its exact endpoint values.
// The curve never invents an overshooting peak or a negative financial value.
export function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return (
    `M${points[0].x},${points[0].y}` +
    points
      .slice(1)
      .map((point, index) => {
        const previous = points[index],
          middle = (point.x + previous.x) / 2;
        return ` C${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`;
      })
      .join("")
  );
}

export interface Allocation {
  name: string;
  value: number;
  unallocated?: boolean;
}
export function allocations(rows: Transaction[]) {
  const totals = Finance.totals(rows);
  const entries: Allocation[] = Object.entries(totals.categories)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const allocated = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (totals.expense - allocated > 0.009) {
    let name = "Unallocated spending";
    while (entries.some((entry) => entry.name === name)) name += " (remainder)";
    entries.push({
      name,
      value: Finance.money(totals.expense - allocated),
      unallocated: true,
    });
  }
  return {
    entries,
    total: entries.reduce((sum, entry) => sum + entry.value, 0),
    expense: totals.expense,
    overallocated: allocated - totals.expense > 0.009,
  };
}

// Binary treemap: exact proportional areas, deterministic order, no fake filler tiles.
export function mosaic(
  entries: Allocation[],
  x = 0,
  y = 0,
  width = 100,
  height = 70,
): (Allocation & { x: number; y: number; width: number; height: number })[] {
  entries = entries.filter(
    (entry) => entry.value > 0 && Number.isFinite(entry.value),
  );
  if (!entries.length) return [];
  if (entries.length === 1) return [{ ...entries[0], x, y, width, height }];
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) return [];
  let cut = 1,
    left = entries[0].value;
  while (
    cut < entries.length - 1 &&
    Math.abs(left + entries[cut].value - total / 2) < Math.abs(left - total / 2)
  )
    left += entries[cut++].value;
  const share = left / total;
  return width >= height
    ? [
        ...mosaic(entries.slice(0, cut), x, y, width * share, height),
        ...mosaic(
          entries.slice(cut),
          x + width * share,
          y,
          width * (1 - share),
          height,
        ),
      ]
    : [
        ...mosaic(entries.slice(0, cut), x, y, width, height * share),
        ...mosaic(
          entries.slice(cut),
          x,
          y + height * share,
          width,
          height * (1 - share),
        ),
      ];
}
