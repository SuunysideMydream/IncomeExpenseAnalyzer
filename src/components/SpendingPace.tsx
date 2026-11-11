import { useId, useMemo, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useApp } from "../context";
import { spendingPace } from "../lib/charts";
import { baht2, Finance, monthText } from "../lib/finance";
import { dateText } from "../lib/recurring";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function SpendingPace({ small }: { small: boolean }) {
  const { model, month, calm, open } = useApp();
  const today = Finance.localDate();
  const { days, previousMonth, initialIndex } = useMemo(
    () => spendingPace(model.transactions, month, today),
    [model.transactions, month, today],
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const index = Math.min(hover ?? selected ?? initialIndex, days.length - 1);
  const day = days[index];
  const previous = day.previous;
  const diff = previous ? Finance.money(day.total - previous.total) : 0;
  const gradient = useId();
  const width = small ? 360 : 660;
  const height = small ? 174 : 224;
  const left = small ? 40 : 48;
  const top = 14;
  const right = width - 15;
  const bottom = height - 25;
  const band = (right - left) / days.length;
  const max = Math.max(
    1,
    ...days.map((point) => Math.max(point.total, point.previous?.total ?? 0)),
  );
  const x = (i: number) => left + (i + 0.5) * band;
  const y = (amount: number) => bottom - (amount / max) * (bottom - top);
  const path = (totals: number[]) =>
    `M${left},${bottom} ${totals.map((total, i) => `H${x(i)} V${y(total)}`).join(" ")} H${right}`;
  const line = path(days.map((point) => point.total));
  const previousLine = previous
    ? path(days.map((point) => point.previous!.total))
    : null;
  const tickDays = [
    ...new Set(
      [0, 4, 9, 14, 19, 24]
        .filter((i) => i < days.length - 3)
        .concat(days.length - 1),
    ),
  ];
  const transition = calm
    ? { duration: 0 }
    : ({ type: "spring", bounce: 0, duration: 0.22 } as const);

  function pointAt(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - rect.left) / rect.width) * width;
    return Math.max(
      0,
      Math.min(days.length - 1, Math.floor((position - left) / band)),
    );
  }

  return (
    <div className="spending-pace">
      <div className="pace-readout">
        <div>
          <span>
            <i className="pace-key" /> Through {dateText(day.date)}
          </span>
          <strong>{baht2(day.total)}</strong>
        </div>
        <div>
          <span>
            <i className="pace-key previous" />{" "}
            {previous
              ? `Through ${dateText(previous.date)}`
              : monthText(previousMonth)}
          </span>
          {previous ? (
            <strong>{baht2(previous.total)}</strong>
          ) : (
            <small>No entries</small>
          )}
        </div>
        {previous && (
          <p className="pace-difference">
            {diff === 0
              ? "Same spending"
              : `${baht2(diff)} ${diff > 0 ? "higher" : "lower"}`}
          </p>
        )}
      </div>
      <svg
        className="pace-canvas"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Cumulative spending for ${monthText(month)}${previous ? ` and ${monthText(previousMonth)}` : ""}`}
        onPointerMove={(event) => {
          if (event.pointerType !== "touch") setHover(pointAt(event));
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          setSelected(pointAt(event));
          setHover(null);
        }}
      >
        <defs>
          <linearGradient id={gradient} x2="0" y2="1">
            <stop stopColor="var(--primary)" stopOpacity=".21" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0, 1 / 3, 2 / 3, 1].map((part) => (
          <g key={part}>
            <line
              className="flow-grid"
              x1={left}
              x2={right}
              y1={y(max * part)}
              y2={y(max * part)}
            />
            <text x={left - 8} y={y(max * part) + 4} textAnchor="end">
              {compact.format(max * part)}
            </text>
          </g>
        ))}
        <path fill={`url(#${gradient})`} d={`${line} V${bottom} H${left} Z`} />
        {previousLine && (
          <path className="pace-line previous" d={previousLine} />
        )}
        <path className="pace-line" d={line} />
        <motion.line
          className="pace-cursor"
          y1={top}
          y2={bottom}
          initial={false}
          animate={{ x1: x(index), x2: x(index) }}
          transition={transition}
        />
        {previous && (
          <motion.circle
            className="pace-point previous"
            r={4}
            initial={false}
            animate={{ cx: x(index), cy: y(previous.total) }}
            transition={transition}
          />
        )}
        <motion.circle
          className="pace-point"
          r={5}
          initial={false}
          animate={{ cx: x(index), cy: y(day.total) }}
          transition={transition}
        />
        {tickDays.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 7}
            textAnchor="middle"
            className={i === index ? "is-inspected" : undefined}
          >
            {i + 1}
          </text>
        ))}
      </svg>
      <div className="flow-explore-controls">
        <label className="flow-scrubber">
          <span>Explore days</span>
          <input
            type="range"
            min={1}
            max={days.length}
            value={index + 1}
            aria-label="Explore spending pace by day"
            aria-valuetext={`${dateText(day.date)}: ${baht2(day.total)}${previous ? `; ${dateText(previous.date)}: ${baht2(previous.total)}` : ""}`}
            onChange={(event) => {
              setHover(null);
              setSelected(Number(event.target.value) - 1);
            }}
          />
        </label>
        <button
          className="link-button"
          onClick={() => open({ kind: "day", date: day.date })}
        >
          View day <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
