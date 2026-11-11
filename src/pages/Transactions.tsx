import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { EMPTY_FILTERS, useApp } from "../context";
import { baht2, Finance, monthText, signedMoney } from "../lib/finance";
import { downloadFile } from "../lib/files";
import type { DailyTotal, Filters } from "../types";
import { MonthPicker } from "../components/common";
import { Select } from "../components/ui/select";
import { Segmented } from "../components/ui/segmented";
import { SearchField } from "../components/ui/search-field";
import { ContextMenu } from "../components/ui/menus";
import { PaginationPills } from "../components/shadcnspace/PaginationPills";
export default function Transactions() {
  const {
    model,
    month,
    setMonth,
    filters,
    setFilters,
    txMode,
    setTxMode,
    sort,
    setSort,
    page,
    setPage,
    open,
    openMonth,
    calm,
  } = useApp();
  const [query, setQuery] = useState(filters.query);
  useEffect(() => setQuery(filters.query), [filters.query]);
  const rows = Finance.filter(
      model.transactions,
      { ...filters, month },
      model.cards,
    ),
    sum = Finance.totals(rows),
    days = Finance.daily(rows);
  if (sort === "oldest") days.reverse();
  if (sort === "highest")
    days.sort((a, b) => b.expense - a.expense || b.date.localeCompare(a.date));
  const per = 10,
    safePage = Math.min(page, Math.max(0, Math.ceil(days.length / per) - 1));
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage, setPage]);
  const months = Finance.monthly(model.transactions, [
    ...model.data.months.map((row) => row.month),
    month,
  ])
    .filter((row) => row.month <= month)
    .slice(-12)
    .reverse();
  const changeFilter = (field: keyof Filters, value: string) => {
    setFilters({ ...filters, query, [field]: value });
    setPage(0);
  };
  const exportCSV = () => {
    const keys = new Set(months.map((row) => row.month));
    const exported =
      txMode === "day"
        ? rows
        : model.transactions.filter((row) => keys.has(row.date.slice(0, 7)));
    downloadFile(
      Finance.csv(exported, model.cards),
      `moneywise-${month}.csv`,
      "text/csv;charset=utf-8",
    );
  };
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Transactions</h2>
          <p className="period">Your daily ledger, with every entry editable</p>
        </div>
        <button
          className="primary"
          onClick={() => open({ kind: "transaction" })}
        >
          <Plus size={16} /> Add transaction
        </button>
      </div>
      <div className="card ledger-workspace">
        <div className="ledger-controls">
          <Segmented
            label="Transaction view"
            value={txMode}
            onChange={setTxMode}
            options={[
              { value: "day", label: "Daily summary" },
              { value: "month", label: "Month totals" },
            ]}
          />
          <label>
            Month{" "}
            <MonthPicker
              value={month}
              onChange={setMonth}
              label="Transaction month"
            />
          </label>
          <button className="secondary" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
        {txMode === "day" ? (
          <>
            <form
              id="ledger-filters"
              className="ledger-filters"
              onSubmit={(event) => {
                event.preventDefault();
                setFilters({ ...filters, query });
                setPage(0);
              }}
            >
              <div className="ledger-search">
                <label htmlFor="ledger-search">Search entries</label>
                <SearchField
                  id="ledger-search"
                  label="Search entries"
                  placeholder="Note, category, card or date"
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <label>
                Type
                <Select
                  label="Filter type"
                  value={filters.type}
                  onChange={(value) => changeFilter("type", value)}
                  options={[
                    { value: "", label: "All types" },
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                />
              </label>
              <label>
                Category
                <Select
                  label="Filter category"
                  value={filters.category}
                  onChange={(value) => changeFilter("category", value)}
                  options={[
                    { value: "", label: "All categories" },
                    ...model.categories.map((name) => ({
                      value: name,
                      label: name,
                    })),
                  ]}
                />
              </label>
              <label>
                Payment
                <Select
                  label="Filter payment"
                  value={filters.card}
                  onChange={(value) => changeFilter("card", value)}
                  options={[
                    { value: "", label: "All payment methods" },
                    { value: "cash", label: "Cash / bank / unspecified" },
                    ...model.cards.map((card) => ({
                      value: card.id,
                      label: card.name,
                    })),
                  ]}
                />
              </label>
              <label>
                Sort days
                <Select
                  label="Sort days"
                  value={sort}
                  onChange={(value) => {
                    setSort(value);
                    setPage(0);
                  }}
                  options={[
                    { value: "newest", label: "Newest first" },
                    { value: "oldest", label: "Oldest first" },
                    { value: "highest", label: "Highest spending" },
                  ]}
                />
              </label>
              <button className="primary" type="submit">
                Search
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setQuery("");
                  setSort("newest");
                  setPage(0);
                }}
              >
                Clear filters
              </button>
            </form>
            <div className="ledger-totals" aria-live="polite">
              <span>
                {rows.length} matching records · {days.length} days
              </span>
              <span>
                Income <b className="positive">{baht2(sum.income)}</b>
              </span>
              <span>
                Spending <b className="negative">{baht2(sum.expense)}</b>
              </span>
              <span>
                Net <b>{signedMoney(sum.net)}</b>
              </span>
            </div>
            <p className="ledger-hint">
              Filters match whole records. Workbook entries can contain several
              categories and both income and spending; their totals stay intact.
            </p>
            {days.length ? (
              <>
                <div className="space-ledger-head">
                  <span>Day & categories</span>
                  <span>Income</span>
                  <span>Spending</span>
                  <span>Net</span>
                  <span />
                </div>
                <div className="daily-ledger">
                  {days
                    .slice(safePage * per, (safePage + 1) * per)
                    .map((day) => (
                      <DayRow key={day.date} day={day} calm={calm} />
                    ))}
                </div>
                <PaginationPills total={days.length} />
              </>
            ) : (
              <div className="space-empty-state">
                <h3>A little quiet here.</h3>
                <p>
                  No matching activity. Try another month or clear your filters.
                </p>
                <button
                  className="secondary"
                  onClick={() => open({ kind: "transaction", type: "expense" })}
                >
                  Record an expense <Plus size={15} />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="ledger-hint">
              All records in the latest 12 available months up to{" "}
              {monthText(month)}. Daily filters do not apply here.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="amount">Income</th>
                    <th className="amount">Spending</th>
                    <th className="amount">Net</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {months.map((row) => (
                    <tr key={row.month}>
                      <td>{monthText(row.month)}</td>
                      <td className="amount positive">{baht2(row.income)}</td>
                      <td className="amount negative">{baht2(row.expense)}</td>
                      <td className={`amount ${row.net < 0 ? "negative" : ""}`}>
                        {signedMoney(row.net)}
                      </td>
                      <td>
                        <button
                          className="edit-row"
                          onClick={() => openMonth(row.month)}
                        >
                          Open days
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
function DayRow({ day, calm }: { day: DailyTotal; calm: boolean }) {
  const { model, open } = useApp(),
    date = new Date(`${day.date}T12:00:00`),
    details = () => open({ kind: "day", date: day.date, filtered: true });
  const categories = Object.entries(day.cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <ContextMenu
      items={[
        {
          label: "View day details",
          icon: <Pencil size={15} />,
          action: details,
        },
        {
          label: "Add an expense",
          icon: <Plus size={15} />,
          action: () =>
            open({ kind: "transaction", type: "expense", date: day.date }),
        },
      ]}
    >
      <motion.article
        className="day-ledger"
        layout={!calm}
        initial={calm ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
      >
        <div className="space-day-main">
          <div className="space-day-date">
            <strong>{date.getDate()}</strong>
            <span>{date.toLocaleDateString("en-US", { month: "short" })}</span>
          </div>
          <div>
            <div className="day-date">
              <strong>
                {date.toLocaleDateString("en-US", { weekday: "long" })}
              </strong>
              <span>
                {day.count} {day.count === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div className="space-ledger-categories">
              {categories.map(([name]) => (
                <span key={name}>
                  <i style={{ background: model.meta(name).color }} />
                  {name}
                </span>
              ))}
              {!categories.length && <span>Uncategorized</span>}
            </div>
          </div>
        </div>
        <div className="ledger-income">
          {day.income ? `+${baht2(day.income)}` : "—"}
        </div>
        <div className="ledger-expense">
          {day.expense ? `−${baht2(day.expense)}` : "—"}
        </div>
        <div className={`ledger-net ${day.net < 0 ? "negative" : ""}`}>
          {signedMoney(day.net)}
        </div>
        <button className="edit-row" onClick={details}>
          Details <ArrowRight size={13} />
        </button>
      </motion.article>
    </ContextMenu>
  );
}
