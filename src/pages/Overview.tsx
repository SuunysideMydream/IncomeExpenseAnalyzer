import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Home,
  Plus,
  Repeat2,
  ShoppingBag,
  Timer,
  Wallet,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "../context";
import {
  baht2,
  Finance,
  monthText,
  nextMonth,
  safeColor,
  signedMoney,
} from "../lib/finance";
import type { CSSVars, Transaction } from "../types";
import { MonthPicker, SectionHeading } from "../components/common";
import { PaymentHistory } from "../components/PaymentHistory";
import { CashFlowExplorer } from "../components/CashFlowExplorer";
import {
  CategoryExplorer,
  SpendingCalendar,
} from "../components/SpendingInsights";
import { Reveal } from "../components/Reveal";
import { RecordIcon } from "../components/RecordIcon";
import { addDays, dateText } from "../lib/recurring";
export default function Overview() {
  const {
      model,
      state,
      month,
      setMonth,
      open,
      navigate,
      setFilters,
      setTxMode,
      calm,
    } = useApp(),
    rows = model.transactions.filter((row) => row.date.startsWith(month)),
    sum = Finance.totals(rows),
    previous = nextMonth(month, -1),
    previousRows = model.transactions.filter((row) =>
      row.date.startsWith(previous),
    ),
    last = model.transactions
      .map((row) => row.date)
      .sort()
      .at(-1),
    active = model.plans.filter((plan) => plan.status === "Ongoing"),
    days = Finance.daily(rows);
  const lightX = useSpring(0, { stiffness: 110, damping: 24 }),
    lightY = useSpring(0, { stiffness: 110, damping: 24 });
  const commitment = active.reduce((total, plan) => total + plan.monthly, 0),
    stats = [
      {
        label: "Net balance",
        value: signedMoney(sum.net),
        tone: "violet",
        Icon: Wallet,
        sub: "Income minus recorded spending",
        action: () => {
          navigate("transactions");
          setTxMode("day");
          setFilters(EMPTY_FILTERS);
        },
      },
      {
        label: "Total income",
        value: baht2(sum.income),
        tone: "mint",
        Icon: ArrowDownLeft,
        action: () => {
          navigate("transactions");
          setTxMode("day");
          setFilters({ ...EMPTY_FILTERS, type: "income" });
        },
      },
      {
        label: "Total spending",
        value: baht2(sum.expense),
        tone: "coral",
        Icon: ArrowUpRight,
        sub: previousRows.length
          ? `${signedMoney(sum.expense - Finance.totals(previousRows).expense)} vs all of ${monthText(previous)}`
          : undefined,
        action: () => {
          navigate("transactions");
          setTxMode("day");
          setFilters({ ...EMPTY_FILTERS, type: "expense" });
        },
      },
    ];
  return (
    <>
      <header className="space-page-heading overview-heading">
        <div>
          <div className="space-breadcrumb">
            <Home aria-hidden="true" />
            <span>{state.workspace.profile?.name || "My workspace"}</span>
          </div>
          <h1 id="page-title">
            Overview<span className="studio-title-dot">.</span>
          </h1>
          {last && (
            <div className="overview-latest">
              <span>
                Latest entry ·{" "}
                <time dateTime={last}>
                  {dateText(last)}, {last.slice(0, 4)}
                </time>
              </span>
              {!last.startsWith(month) && (
                <button
                  className="link-button latest-month-link"
                  onClick={() => setMonth(last.slice(0, 7))}
                >
                  Jump to month <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="month-navigation">
          <button
            className="secondary"
            aria-label="Previous month"
            onClick={() => setMonth(nextMonth(month, -1))}
          >
            <ArrowLeft size={15} />
          </button>
          <MonthPicker
            label="Overview month"
            value={month}
            onChange={setMonth}
          />
          <button
            className="secondary"
            aria-label="Next month"
            onClick={() => setMonth(nextMonth(month))}
          >
            <ArrowRight size={15} />
          </button>
          <button
            className="primary"
            onClick={() => open({ kind: "transaction" })}
          >
            <Plus size={16} /> Add transaction
          </button>
        </div>
      </header>
      <div
        className="workbench-overview-hero"
        onPointerMove={
          calm
            ? undefined
            : (event) => {
                if (event.pointerType !== "mouse") return;
                const rect = event.currentTarget.getBoundingClientRect();
                lightX.set(
                  ((event.clientX - rect.left) / rect.width - 0.5) * 56,
                );
                lightY.set(
                  ((event.clientY - rect.top) / rect.height - 0.5) * 28,
                );
              }
        }
        onPointerLeave={() => {
          lightX.set(0);
          lightY.set(0);
        }}
      >
        <motion.div
          className="overview-contours"
          aria-hidden="true"
          style={calm ? undefined : { x: lightX, y: lightY }}
        />
        <section
          className="workbench-hero-financials"
          aria-label="Recorded monthly overview"
        >
          <div className="kpis">
            {stats.map(({ label, value, tone, Icon, sub, action }) => (
              <button
                type="button"
                className="card kpi studio-stat"
                key={label}
                data-tone={tone}
                onClick={action}
                aria-label={`${label}: ${value}. View details`}
              >
                <div className="kpi-label">
                  <span>{label}</span>
                  <span className={`space-tile ${tone}`}>
                    <Icon />
                  </span>
                </div>
                <div
                  className={`kpi-value ${tone === "mint" ? "positive" : tone === "coral" || (tone === "violet" && sum.net < 0) ? "negative" : ""}`}
                >
                  {value}
                </div>
                {sub && <div className="kpi-sub">{sub}</div>}
                <ArrowUpRight className="studio-stat-arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
        <div className="overview-commitments">
          <BudgetCard expense={sum.expense} />
          <button
            type="button"
            className="overview-installments"
            onClick={() => navigate("installments")}
            aria-label={`Installments / month: ${baht2(commitment)}. View details`}
          >
            <Timer size={17} />
            <span>
              <b>Installments / month</b>
              <small>
                {active.length} active {active.length === 1 ? "plan" : "plans"}
              </small>
            </span>
            <strong>{baht2(commitment)}</strong>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <SetupChecklist />
      <Reveal
        className="space-overview-grid studio-flow-layout"
        id="overview-cashflow"
      >
        <section className="studio-panel space-flow-card">
          <CashFlowExplorer />
        </section>
        <ForecastPanel />
      </Reveal>
      <Reveal className="studio-section-label">
        <span>SPENDING, IN PERSPECTIVE</span>
        <i />
        <span>{monthText(month)}</span>
      </Reveal>
      <Reveal className="space-overview-grid studio-spending-layout">
        <CategoryExplorer rows={rows} />
        <SpendingCalendar />
      </Reveal>
      <Reveal className="studio-section-label">
        <span>YOUR EVERYDAY ACTIVITY</span>
        <i />
        <span>Entries & reminders</span>
      </Reveal>
      <Reveal
        className="space-overview-grid studio-activity-layout"
        id="overview-activity"
      >
        <RecentActivity rows={rows} />
        <LiveCardSpending />
      </Reveal>
      <section className="card month-facts">
        <div>
          <span>Average / active day</span>
          <b>{baht2(days.length ? sum.expense / days.length : 0)}</b>
        </div>
        <div>
          <span>Days with activity</span>
          <b>{days.length}</b>
        </div>
        <div>
          <span>Tracked cards</span>
          <b>{model.cards.length}</b>
        </div>
        <div>
          <span>Highest spending day</span>
          <b>
            {days.length
              ? `${days.slice().sort((a, b) => b.expense - a.expense)[0].date} · ${baht2(Math.max(...days.map((day) => day.expense)))}`
              : "No spending yet"}
          </b>
        </div>
      </section>
      {model.data.cardPayments.length > 0 && <PaymentHistory />}
    </>
  );
}
function SetupChecklist() {
  const { model, store, open, notify } = useApp();
  if (
    model.transactions.length &&
    model.categories.length &&
    model.cards.length
  )
    return null;
  return (
    <section className="card getting-started">
      <div>
        <span className="eyebrow">YOUR PERSONAL LEDGER</span>
        <h3>
          {model.transactions.length
            ? "Make your ledger work for you"
            : "A fresh start, ready for today"}
        </h3>
        <p>
          Add categories, record income or spending, and connect a card whenever
          you need one.
        </p>
      </div>
      <div className="quick-actions">
        {!model.categories.length && (
          <button
            className="secondary"
            onClick={() => {
              try {
                store.starters();
                notify("Starter categories added.");
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            Use starter categories
          </button>
        )}
        <button
          className="primary"
          onClick={() => open({ kind: "transaction", type: "expense" })}
        >
          ＋ Add expense
        </button>
        <button
          className="secondary"
          onClick={() => open({ kind: "transaction", type: "income" })}
        >
          ＋ Add income
        </button>
        {!model.cards.length && (
          <button className="secondary" onClick={() => open({ kind: "card" })}>
            Add a card
          </button>
        )}
      </div>
    </section>
  );
}
function BudgetCard({ expense }: { expense: number }) {
  const { state, month, open, calm } = useApp(),
    budget = state.budgets[month] || 0,
    remaining = budget - expense,
    percent = budget ? (expense / budget) * 100 : 0;
  return (
    <section className="workbench-budget" aria-label="Monthly spending budget">
      <div className="overview-budget-head">
        <h2>Monthly budget</h2>
        <button
          type="button"
          className="overview-budget-action"
          onClick={() => open({ kind: "budget" })}
        >
          {budget ? "Edit budget" : "Set budget"} <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="overview-budget-body">
        <div>
          <p>
            {budget
              ? remaining < 0
                ? "Over budget"
                : "Available to spend"
              : "Recorded spending"}
          </p>
          <strong className={remaining < 0 && budget ? "negative" : undefined}>
            {baht2(budget ? remaining : expense)}
          </strong>
          <small>
            {budget
              ? `${baht2(expense)} of ${baht2(budget)} used`
              : "No budget set for this month"}
          </small>
        </div>
        <BudgetOrbit percent={percent} hasBudget={budget > 0} calm={calm} />
      </div>
    </section>
  );
}
function BudgetOrbit({
  percent,
  hasBudget,
  calm,
}: {
  percent: number;
  hasBudget: boolean;
  calm: boolean;
}) {
  const ratio = Math.min(1, Math.max(0, percent / 100));
  const progress = useSpring(calm ? ratio : 0, { stiffness: 210, damping: 29 });
  useEffect(() => {
    if (calm) progress.jump(ratio);
    else progress.set(ratio);
  }, [ratio, calm, progress]);
  const radius = 91,
    circumference = radius * 2 * Math.PI;
  const x = (value: number) => 110 + radius * Math.sin(value * 2 * Math.PI);
  const y = (value: number) => 110 - radius * Math.cos(value * 2 * Math.PI);
  const offset = useTransform(progress, (value) => (1 - value) * circumference);
  const pipX = useTransform(progress, x),
    pipY = useTransform(progress, y);
  return (
    <div
      className="budget-orbit"
      role={hasBudget ? "progressbar" : undefined}
      aria-label={hasBudget ? "Monthly budget used" : undefined}
      aria-valuemin={hasBudget ? 0 : undefined}
      aria-valuemax={hasBudget ? 100 : undefined}
      aria-valuenow={hasBudget ? Math.round(ratio * 100) : undefined}
      aria-valuetext={
        hasBudget ? `${Math.round(percent)}% of budget used` : undefined
      }
    >
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r="104" className="budget-orbit-outer" />
        <circle cx="110" cy="110" r="91" className="budget-orbit-track" />
        <circle cx="110" cy="110" r="77" className="budget-orbit-inner" />
        {hasBudget && (
          <>
            <motion.circle
              cx="110"
              cy="110"
              r="91"
              strokeDasharray={`${circumference} ${circumference}`}
              transform="rotate(-90 110 110)"
              className={`budget-orbit-fill ${percent > 100 ? "over" : ""}`}
              style={{
                strokeDashoffset: calm ? (1 - ratio) * circumference : offset,
              }}
            />
            <motion.circle
              cx={calm ? x(ratio) : pipX}
              cy={calm ? y(ratio) : pipY}
              r="8"
              className="budget-orbit-halo"
            />
            <motion.circle
              cx={calm ? x(ratio) : pipX}
              cy={calm ? y(ratio) : pipY}
              r="4"
              className="budget-orbit-pip"
            />
          </>
        )}
      </svg>
      <div className="budget-orbit-value" aria-hidden="true">
        <strong>{hasBudget ? `${Math.round(percent)}%` : "—"}</strong>
        {hasBudget && <span>used</span>}
      </div>
    </div>
  );
}
function RecentActivity({ rows }: { rows: Transaction[] }) {
  const { model, open, openMonth, month } = useApp(),
    recent = rows
      .filter((row) => row.income || row.expense)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  return (
    <section className="card space-recent">
      <SectionHeading
        title="Recent activity"
        description="The latest entries in your selected month."
        action={
          <button className="link-button" onClick={() => openMonth(month)}>
            All transactions <ArrowRight size={14} />
          </button>
        }
      />
      {recent.length ? (
        recent.map((row) => {
          const category =
              row.category ||
              Object.keys(row.categories).find(
                (name) => row.categories[name],
              ) ||
              "Uncategorized",
            income = row.income > 0 && !row.expense;
          return (
            <button
              key={row.id}
              className="recent-row"
              onClick={() => open({ kind: "day", date: row.date })}
            >
              <span
                className="space-transaction-icon"
                style={
                  {
                    "--category-color": income
                      ? "#1a9c77"
                      : safeColor(model.meta(category).color),
                  } as CSSVars
                }
              >
                {income ? <ArrowDownLeft /> : <ShoppingBag />}
              </span>
              <span className="space-recent-name">
                <strong>{row.note || category}</strong>
                <small>
                  {category} <i>·</i> {row.date}
                </small>
              </span>
              <span className="space-recent-type">
                {row.income && row.expense
                  ? "Daily total"
                  : income
                    ? "Income"
                    : "Expense"}
              </span>
              <b className={income ? "positive" : "negative"}>
                {income ? "+" : ""}
                {signedMoney(row.income - row.expense)}
              </b>
              <ArrowRight size={13} />
            </button>
          );
        })
      ) : (
        <div className="space-empty-note">
          Your next small step starts with an entry.
          <div className="quick-actions">
            <button
              className="secondary"
              onClick={() => open({ kind: "transaction", type: "income" })}
            >
              ＋ Income
            </button>
            <button
              className="primary"
              onClick={() => open({ kind: "transaction", type: "expense" })}
            >
              ＋ Expense
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
function LiveCardSpending() {
  const { model, month, cardActivity, navigate } = useApp(),
    rows = model.transactions.filter(
      (row) => row.date.startsWith(month) && row.card && row.expense > 0,
    ),
    sum = Finance.totals(rows),
    ranked = model.cards
      .map((card) => ({
        ...card,
        spent: Finance.totals(rows.filter((row) => row.card === card.id))
          .expense,
      }))
      .sort((a, b) => b.spent - a.spent),
    cardsUsed = ranked.filter((card) => card.spent > 0).length,
    max = ranked[0]?.spent || 1;
  return (
    <section className="card personal-card-insights">
      <SectionHeading
        title="Card spending"
        description={`${monthText(month)} · recorded purchases`}
        action={
          <button className="link-button" onClick={() => navigate("cards")}>
            View Cards →
          </button>
        }
      />
      <div className="personal-highlight">
        {baht2(sum.expense)}
        <small>
          across {cardsUsed} {cardsUsed === 1 ? "card" : "cards"}
        </small>
      </div>
      {ranked.length ? (
        ranked.slice(0, 4).map((card) => (
          <button
            className="live-card-row"
            key={card.id}
            onClick={() => cardActivity(card.id)}
          >
            <span>
              <i style={{ background: card.color }} />
              {card.name}
            </span>
            <span className="live-card-track">
              <i
                style={{
                  background: card.color,
                  width: `${(card.spent / max) * 100}%`,
                }}
              />
            </span>
            <b>{baht2(card.spent)}</b>
          </button>
        ))
      ) : (
        <p className="empty-copy">
          Add a card, then select it when recording an expense.
        </p>
      )}
      <p className="ledger-hint">
        These are logged purchases. Statement balances and repayments are not
        inferred from them.
      </p>
    </section>
  );
}
function ForecastPanel() {
  const { model, openCalendar, navigate, calm } = useApp();
  const today = Finance.localDate(),
    end = addDays(today, 29);
  const renewals = model.renewals.upcoming(today);
  const expected = Finance.money(
    renewals.reduce((sum, item) => sum + item.subscription.amount, 0),
  );
  const entries = [
    ...renewals.map(({ date, subscription }) => ({
      id: `${subscription.id}:${date}`,
      date,
      name: subscription.name,
      kind: "renewals" as const,
      amount: subscription.amount,
      siteIcon: subscription.siteIcon,
    })),
    ...model
      .upcoming(today)
      .filter((card) => card.date <= end)
      .map((card) => ({
        id: card.id,
        date: card.date,
        name: card.name,
        kind: "cards" as const,
        amount: null,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section
      className="workbench-forecast"
      aria-label="Upcoming renewals and card reminders"
    >
      <div className="forecast-top">
        <span className="forecast-icon">
          <Calendar size={20} />
        </span>
        <span className="studio-eyebrow">NEXT 30 DAYS</span>
        <button
          className="link-button forecast-today"
          onClick={() => openCalendar()}
          aria-label="Open calendar for today"
        >
          Today <ArrowUpRight size={14} />
        </button>
      </div>
      <h3>Coming up</h3>
      <p>Renewals and card payment dates.</p>
      <div className="forecast-total">
        <strong>{baht2(expected)}</strong>
        <span>expected subscription charges</span>
      </div>
      {entries.length ? (
        <div className="forecast-entries">
          {entries.slice(0, 5).map((entry, index) => (
            <motion.button
              key={entry.id}
              className="forecast-event"
              initial={calm ? false : { opacity: 0.6, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: calm ? 0 : 0.2,
                delay: calm ? 0 : index * 0.025,
              }}
              onClick={() => openCalendar(entry.date, entry.kind)}
            >
              <span className={`forecast-dot ${entry.kind}`}>
                {entry.kind === "renewals" ? (
                  <RecordIcon
                    site={entry.siteIcon}
                    size={17}
                    fallback={<Repeat2 size={15} />}
                  />
                ) : (
                  <CreditCard size={15} />
                )}
              </span>
              <span>
                <b>{entry.name}</b>
                <small>
                  {dateText(entry.date)} ·{" "}
                  {entry.kind === "cards"
                    ? "Card reminder"
                    : "Expected renewal"}
                </small>
              </span>
              {entry.amount !== null ? (
                <strong>{baht2(entry.amount)}</strong>
              ) : (
                <ArrowRight size={15} />
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="forecast-empty">
          <p>No dates coming up. Add a subscription to see renewals here.</p>
          <button
            className="link-button"
            onClick={() => navigate("subscriptions")}
          >
            Track subscriptions <ArrowRight size={15} />
          </button>
        </div>
      )}
      <button
        className="secondary forecast-calendar"
        onClick={() => openCalendar(entries[0]?.date || today)}
      >
        Open calendar <ArrowRight size={16} />
      </button>
    </section>
  );
}
