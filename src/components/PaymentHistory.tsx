import { useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../context";
import { baht, baht2, COLORS, Finance, monthText } from "../lib/finance";
import { Select } from "./ui/select";
import { Segmented } from "./ui/segmented";
import type { Workbook } from "../types";
export function PaymentHistory() {
  const { model } = useApp(),
    rows = model.data.cardPayments,
    months = [...new Set(rows.map((row) => row.month.slice(0, 7)))].sort(),
    names = [...new Set(rows.flatMap((row) => Object.keys(row.cards)))].sort();
  const today = Finance.localDate().slice(0, 7),
    [month, setMonth] = useState(
      months.includes(today) ? today : months.at(-1) || today,
    ),
    [mode, setMode] = useState<"cards" | "trend" | "selected">("cards"),
    [window, setWindow] = useState("12"),
    [limit, setLimit] = useState(4),
    [selection, setSelection] = useState<string[] | null>(null);
  if (!rows.length) return null;
  const current: Record<string, number> = {},
    history: Record<string, number> = {};
  for (const row of rows) {
    for (const [name, value] of Object.entries(row.cards)) {
      if (row.month.slice(0, 7) === month)
        current[name] = (current[name] || 0) + Number(value);
      if (row.month.slice(0, 7) <= month)
        history[name] = (history[name] || 0) + Number(value);
    }
  }
  const ranked = Object.entries(current)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]),
    total = ranked.reduce((sum, [, value]) => sum + value, 0),
    largest = ranked[0]?.[1] || 1;
  const auto = names
      .slice()
      .sort(
        (a, b) =>
          (current[b] || 0) - (current[a] || 0) ||
          (history[b] || 0) - (history[a] || 0),
      )
      .slice(0, limit),
    selected = selection || auto;
  const eligible = rows.filter((row) => row.month.slice(0, 7) <= month),
    trend = window === "all" ? eligible : eligible.slice(-Number(window));
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const color = (name: string) =>
    model.cards.find((card) => normalize(card.name) === normalize(name))
      ?.color || COLORS[names.indexOf(name) % COLORS.length];
  const series =
    mode === "trend"
      ? [
          {
            name: "All card payments",
            color: "#7460dc",
            values: trend.map((row) =>
              Object.values(row.cards).reduce(
                (sum, value) => sum + Number(value),
                0,
              ),
            ),
          },
        ]
      : selected.map((name) => ({
          name,
          color: color(name),
          values: trend.map((row) => Number(row.cards[name]) || 0),
        }));
  const logged: Record<string, number> = {};
  for (const row of model.transactions.filter(
    (row) => row.date.startsWith(month) && row.card && row.expense > 0,
  )) {
    const name =
      model.cards.find((card) => card.id === row.card || card.name === row.card)
        ?.name || row.card!;
    logged[name] = (logged[name] || 0) + row.expense;
  }
  return (
    <details className="workbook-history">
      <summary>Imported workbook payment history</summary>
      <section className="card card-insights">
        <div className="card-insights-head">
          <div>
            <h2>Card payment insights</h2>
            <p className="period">
              Historical workbook payments · separate from logged purchases
            </p>
          </div>
          <label className="insight-month-picker">
            Payment month
            <Select
              label="Payment month"
              value={month}
              onChange={setMonth}
              options={months.map((value) => ({
                value,
                label: monthText(value),
              }))}
            />
          </label>
        </div>
        <div className="card-insight-stats">
          <div>
            <small>Total card payments</small>
            <strong>{baht2(total)}</strong>
          </div>
          <div>
            <small>Largest payment</small>
            <strong>{baht2(ranked[0]?.[1] || 0)}</strong>
            <span>{ranked[0]?.[0] || "No card payments"}</span>
          </div>
          <div>
            <small>Cards with payments</small>
            <strong>{ranked.length}</strong>
          </div>
        </div>
        <div className="card-chart-toolbar">
          <Segmented
            label="Card payment comparison"
            value={mode}
            onChange={setMode}
            options={[
              { value: "cards", label: "By card" },
              { value: "trend", label: "Payment trend" },
              { value: "selected", label: "Selected cards" },
            ]}
          />
          {mode !== "cards" && (
            <Select
              label="History range"
              value={window}
              onChange={setWindow}
              options={[
                { value: "6", label: "6 months" },
                { value: "12", label: "12 months" },
                { value: "all", label: "All history" },
              ]}
            />
          )}
        </div>
        {mode === "selected" && (
          <details className="card-comparison-picker">
            <summary>
              Choose cards · {selected.length}/{limit}
            </summary>
            <div className="card-picker-panel">
              <label className="limit-picker">
                Show up to
                <Select
                  label="Maximum comparison cards"
                  value={String(limit)}
                  onChange={(value) => {
                    const next = Number(value);
                    setLimit(next);
                    if (selection) setSelection(selection.slice(0, next));
                  }}
                  options={Array.from(
                    { length: Math.max(4, names.length) },
                    (_, index) => ({
                      value: String(index + 1),
                      label: `${index + 1} cards`,
                    }),
                  )}
                />
              </label>
              <div className="card-picker-list">
                {names.map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={selected.includes(name)}
                      disabled={
                        !selected.includes(name) && selected.length >= limit
                      }
                      onChange={(event) =>
                        setSelection(
                          event.target.checked
                            ? [...selected, name].slice(0, limit)
                            : selected.filter((value) => value !== name),
                        )
                      }
                    />
                    <i style={{ background: color(name) }} />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              <small>Choose up to {limit} cards to compare.</small>
            </div>
          </details>
        )}
        {mode === "cards" ? (
          <div className="card-payment-bars">
            {ranked.length ? (
              ranked.map(([name, value], rank) => (
                <button
                  className="card-payment-row"
                  key={name}
                  onClick={() => {
                    setSelection(
                      [
                        name,
                        ...selected.filter((value) => value !== name),
                      ].slice(0, limit),
                    );
                    setMode("selected");
                  }}
                >
                  <span className="payment-card-name">
                    <i style={{ background: color(name) }} />
                    {name}
                    {rank === 0 && <em>Largest</em>}
                  </span>
                  <span className="payment-track">
                    <i
                      style={{
                        width: `${(value / largest) * 100}%`,
                        background: color(name),
                      }}
                    />
                  </span>
                  <b>{baht2(value)}</b>
                  <span className="payment-drill">Trend ↗</span>
                </button>
              ))
            ) : (
              <p className="insight">
                No card payments are listed for {monthText(month)}.
              </p>
            )}
          </div>
        ) : (
          <PaymentLineChart rows={trend} series={series} />
        )}
        <p className="ledger-hint">
          Imported payment schedules are not bank-synced statements and do not
          create transaction expenses.
        </p>
        <div className="logged-card-spending">
          <div>
            <strong>Card-tagged purchases</strong>
            <span>
              {Object.keys(logged).length
                ? `${monthText(month)} · ${baht2(Object.values(logged).reduce((sum, value) => sum + value, 0))} total`
                : "No card-tagged purchases recorded for this payment month."}
            </span>
          </div>
          <div className="logged-card-chips">
            {Object.entries(logged)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => (
                <span key={name}>
                  <i style={{ background: color(name) }} />
                  {name} <b>{baht2(value)}</b>
                </span>
              ))}
          </div>
        </div>
      </section>
    </details>
  );
}
function PaymentLineChart({
  rows,
  series,
}: {
  rows: Workbook["cardPayments"];
  series: { name: string; color: string; values: number[] }[];
}) {
  const { calm } = useApp();
  if (!rows.length || !series.length)
    return (
      <p className="insight">
        Choose at least one card with history to compare.
      </p>
    );
  const W = 760,
    H = 245,
    L = 58,
    R = 16,
    T = 17,
    B = 38,
    max = Math.max(1, ...series.flatMap((item) => item.values)),
    x = (index: number) =>
      L +
      (rows.length < 2
        ? (W - L - R) / 2
        : (index * (W - L - R)) / (rows.length - 1)),
    y = (value: number) => T + (H - T - B) * (1 - value / max);
  return (
    <>
      <div className="payment-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Monthly credit card payment comparison"
        >
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line
                className="payment-gridline"
                x1={L}
                x2={W - R}
                y1={y(max * ratio)}
                y2={y(max * ratio)}
              />
              <text
                className="payment-axis-label"
                x={L - 8}
                y={y(max * ratio) + 4}
                textAnchor="end"
              >
                {baht(max * ratio)}
              </text>
            </g>
          ))}
          {[
            ...new Set([0, Math.round((rows.length - 1) / 2), rows.length - 1]),
          ].map((index) => (
            <text
              key={index}
              className="payment-axis-label"
              x={x(index)}
              y={H - 9}
              textAnchor="middle"
            >
              {new Date(
                `${rows[index].month.slice(0, 7)}-01T12:00:00`,
              ).toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              })}
            </text>
          ))}
          {series.map((item) => (
            <g key={item.name}>
              <motion.polyline
                className="payment-line"
                points={item.values
                  .map((value, index) => `${x(index)},${y(value)}`)
                  .join(" ")}
                stroke={item.color}
                initial={calm ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.65 }}
              />
              {item.values.map((value, index) => (
                <circle
                  key={index}
                  cx={x(index)}
                  cy={y(value)}
                  r={3}
                  fill={item.color}
                >
                  <title>
                    {item.name} · {monthText(rows[index].month.slice(0, 7))}:{" "}
                    {baht2(value)}
                  </title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="payment-legend">
        {series.map((item) => (
          <span key={item.name}>
            <i style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
      <details className="react-history-data">
        <summary>View exact comparison totals</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                {series.map((item) => (
                  <th key={item.name}>{item.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.month}-${index}`}>
                  <td>{monthText(row.month.slice(0, 7))}</td>
                  {series.map((item) => (
                    <td key={item.name}>{baht2(item.values[index])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
