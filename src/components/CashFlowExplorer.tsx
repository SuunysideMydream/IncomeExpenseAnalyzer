import { useEffect, useId, useState, type PointerEvent } from "react";
import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChartColumn,
  ChartNoAxesCombined,
} from "lucide-react";
import { useApp } from "../context";
import { baht2, monthText, signedMoney } from "../lib/finance";
import { flowPoints, smoothPath } from "../lib/charts";
import { Segmented } from "./ui/segmented";
import { SectionHeading } from "./common";
import { SpendingPace } from "./SpendingPace";

type Period = "monthly" | "daily";
type ChartStyle = "bars" | "area";

export function CashFlowExplorer() {
  const { month } = useApp();
  const [mode, setMode] = useState<Period | "pace">("monthly");
  const [style, setStyle] = useState<ChartStyle>("bars");
  const [small, setSmall] = useState(
    () => matchMedia("(max-width:620px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:620px)"),
      listener = () => setSmall(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return (
    <>
      <SectionHeading
        title="Cash flow"
        description={
          mode === "pace"
            ? "Compare recorded spending at the same point in each month."
            : "Income and spending from your recorded entries."
        }
        action={
          <Segmented
            label="Cash flow period"
            value={mode}
            onChange={setMode}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "daily", label: "Daily" },
              { value: "pace", label: "Spending pace" },
            ]}
          />
        }
      />
      {mode === "pace" ? (
        <SpendingPace key={month} small={small} />
      ) : (
        <CashFlowSeries
          mode={mode}
          style={style}
          setStyle={setStyle}
          small={small}
        />
      )}
    </>
  );
}

function CashFlowSeries({
  mode,
  style,
  setStyle,
  small,
}: {
  mode: Period;
  style: ChartStyle;
  setStyle: (style: ChartStyle) => void;
  small: boolean;
}) {
  const { model, month, openMonth, open, calm } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    setSelected(null);
    setHover(null);
  }, [month, mode]);
  const points = flowPoints(
    model.transactions,
    month,
    mode,
    model.data.months.map((row) => row.month),
  );
  const at = Math.max(
      0,
      Math.min(points.length - 1, hover ?? selected ?? points.length - 1),
    ),
    point = points[at];
  const W = small ? 420 : 860,
    H = small ? 270 : 300,
    L = small ? 38 : 54,
    R = 10,
    T = 18,
    bottom = H - 30;
  const max = Math.max(
    1,
    ...points.flatMap((row) => [row.income, row.expense]),
  );
  const band = (W - L - R) / Math.max(1, points.length),
    x = (index: number) => L + band * (index + 0.5),
    y = (value: number) => bottom - (value / max) * (bottom - T);
  const title = point?.date || (point && monthText(point.month));
  const inspect = () => {
    if (point)
      point.date
        ? open({ kind: "day", date: point.date })
        : openMonth(point.month);
  };
  function scrub(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - rect.left) / rect.width) * W;
    setHover(
      Math.max(
        0,
        Math.min(points.length - 1, Math.floor((position - L) / band)),
      ),
    );
  }
  return (
    <>
      <div className="flow-topline">
        <div className="flow-period">
          <span className="studio-eyebrow">EXPLORING</span>
          <strong>{title}</strong>
        </div>
        <div
          className="chart-style-switch"
          role="group"
          aria-label="Chart presentation"
        >
          <button
            aria-label="Bar chart"
            aria-pressed={style === "bars"}
            onClick={() => setStyle("bars")}
          >
            <ChartColumn size={17} />
          </button>
          <button
            aria-label="Area chart"
            aria-pressed={style === "area"}
            onClick={() => setStyle("area")}
          >
            <ChartNoAxesCombined size={17} />
          </button>
        </div>
      </div>
      <div className="flow-readout" aria-label="Selected period totals">
        <div>
          <span>
            <i className="income-dot" /> Income
          </span>
          <strong>{baht2(point?.income || 0)}</strong>
        </div>
        <div>
          <span>
            <i className="spending-dot" /> Spending
          </span>
          <strong>{baht2(point?.expense || 0)}</strong>
        </div>
        <div>
          <span>Net recorded</span>
          <strong
            className={
              (point?.income || 0) - (point?.expense || 0) < 0 ? "negative" : ""
            }
          >
            {signedMoney((point?.income || 0) - (point?.expense || 0))}
          </strong>
        </div>
      </div>
      <div className="flow-canvas" data-chart-style={style}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${mode === "monthly" ? "Monthly" : "Daily"} income and spending in Thai baht, ${style} chart`}
          onPointerMove={scrub}
          onPointerDown={scrub}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${id}-income`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--chart-income)" stopOpacity=".8" />
              <stop
                offset="1"
                stopColor="var(--chart-income)"
                stopOpacity=".12"
              />
            </linearGradient>
            <linearGradient id={`${id}-expense`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--chart-spending)" stopOpacity=".75" />
              <stop
                offset="1"
                stopColor="var(--chart-spending)"
                stopOpacity=".12"
              />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                className="flow-grid"
                x1={L}
                x2={W - R}
                y1={y(max * ratio)}
                y2={y(max * ratio)}
              />
              <text x={L - 9} y={y(max * ratio) + 4} textAnchor="end">
                {max * ratio >= 1000
                  ? `${((max * ratio) / 1000).toFixed(max * ratio < 10000 ? 1 : 0)}k`
                  : Math.round(max * ratio)}
              </text>
            </g>
          ))}
          <motion.rect
            className="flow-crosshair-band"
            width={Math.min(band * 0.92, 120)}
            height={bottom - T + 8}
            y={T - 4}
            rx={8}
            animate={{ x: x(at) - Math.min(band * 0.92, 120) / 2 }}
            transition={
              calm
                ? { duration: 0 }
                : { type: "spring", bounce: 0, duration: 0.22 }
            }
          />
          {(["income", "expense"] as const).map((key, series) => {
            const color =
              key === "income"
                ? "var(--chart-income)"
                : "var(--chart-spending)";
            const path = smoothPath(
              points.map((row, index) => ({ x: x(index), y: y(row[key]) })),
            );
            return (
              <g key={key}>
                {style === "bars" || points.length === 1 ? (
                  points.map((row, index) => {
                    const width = Math.min(small ? 24 : 38, band * 0.3),
                      height = bottom - y(row[key]);
                    return (
                      <motion.rect
                        key={`${mode}-${row.date || row.month}`}
                        x={x(index) + (series ? 2 : -width - 2)}
                        width={width}
                        rx={Math.min(6, width / 3)}
                        fill={color}
                        initial={calm ? false : { y: bottom, height: 0 }}
                        animate={{
                          y: y(row[key]),
                          height,
                          opacity: index === at ? 1 : 0.42,
                        }}
                        transition={
                          calm
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                bounce: 0,
                                duration: 0.42,
                                delay: index * 0.008,
                              }
                        }
                      >
                        <title>
                          {row.date || monthText(row.month)} ·{" "}
                          {key === "income" ? "Income" : "Spending"}:{" "}
                          {baht2(row[key])}
                        </title>
                      </motion.rect>
                    );
                  })
                ) : (
                  <>
                    <motion.path
                      key={`${month}-${mode}-area`}
                      d={`${path} L${x(points.length - 1)},${bottom} L${x(0)},${bottom} Z`}
                      fill={`url(#${id}-${key})`}
                      initial={calm ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: calm ? 0 : 0.35 }}
                    />
                    <motion.path
                      key={`${month}-${mode}-line`}
                      d={path}
                      stroke={color}
                      strokeWidth={3}
                      fill="none"
                      initial={calm ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: calm ? 0 : 0.6 }}
                    />
                    <motion.circle
                      r={5}
                      fill={color}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      animate={{ cx: x(at), cy: y(point?.[key] || 0) }}
                      transition={
                        calm
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0, duration: 0.2 }
                      }
                    />
                  </>
                )}
              </g>
            );
          })}
          {points.map((row, index) =>
            mode === "daily" &&
            index % 5 !== 0 &&
            index !== points.length - 1 ? null : (
              <text
                key={index}
                x={x(index)}
                y={H - 7}
                textAnchor="middle"
                className={at === index ? "flow-axis-active" : ""}
              >
                {row.label}
              </text>
            ),
          )}
        </svg>
      </div>
      <div className="flow-explore-controls">
        <label className="flow-scrubber">
          <span>Explore {mode === "daily" ? "days" : "months"}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, points.length - 1)}
            value={at}
            aria-label="Explore cash flow periods"
            aria-valuetext={`${title}: income ${baht2(point?.income || 0)}, spending ${baht2(point?.expense || 0)}`}
            onChange={(event) => {
              setHover(null);
              setSelected(Number(event.target.value));
            }}
          />
        </label>
        <button className="link-button" onClick={inspect}>
          View period <ArrowRight size={15} />
        </button>
      </div>
      <div className="space-chart-months">
        {mode === "monthly" ? (
          points.map((row) => (
            <button
              className="activity-month"
              key={row.month}
              onClick={() => openMonth(row.month)}
              title={`Income ${baht2(row.income)} · Spending ${baht2(row.expense)}`}
            >
              {new Date(`${row.month}-01T12:00:00`).toLocaleDateString(
                "en-US",
                { month: "short", year: "2-digit" },
              )}
              <ArrowRight size={12} />
            </button>
          ))
        ) : (
          <span>{monthText(month)} · select a day to explore</span>
        )}
      </div>
      <details className="space-chart-data">
        <summary>
          View exact {mode === "monthly" ? "monthly" : "daily"} totals
        </summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>
                  <ArrowDownLeft size={12} /> Income
                </th>
                <th>
                  <ArrowUpRight size={12} /> Spending
                </th>
                <th>Net</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {points.map((row) => (
                <tr key={row.date || row.month}>
                  <td>{row.date || monthText(row.month)}</td>
                  <td>{baht2(row.income)}</td>
                  <td>{baht2(row.expense)}</td>
                  <td>{signedMoney(row.income - row.expense)}</td>
                  <td>
                    <button
                      className="edit-row"
                      onClick={() =>
                        row.date
                          ? open({ kind: "day", date: row.date })
                          : openMonth(row.month)
                      }
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
