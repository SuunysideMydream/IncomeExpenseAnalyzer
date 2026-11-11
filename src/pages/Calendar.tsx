import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  Plus,
} from "lucide-react";
import { useApp } from "../context";
import {
  CalendarEvent,
  eventMeta,
  siteForEvent,
} from "../components/CalendarEvent";
import { RecordIcon } from "../components/RecordIcon";
import { MonthPicker } from "../components/common";
import { Segmented } from "../components/ui/segmented";
import { baht2, Finance, monthText, nextMonth } from "../lib/finance";
import { addDays, calendarDays, dateText, monthDay } from "../lib/recurring";
import { calendarItems, monthRange, type CalendarItem } from "../lib/calendar";
import type { CalendarDetailSection, CalendarFilter } from "../types";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const filters: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "activity", label: "Transactions" },
  { value: "renewals", label: "Renewals" },
  { value: "cards", label: "Cards" },
];

export default function Calendar() {
  const { calendar, setCalendar, model, open, calm } = useApp();
  const [mode, setMode] = useState<"month" | "agenda">("month");
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const { date, filter } = calendar;
  const month = date.slice(0, 7),
    today = Finance.localDate();
  const { rows, events, days, renewals } = useMemo(() => {
    const [start, end] = monthRange(month);
    const rows = model.transactions.filter((row) => row.date.startsWith(month));
    const renewals = model.renewals.between(start, end);
    const events = calendarItems(month, filter, rows, model.cards, renewals);
    const days = new Map<string, CalendarItem[]>();
    for (const item of events) {
      const group = days.get(item.date) || [];
      group.push(item);
      days.set(item.date, group);
    }
    return { rows, renewals, events, days };
  }, [month, filter, model]);
  const dates = calendarDays(month);
  const weeks = Array.from({ length: dates.length / 7 }, (_, index) =>
    dates.slice(index * 7, index * 7 + 7),
  );
  const monthChoices = [
    ...Array.from({ length: 12 }, (_, index) =>
      nextMonth(today.slice(0, 7), index + 1),
    ),
    ...model.subscriptions.map((sub) => sub.startDate.slice(0, 7)),
  ];
  const purchases = rows.filter((row) => row.card && row.expense > 0);
  const totals = Finance.totals(filter === "cards" ? purchases : rows);
  const expected = renewals.filter(
    (item) => item.status === "scheduled" && item.date >= today,
  );
  const renewalAmount = Finance.money(
    expected.reduce((sum, item) => sum + item.subscription.amount, 0),
  );
  const selectDay = (day: string, focus = false) => {
    if (!Finance.validDate(day)) return;
    setCalendar({ date: day, filter });
    if (focus)
      requestAnimationFrame(() =>
        buttons.current.get(day)?.focus({ preventScroll: true }),
      );
  };
  const selectMonth = (value: string, focus = false) =>
    selectDay(monthDay(value, Number(date.slice(8))), focus);
  const inspectDay = (
    day: string,
    section: CalendarDetailSection = filter === "all" ? "activity" : filter,
  ) => {
    selectDay(day);
    open({ kind: "calendarDay", date: day, section });
  };
  function onDayKey(event: KeyboardEvent, day: string) {
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (
      Object.hasOwn(delta, event.key) ||
      ["Home", "End", "PageUp", "PageDown"].includes(event.key)
    ) {
      event.preventDefault();
      if (event.key === "PageUp" || event.key === "PageDown") {
        const period = nextMonth(
          day.slice(0, 7),
          (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1),
        );
        selectDay(monthDay(period, Number(day.slice(8))), true);
      } else
        selectDay(
          addDays(
            day,
            event.key === "Home"
              ? -weekday
              : event.key === "End"
                ? 6 - weekday
                : delta[event.key],
          ),
          true,
        );
    }
  }
  return (
    <div className="finance-calendar">
      <div className="planner-toolbar">
        <div className="planner-month-nav">
          <button
            className="secondary planner-square"
            aria-label="Previous calendar month"
            onClick={() => selectMonth(nextMonth(month, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <MonthPicker
            label="Calendar month"
            value={month}
            onChange={selectMonth}
            extra={monthChoices}
          />
          <button
            className="secondary planner-square"
            aria-label="Next calendar month"
            onClick={() => selectMonth(nextMonth(month))}
          >
            <ChevronRight size={18} />
          </button>
          <button className="secondary" onClick={() => selectDay(today)}>
            Today
          </button>
        </div>
        <div className="planner-toolbar-actions">
          <Segmented
            label="Calendar view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "month", label: "Month" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          <button
            className="primary"
            onClick={() => open({ kind: "transaction", date })}
          >
            <Plus size={17} /> Add transaction
          </button>
        </div>
      </div>
      <section className="planner-stats" aria-label="Calendar month totals">
        {filter === "cards" ? (
          <>
            <div>
              <span>Recorded card purchases</span>
              <strong>{baht2(totals.expense)}</strong>
            </div>
            <div>
              <span>Purchase records</span>
              <strong>{purchases.length}</strong>
            </div>
            <div>
              <span>Cards used</span>
              <strong>{new Set(purchases.map((row) => row.card)).size}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Recorded income</span>
              <strong className="positive">{baht2(totals.income)}</strong>
            </div>
            <div>
              <span>Recorded spending</span>
              <strong>{baht2(totals.expense)}</strong>
            </div>
            <div>
              <span>Upcoming renewals this month</span>
              <strong>{baht2(renewalAmount)}</strong>
              <small>
                {expected.length} expected · separate from recorded spending
              </small>
            </div>
          </>
        )}
      </section>
      <div className="planner-filter-row">
        <Segmented
          label="Calendar event filter"
          value={filter}
          options={filters}
          onChange={(next) => setCalendar({ date, filter: next })}
        />
        <span className="planner-event-count">
          {events.length} {events.length === 1 ? "event" : "events"} in{" "}
          {monthText(month)}
        </span>
      </div>
      <div className="planner-selection-bar">
        <div>
          <span className="studio-eyebrow">SELECTED DAY</span>
          <strong className="planner-selection-label">
            {dateText(date, "long")}
          </strong>
        </div>
        <button
          className="secondary"
          aria-haspopup="dialog"
          onClick={() => inspectDay(date)}
        >
          <PanelRightOpen size={17} /> Day details
        </button>
      </div>
      <section
        className="planner-main"
        aria-label={
          mode === "month"
            ? `Calendar for ${monthText(month)}`
            : `Agenda for ${monthText(month)}`
        }
      >
        {mode === "month" ? (
          <LayoutGroup id="planner-day">
            <div
              className="planner-grid"
              role="grid"
              aria-label={monthText(month)}
              aria-describedby="planner-keyboard-help"
            >
              <div className="planner-week" role="row">
                {weekdays.map((day) => (
                  <span
                    key={day}
                    role="columnheader"
                    className="planner-weekday"
                  >
                    {day}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div key={week[0]} className="planner-week" role="row">
                  {week.map((day) => {
                    const current = day.startsWith(month),
                      items = days.get(day) || [],
                      selected = day === date;
                    return (
                      <div
                        role="gridcell"
                        aria-selected={selected}
                        className="planner-cell"
                        key={day}
                      >
                        <button
                          ref={(node) => {
                            if (node) buttons.current.set(day, node);
                            else buttons.current.delete(day);
                          }}
                          type="button"
                          className={`planner-day ${current ? "" : "planner-outside"} ${selected ? "planner-selected" : ""}`}
                          data-date={day}
                          tabIndex={selected ? 0 : -1}
                          aria-current={day === today ? "date" : undefined}
                          aria-label={`${dateText(day, "long")}, ${items.length} ${items.length === 1 ? "event" : "events"}`}
                          aria-haspopup="dialog"
                          onClick={() => inspectDay(day)}
                          onKeyDown={(event) => onDayKey(event, day)}
                        >
                          {selected && (
                            <motion.span
                              className="planner-selection"
                              layoutId={calm ? undefined : "calendar-selection"}
                              transition={
                                calm
                                  ? { duration: 0 }
                                  : {
                                      type: "spring",
                                      bounce: 0,
                                      duration: 0.28,
                                    }
                              }
                            />
                          )}
                          <span
                            className={`planner-day-number ${day === today ? "planner-today" : ""}`}
                          >
                            {Number(day.slice(8))}
                          </span>
                          <span
                            className="planner-cell-events"
                            aria-hidden="true"
                          >
                            {items.slice(0, 2).map((item) => (
                              <span
                                key={item.id}
                                className={`planner-chip event-${item.kind}`}
                              >
                                <RecordIcon
                                  site={siteForEvent(item, model.subscriptions)}
                                  size={12}
                                  fallback={<i />}
                                />
                                <span>
                                  {item.kind === "income"
                                    ? `+${baht2(item.amount)}`
                                    : item.title}
                                </span>
                              </span>
                            ))}
                            {items.length > 2 && (
                              <small>+{items.length - 2}</small>
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p id="planner-keyboard-help" className="sr-only">
              Arrow keys move by day or week. Home and End move within a week.
              Page Up and Page Down change month. Press Enter to open day
              details.
            </p>
            <div className="planner-legend" aria-label="Calendar legend">
              {Object.entries(eventMeta).map(([kind, value]) => (
                <span className={`event-${kind}`} key={kind}>
                  <i />
                  {value.label}
                </span>
              ))}
            </div>
          </LayoutGroup>
        ) : (
          <div className="planner-agenda">
            {days.size ? (
              [...days].map(([day, items]) => (
                <section className="planner-agenda-day" key={day}>
                  <button
                    className={`planner-agenda-date ${date === day ? "active" : ""}`}
                    aria-haspopup="dialog"
                    onClick={() => inspectDay(day)}
                  >
                    {dateText(day, "long")} <span>{items.length}</span>
                  </button>
                  {items.map((item) => (
                    <CalendarEvent
                      key={item.id}
                      item={item}
                      today={today}
                      onOpen={() =>
                        inspectDay(
                          day,
                          item.kind === "renewal"
                            ? "renewals"
                            : item.kind === "card-due" || filter === "cards"
                              ? "cards"
                              : "activity",
                        )
                      }
                    />
                  ))}
                </section>
              ))
            ) : (
              <div className="planner-empty">
                <CalendarDays size={32} />
                <h3>No events in this view</h3>
                <p>
                  Try another month or event filter, or add a transaction for
                  the selected day.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
