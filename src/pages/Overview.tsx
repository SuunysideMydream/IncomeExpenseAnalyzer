import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar,
  Plus,
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
import landscape from "../../Assets/moneywise-landscape.svg";
import { MonthPicker, SectionHeading } from "../components/common";
import { PaymentHistory } from "../components/PaymentHistory";
import { CashFlowExplorer } from "../components/CashFlowExplorer";
import {
  CategoryExplorer,
  SpendingCalendar,
} from "../components/SpendingInsights";
import { Reveal } from "../components/Reveal";
export default function Overview() {
  const { model, month, setMonth, open, navigate, setFilters, calm } = useApp(),
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
  const commitment = active.reduce((total, plan) => total + plan.monthly, 0),
    stats = [
      {
        label: "Total income",
        value: baht2(sum.income),
        tone: "mint",
        Icon: ArrowDownLeft,
        sub: "Money recorded this month",
        action: () => {
          navigate("transactions");
          setFilters({ ...EMPTY_FILTERS, type: "income" });
        },
      },
      {
        label: "Total spending",
        value: baht2(sum.expense),
        tone: "coral",
        Icon: ArrowUpRight,
        sub: previousRows.length
          ? `${signedMoney(sum.expense - Finance.totals(previousRows).expense)} vs ${monthText(previous)}`
          : "Across your recorded expenses",
        action: () => {
          navigate("transactions");
          setFilters({ ...EMPTY_FILTERS, type: "expense" });
        },
      },
      {
        label: "Net balance",
        value: signedMoney(sum.net),
        tone: "violet",
        Icon: Wallet,
        sub: "Income minus recorded spending",
        action: () => {
          navigate("transactions");
          setFilters(EMPTY_FILTERS);
        },
      },
      {
        label: "Installments / month",
        value: baht2(commitment),
        tone: "amber",
        Icon: Timer,
        sub: `${active.length} active plans · tracked separately`,
        action: () => navigate("installments"),
      },
    ];
  return (
    <>
      <div className="toolbar space-overview-toolbar">
        <div>
          <h2>Monthly overview</h2>
          <p className="period">
            {last
              ? `Your latest entry · ${last}`
              : "Ready when you are. Start with your first entry."}
          </p>
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
      </div>
      <SetupChecklist />
      <div className="kpis">
        {stats.map(({ label, value, tone, Icon, sub, action }, index) => (
          <motion.button
            type="button"
            className="card kpi studio-stat"
            key={label}
            onClick={action}
            aria-label={`${label}: ${value}. View details`}
            initial={calm ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: calm ? 0 : 0.3,
              delay: calm ? 0 : index * 0.035,
            }}
          >
            <div className="kpi-label">
              <span>{label}</span>
              <span className={`space-tile ${tone}`}>
                <Icon />
              </span>
            </div>
            <div
              className={`kpi-value ${tone === "mint" ? "positive" : tone === "coral" ? "negative" : ""}`}
            >
              {value}
            </div>
            <div className="kpi-sub">{sub}</div>
            <ArrowUpRight className="studio-stat-arrow" size={17} />
          </motion.button>
        ))}
      </div>
      <Reveal
        className="space-overview-grid studio-flow-layout"
        id="overview-cashflow"
      >
        <section className="studio-panel space-flow-card">
          <CashFlowExplorer />
        </section>
        <BudgetCard expense={sum.expense} />
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
        <DueDateCards />
      </Reveal>
      <Reveal id="overview-cards">
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
    <motion.section
      className="space-place-card"
      aria-label="Monthly spending budget"
      whileHover={calm ? undefined : { y: -2 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
    >
      <img className="space-place-image" src={landscape} alt="" />
      <div className="space-place-shade" />
      <div className="space-place-top">
        <span className="space-glass-badge">
          <Wallet /> Monthly budget
        </span>
        <span>{monthText(month)}</span>
      </div>
      <div className="space-place-bottom">
        <span className="space-place-eyebrow">
          {budget
            ? remaining < 0
              ? "A moment to rebalance"
              : "A little room to breathe"
            : "Make room for what matters"}
        </span>
        <div className="space-place-amount">
          {budget ? signedMoney(remaining) : baht2(expense)}
        </div>
        <p>
          {budget
            ? remaining < 0
              ? "over your monthly budget"
              : "left in your monthly budget"
            : "recorded spending · set a budget to guide the month"}
        </p>
        <div
          className="budget-track"
          role="progressbar"
          aria-label="Monthly budget used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(percent))}
        >
          <motion.i
            animate={{ width: `${Math.min(100, percent)}%` }}
            transition={
              calm
                ? { duration: 0 }
                : { type: "spring", bounce: 0, duration: 0.4 }
            }
          />
        </div>
        <div className="space-place-meta">
          <span>
            {budget ? `${Math.round(percent)}% used` : "Your pace, your plan"}
          </span>
          <span>
            {budget
              ? `${baht2(expense)} of ${baht2(budget)}`
              : "Start with a comfortable limit"}
          </span>
        </div>
        <button
          className="space-white-button"
          onClick={() => open({ kind: "budget" })}
        >
          {budget ? "Edit budget" : "Set budget"} <ArrowRight size={14} />
        </button>
      </div>
    </motion.section>
  );
}
function RecentActivity({ rows }: { rows: Transaction[] }) {
  const { model, open, navigate } = useApp(),
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
          <button
            className="link-button"
            onClick={() => navigate("transactions")}
          >
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
          across {ranked.filter((card) => card.spent > 0).length} cards
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
function DueDateCards() {
  const { model, navigate, calm } = useApp(),
    dues = model.upcoming().slice(0, 3);
  return (
    <section className="card space-events">
      <SectionHeading
        title="Upcoming reminders"
        description="Upcoming reminders, from today."
        action={
          <span className="space-soft-badge">
            <Calendar size={13} /> Planned
          </span>
        }
      />
      {dues.length ? (
        dues.map((card, index) => {
          const date = new Date(`${card.date}T12:00:00`);
          return (
            <motion.article
              className="space-event-row"
              key={card.id}
              initial={calm ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.35,
                delay: calm ? 0 : index * 0.04,
              }}
            >
              <div className="space-event-date">
                <span>
                  {date.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <b>{date.getDate()}</b>
              </div>
              <div>
                <span className="space-event-kind">
                  {card.kind === "cash" ? "Cash card" : "Credit card"}
                </span>
                <h4>{card.name}</h4>
                <p>Payment due reminder</p>
              </div>
              <button
                className="space-text-icon"
                aria-label={`View ${card.name}`}
                onClick={() => {
                  navigate("cards");
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`wallet-${card.id}`)
                      ?.scrollIntoView({ block: "center" }),
                  );
                }}
              >
                <ArrowRight />
              </button>
            </motion.article>
          );
        })
      ) : (
        <div className="space-empty-note">
          No due dates on the horizon. Add a payment day to a card to see it
          here.
        </div>
      )}
      <p className="space-small-note">
        <Bell /> A reminder, not a confirmed statement balance.
      </p>
    </section>
  );
}
