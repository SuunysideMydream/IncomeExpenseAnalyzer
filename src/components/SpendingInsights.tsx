import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Grid2X2,
  PieChart,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "../context";
import {
  baht2,
  contrastInk,
  Finance,
  monthText,
  safeColor,
} from "../lib/finance";
import { allocations, mosaic } from "../lib/charts";
import type { CSSVars, Transaction } from "../types";
import { SectionHeading } from "./common";

export function CategoryExplorer({ rows }: { rows: Transaction[] }) {
  const { model, month, navigate, setFilters, calm } = useApp();
  const [presentation, setPresentation] = useState<"mosaic" | "ring">("mosaic");
  const [selected, setSelected] = useState<string | null>(null);
  const { entries, total, expense, overallocated } = allocations(rows);
  const active = entries.find((entry) => entry.name === selected) || entries[0];
  useEffect(() => setSelected(null), [month]);
  const visible = entries.slice(0, 5),
    others = entries.slice(5);
  let groupName = "Other categories";
  while (entries.some((entry) => entry.name === groupName))
    groupName += " (remaining)";
  const tiles = mosaic(
    others.length
      ? [
          ...visible,
          {
            name: groupName,
            value: others.reduce((sum, entry) => sum + entry.value, 0),
          },
        ]
      : visible,
  );
  const color = (name: string) =>
    name === groupName ? "#8C8D9B" : safeColor(model.meta(name).color);
  function explore(name: string) {
    navigate("transactions");
    setFilters({
      ...EMPTY_FILTERS,
      type: "expense",
      category: entries.find((entry) => entry.name === name)?.unallocated
        ? ""
        : name,
    });
  }
  let cursor = 0;
  return (
    <section
      className="studio-panel space-category-summary"
      id="overview-spending"
      aria-label="Spending categories"
    >
      <SectionHeading
        title="Where your money goes"
        description={`${monthText(month)} · ${entries.length} spending categories`}
        action={
          <div
            className="chart-style-switch"
            role="group"
            aria-label="Category visualization"
          >
            <button
              aria-label="Category mosaic"
              aria-pressed={presentation === "mosaic"}
              onClick={() => setPresentation("mosaic")}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              aria-label="Category ring"
              aria-pressed={presentation === "ring"}
              onClick={() => setPresentation("ring")}
            >
              <PieChart size={17} />
            </button>
          </div>
        }
      />
      {entries.length ? (
        <>
          {presentation === "mosaic" ? (
            <div
              className="category-mosaic"
              aria-label="Spending mosaic; tile areas represent category allocations"
            >
              {tiles.map((tile, index) => (
                <motion.button
                  key={tile.name}
                  className={`mosaic-tile ${active?.name === tile.name ? "is-selected" : ""}`}
                  style={
                    {
                      left: `${tile.x}%`,
                      top: `${(tile.y / 70) * 100}%`,
                      width: `${tile.width}%`,
                      height: `${(tile.height / 70) * 100}%`,
                      "--tile-color": color(tile.name),
                      "--tile-ink": contrastInk(color(tile.name)),
                    } as CSSVars
                  }
                  initial={calm ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: calm ? 0 : 0.35,
                    delay: calm ? 0 : index * 0.025,
                  }}
                  aria-label={`${tile.name}: ${baht2(tile.value)}, ${((tile.value / total) * 100).toFixed(1)} percent`}
                  aria-pressed={
                    tile.name === groupName
                      ? selected === groupName
                      : active?.name === tile.name
                  }
                  onPointerEnter={() => setSelected(tile.name)}
                  onFocus={() => setSelected(tile.name)}
                  onClick={() => setSelected(tile.name)}
                >
                  <span
                    className={
                      tile.width * tile.height < 420 ? "mosaic-small" : ""
                    }
                  >
                    <b>{tile.name}</b>
                    <strong>{baht2(tile.value)}</strong>
                    <small>{((tile.value / total) * 100).toFixed(1)}%</small>
                  </span>
                  <ArrowUpRight size={16} />
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="category-ring-wrap">
              <svg
                viewBox="0 0 220 220"
                className="category-ring"
                aria-hidden="true"
              >
                <circle
                  cx="110"
                  cy="110"
                  r="87"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="28"
                />
                {entries.map((entry) => {
                  const share = (entry.value / total) * 100,
                    offset = cursor;
                  cursor += share;
                  return (
                    <circle
                      key={entry.name}
                      cx="110"
                      cy="110"
                      r="87"
                      fill="none"
                      stroke={color(entry.name)}
                      strokeWidth={active?.name === entry.name ? 34 : 26}
                      pathLength={100}
                      strokeDasharray={`${Math.max(0.01, share - Math.min(0.6, share * 0.12))} ${100 - share + Math.min(0.6, share * 0.12)}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90 110 110)"
                      className="category-ring-segment"
                      style={{
                        opacity: active?.name === entry.name ? 1 : 0.42,
                      }}
                      onPointerEnter={() => setSelected(entry.name)}
                      onClick={() => setSelected(entry.name)}
                    />
                  );
                })}
              </svg>
              <div className="category-ring-center">
                <small>Selected category</small>
                <strong>{baht2(active?.value || 0)}</strong>
                <span>{active?.name}</span>
              </div>
            </div>
          )}
          <div className="allocation-readout">
            <span>
              <i
                style={{
                  background: color(
                    selected === groupName ? groupName : active?.name || "",
                  ),
                }}
              />
              {selected === groupName ? groupName : active?.name}
            </span>
            <strong>
              {baht2(
                selected === groupName
                  ? others.reduce((sum, entry) => sum + entry.value, 0)
                  : active?.value || 0,
              )}
            </strong>
          </div>
          <div className="allocation-list" aria-label="Category amounts">
            {entries.map((entry) => (
              <div
                className={`allocation-row ${active?.name === entry.name && selected !== groupName ? "is-selected" : ""}`}
                key={entry.name}
              >
                <button
                  className="allocation-select"
                  aria-pressed={
                    active?.name === entry.name && selected !== groupName
                  }
                  onPointerEnter={() => setSelected(entry.name)}
                  onFocus={() => setSelected(entry.name)}
                  onClick={() => setSelected(entry.name)}
                >
                  <i style={{ background: color(entry.name) }} />
                  <span>{entry.name}</span>
                  <small>{((entry.value / total) * 100).toFixed(1)}%</small>
                  <b>{baht2(entry.value)}</b>
                </button>
                <button
                  className="allocation-open"
                  aria-label={
                    entry.unallocated
                      ? "View all spending records"
                      : `View ${entry.name} transactions`
                  }
                  onClick={() => explore(entry.name)}
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="studio-hint">
            {overallocated
              ? `Category allocations total ${baht2(total)}; recorded spending is ${baht2(expense)}.`
              : "Select a tile or category to inspect. The arrow opens matching records."}
            {entries.some((entry) => entry.unallocated)
              ? " Unallocated amounts open all expense records; imported daily totals stay intact."
              : ""}
          </p>
        </>
      ) : (
        <div className="studio-empty-chart">
          <PieChart />
          <h4>No spending to plot yet</h4>
          <p>Your categories will take shape as you add expenses.</p>
        </div>
      )}
      <button
        className="link-button studio-manage-link"
        onClick={() => navigate("categories")}
      >
        Manage categories <ArrowRight size={15} />
      </button>
    </section>
  );
}

export function SpendingCalendar() {
  const { model, month, open } = useApp();
  const daily = new Map(
    Finance.daily(
      model.transactions.filter((row) => row.date.startsWith(month)),
    ).map((row) => [row.date, row]),
  );
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const offset = new Date(`${month}-01T12:00:00`).getDay();
  const max = Math.max(
    1,
    ...Array.from(daily.values()).map((row) => row.expense),
  );
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [month]);
  const current =
    selected && selected.startsWith(month) ? daily.get(selected) : null;
  return (
    <section
      className="studio-panel spending-calendar"
      aria-label="Daily spending heatmap"
    >
      <SectionHeading
        title="Your spending rhythm"
        description={`${monthText(month)} · recorded spending by day`}
        action={<CalendarDays size={19} className="studio-muted" />}
      />
      <div className="spending-heatmap" aria-label="Daily spending calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span className="heatmap-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`space-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, "0")}`,
            row = daily.get(date),
            amount = row?.expense || 0;
          const level =
            amount > 0 ? Math.min(4, Math.ceil((amount / max) * 4)) : 0;
          return (
            <button
              key={date}
              className={`heatmap-day heatmap-level-${level} ${date === Finance.localDate() ? "is-today" : ""} ${selected === date ? "is-inspected" : ""}`}
              data-date={date}
              aria-label={`${date}: ${baht2(amount)} spending, ${row?.count || 0} records`}
              title={`${date} · ${baht2(amount)} spending`}
              onPointerEnter={() => setSelected(date)}
              onFocus={() => setSelected(date)}
              onClick={() => {
                setSelected(date);
                row
                  ? open({ kind: "day", date })
                  : open({ kind: "transaction", type: "expense", date });
              }}
            >
              <span>{index + 1}</span>
              {row?.income ? <i aria-label="Income recorded" /> : null}
            </button>
          );
        })}
      </div>
      <div className="heatmap-footer">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`heatmap-level-${level}`} />
        ))}
        <span>More</span>
        <small>• Income</small>
      </div>
      <div className="heatmap-readout">
        <span>{selected || "Explore a day"}</span>
        <strong>
          {selected
            ? baht2(current?.expense || 0)
            : `${daily.size} active days`}
        </strong>
      </div>
      <p className="studio-hint">
        Select a day for details. Empty days open a new expense.
      </p>
    </section>
  );
}
