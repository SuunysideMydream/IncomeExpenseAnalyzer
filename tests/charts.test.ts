import { describe, expect, it } from "vitest";
import {
  allocations,
  flowPoints,
  mosaic,
  spendingPace,
} from "../src/lib/charts";
import { contrastInk } from "../src/lib/finance";
import type { Transaction } from "../src/types";
const rows: Transaction[] = [
  {
    id: "salary",
    date: "2026-10-01",
    income: 30000,
    expense: 0,
    categories: {},
  },
  {
    id: "mixed-import",
    date: "2026-10-01",
    income: 400,
    expense: 150,
    categories: { Food: -100, Transport: -20 },
    source: "workbook",
  },
  {
    id: "coffee",
    date: "2026-10-02",
    income: 0,
    expense: 80,
    categories: { Food: 80 },
  },
  {
    id: "future",
    date: "2026-11-01",
    income: 0,
    expense: 1000,
    categories: { Food: 1000 },
  },
];
describe("visualizations preserve financial meaning", () => {
  it("reconciles every calendar-day value with mixed imported and local records", () => {
    const points = flowPoints(rows, "2026-10", "daily");
    expect(points).toHaveLength(31);
    expect(points[0]).toMatchObject({
      date: "2026-10-01",
      income: 30400,
      expense: 150,
    });
    expect(points[1].expense).toBe(80);
    expect(points.at(-1)).toMatchObject({
      date: "2026-10-31",
      income: 0,
      expense: 0,
    });
    expect(points.reduce((sum, row) => sum + row.expense, 0)).toBe(230);
  });
  it("uses local month boundaries, including leap February and empty months", () => {
    expect(flowPoints([], "2024-02", "daily")).toHaveLength(29);
    expect(flowPoints([], "2026-02", "daily").at(-1)?.date).toBe("2026-02-28");
    expect(flowPoints([], "2026-10", "monthly")).toEqual([
      {
        month: "2026-10",
        date: "",
        label: "Oct",
        income: 0,
        expense: 0,
        net: 0,
        categories: {},
      },
    ]);
  });
  it("keeps actual monthly income/spending and excludes periods after the selection", () => {
    const points = flowPoints(rows, "2026-10", "monthly", ["2026-09"]);
    expect(points.map((row) => row.month)).toEqual(["2026-09", "2026-10"]);
    expect(points.at(-1)).toMatchObject({ income: 30400, expense: 230 });
  });
  it("compares the same elapsed day and defaults to today with later records available", () => {
    const pace = spendingPace(
      [
        ...rows,
        { ...rows[2], id: "earlier", date: "2026-09-01", expense: 42.75 },
        { ...rows[2], id: "later", date: "2026-10-10", expense: 5.15 },
      ],
      "2026-10",
      "2026-10-02",
    );
    expect(pace.initialIndex).toBe(1);
    expect(pace.days[pace.initialIndex]).toEqual({
      date: "2026-10-02",
      total: 230,
      previous: { date: "2026-09-02", total: 42.75 },
    });
    expect(pace.days.at(-1)).toMatchObject({
      date: "2026-10-10",
      total: 235.15,
    });
  });
  it("clamps comparison dates in shorter months and distinguishes missing history", () => {
    const pace = spendingPace(
      [{ ...rows[2], date: "2024-02-29", expense: 80.5 }],
      "2024-03",
      "2026-10-02",
    );
    expect(pace.days.at(-1)).toEqual({
      date: "2024-03-31",
      total: 0,
      previous: { date: "2024-02-29", total: 80.5 },
    });
    expect(
      spendingPace(rows, "2026-10", "2026-10-02").days[0].previous,
    ).toBeNull();
  });
  it("preserves exact category allocations and identifies the unallocated residual", () => {
    const result = allocations(rows.slice(0, 3));
    expect(result.total).toBe(230);
    expect(result.entries).toContainEqual({ name: "Food", value: 180 });
    expect(result.entries).toContainEqual({
      name: "Unallocated spending",
      value: 30,
      unallocated: true,
    });
    const over = allocations([{ ...rows[2], categories: { Food: 120 } }]);
    expect(over.overallocated).toBe(true);
    expect(over.total).toBe(120);
    expect(over.expense).toBe(80);
  });
  it("gives mosaic tiles exact proportional areas with no overlap or filler data", () => {
    const entries = [63, 20, 9, 5, 2, 1].map((value, index) => ({
      name: String(index),
      value,
    }));
    const tiles = mosaic(entries);
    expect(tiles).toHaveLength(6);
    for (const tile of tiles) {
      expect(tile.width * tile.height).toBeCloseTo(tile.value * 70, 6);
      expect(tile.x + tile.width).toBeLessThanOrEqual(100.00001);
      expect(tile.y + tile.height).toBeLessThanOrEqual(70.00001);
      for (const other of tiles.filter((other) => other !== tile)) {
        const overlapX =
          Math.min(tile.x + tile.width, other.x + other.width) -
          Math.max(tile.x, other.x);
        const overlapY =
          Math.min(tile.y + tile.height, other.y + other.height) -
          Math.max(tile.y, other.y);
        expect(Math.max(0, overlapX) * Math.max(0, overlapY)).toBeLessThan(
          0.00001,
        );
      }
    }
    expect(mosaic([{ name: "zero", value: 0 }])).toEqual([]);
  });
  it("keeps labels readable for light, dark and user-selected category colors", () => {
    expect(contrastInk("#FFFFFF")).toBe("#111111");
    expect(contrastInk("#000000")).toBe("#FFFFFF");
    expect(contrastInk("#FFFF00")).toBe("#111111");
  });
});
