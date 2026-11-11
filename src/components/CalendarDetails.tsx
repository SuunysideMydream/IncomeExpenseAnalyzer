import { useMemo } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Repeat2,
  Timer,
} from "lucide-react";
import { useApp } from "../context";
import { calendarItems } from "../lib/calendar";
import { baht2, dueDateForMonth, Finance, signedMoney } from "../lib/finance";
import { addDays, dateText, plansInMonth } from "../lib/recurring";
import type { CalendarDetailSection, DialogState } from "../types";
import { CalendarEvent } from "./CalendarEvent";
import { PlanIcon } from "./RecordIcon";
import { Segmented } from "./ui/segmented";

type DayDialog = Extract<DialogState, { kind: "calendarDay" }>;

export function CalendarDetails({ details }: { details: DayDialog }) {
  const { model, open, calendar, setCalendar, cardActivity } = useApp();
  const { date, section } = details;
  const month = date.slice(0, 7);
  const today = Finance.localDate();
  const { activity, cards, renewals, plans, totals } = useMemo(() => {
    const monthRows = model.transactions.filter((row) =>
      row.date.startsWith(month),
    );
    const dayRows = monthRows.filter((row) => row.date === date);
    const cards = model.cards.flatMap((card) => {
      const due = dueDateForMonth(card, month);
      const dueToday = due === date && card.status !== "Completed";
      const purchases = dayRows.filter(
        (row) => row.card === card.id && row.expense > 0,
      );
      if (!dueToday && !purchases.length) return [];
      return [
        {
          card,
          dueToday,
          purchases,
          dayTotal: Finance.totals(purchases).expense,
          monthTotal: Finance.totals(
            monthRows.filter((row) => row.card === card.id),
          ).expense,
        },
      ];
    });
    return {
      activity: calendarItems(month, "activity", dayRows, model.cards, []),
      cards,
      renewals: calendarItems(
        month,
        "renewals",
        [],
        [],
        model.renewals.between(date, date),
      ),
      plans: plansInMonth(model.plans, month),
      totals: Finance.totals(dayRows),
    };
  }, [date, model, month]);
  const sections: { value: CalendarDetailSection; label: string }[] = [
    { value: "activity", label: "Activity" },
    { value: "cards", label: `Cards · ${cards.length}` },
    { value: "renewals", label: `Renewals · ${renewals.length}` },
  ];
  const move = (next: string) => {
    if (!Finance.validDate(next)) return;
    setCalendar({ ...calendar, date: next });
    open({ ...details, date: next });
  };

  return (
    <>
      <div className="calendar-drawer-scroll">
        <div className="drawer-day-navigation">
          <span>{date === today ? "Today" : "Browse dates"}</span>
          <div>
            <button
              className="secondary planner-square"
              aria-label="Previous day"
              onClick={() => move(addDays(date, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="secondary planner-square"
              aria-label="Next day"
              onClick={() => move(addDays(date, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <dl className="drawer-totals" aria-label="Recorded day totals">
          <div>
            <dt>Gross expenses</dt>
            <dd>{baht2(totals.expense)}</dd>
          </div>
          <div>
            <dt>Income</dt>
            <dd className="positive">{baht2(totals.income)}</dd>
          </div>
          <div>
            <dt>Net cash flow</dt>
            <dd className={totals.net < 0 ? "negative" : ""}>
              {signedMoney(totals.net)}
            </dd>
          </div>
        </dl>
        <Segmented
          label="Day detail sections"
          value={section}
          onChange={(next) => open({ ...details, section: next })}
          options={sections}
        />
        {section === "activity" && (
          <section className="drawer-section" aria-label="Recorded activity">
            <div className="drawer-section-head">
              <h3>Recorded activity</h3>
              {!!activity.length && (
                <button
                  className="link-button"
                  onClick={() => open({ kind: "day", date })}
                >
                  Full details <ArrowRight size={14} />
                </button>
              )}
            </div>
            {activity.length ? (
              activity.map(
                (item) =>
                  (item.kind === "income" || item.kind === "expense") && (
                    <CalendarEvent
                      key={item.id}
                      item={item}
                      today={today}
                      onOpen={() =>
                        open({ kind: "transaction", row: item.transaction })
                      }
                    />
                  ),
              )
            ) : (
              <p className="drawer-empty">
                No transactions recorded on this day.
              </p>
            )}
            {plans.length > 0 && (
              <div className="planner-plans">
                <h3>
                  <Timer size={17} /> Installments this month
                </h3>
                <p>Monthly plans without a specific due day.</p>
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => open({ kind: "planDetail", plan })}
                  >
                    <span className="record-reference-name">
                      <PlanIcon plan={plan} size={16} />
                      <span>{plan.name}</span>
                    </span>
                    <b>{baht2(plan.monthly)}</b>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        {section === "cards" && (
          <section className="drawer-section" aria-label="Card activity">
            <div className="drawer-section-head">
              <h3>Card activity</h3>
            </div>
            {cards.length ? (
              cards.map(
                ({ card, dueToday, purchases, dayTotal, monthTotal }) => (
                  <article className="drawer-card" key={card.id}>
                    <header>
                      <span
                        className="drawer-card-icon"
                        style={{ backgroundColor: card.color }}
                      >
                        <CreditCard size={19} />
                      </span>
                      <div>
                        <h4>{card.name}</h4>
                        <p>
                          {card.kind === "cash" ? "Cash card" : "Credit card"}
                          {card.last4 ? ` · •••• ${card.last4}` : ""}
                        </p>
                      </div>
                    </header>
                    {dueToday && (
                      <p className="drawer-due-chip">
                        Payment reminder · {dateText(date)}
                      </p>
                    )}
                    <dl className="drawer-card-totals">
                      <div>
                        <dt>Recorded this day</dt>
                        <dd>{baht2(dayTotal)}</dd>
                      </div>
                      <div>
                        <dt>Recorded this month</dt>
                        <dd>{baht2(monthTotal)}</dd>
                      </div>
                    </dl>
                    <p className="drawer-card-count">
                      {purchases.length}{" "}
                      {purchases.length === 1 ? "purchase" : "purchases"} on
                      this date
                    </p>
                    <div className="drawer-card-actions">
                      <button
                        className="secondary"
                        onClick={() => open({ kind: "card", card })}
                      >
                        Edit card
                      </button>
                      <button
                        className="link-button"
                        onClick={() => cardActivity(card.id, month)}
                      >
                        View card activity <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ),
              )
            ) : (
              <p className="drawer-empty">
                No card purchases or payment reminders on this day.
              </p>
            )}
          </section>
        )}
        {section === "renewals" && (
          <section
            className="drawer-section"
            aria-label="Subscription renewals"
          >
            <div className="drawer-section-head">
              <h3>Subscription renewals</h3>
            </div>
            {renewals.length ? (
              <>
                {renewals.map(
                  (item) =>
                    item.kind === "renewal" && (
                      <CalendarEvent
                        key={item.id}
                        item={item}
                        today={today}
                        onOpen={() =>
                          open({
                            kind: "renewal",
                            subscriptionId: item.renewal.subscription.id,
                            date,
                          })
                        }
                      />
                    ),
                )}
                <p className="drawer-empty">
                  Expected charges are shown separately from recorded expenses.
                </p>
              </>
            ) : (
              <p className="drawer-empty">
                No subscriptions renew on this day.
              </p>
            )}
          </section>
        )}
      </div>
      <div className="calendar-drawer-actions">
        <button
          className="primary"
          aria-label={`Add expense on ${date}`}
          onClick={() => open({ kind: "transaction", type: "expense", date })}
        >
          <Plus size={16} /> Add expense
        </button>
        <button
          className="secondary"
          onClick={() => open({ kind: "subscription", date })}
        >
          <Repeat2 size={16} /> New subscription
        </button>
      </div>
    </>
  );
}
