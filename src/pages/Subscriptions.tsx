import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, Pencil, Plus, Repeat2 } from "lucide-react";
import { useApp } from "../context";
import { Segmented } from "../components/ui/segmented";
import { SearchField } from "../components/ui/search-field";
import { RecordIcon } from "../components/RecordIcon";
import { baht2, Finance, safeColor } from "../lib/finance";
import {
  addDays,
  CADENCES,
  dateText,
  monthlyEquivalent,
} from "../lib/recurring";
import type { CSSVars, SubscriptionStatus } from "../types";

const palette = ["#7355c4", "#167763", "#b56b28", "#306baf", "#b05a83"];
const statusNames = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export default function Subscriptions() {
  const { model, open, openCalendar, calm } = useApp();
  const [filter, setFilter] = useState<"all" | SubscriptionStatus>("all");
  const [query, setQuery] = useState("");
  const today = Finance.localDate();
  const { upcoming, active, average, rows } = useMemo(() => {
    const active = model.subscriptions.filter(
      (subscription) => subscription.status === "active",
    );
    const rows = model.subscriptions
      .map((subscription) => ({
        subscription,
        next: model.renewals.next(subscription.id, today),
      }))
      .sort(
        (a, b) =>
          (a.next?.date || "9999").localeCompare(b.next?.date || "9999") ||
          a.subscription.name.localeCompare(b.subscription.name),
      );
    return {
      active,
      average: Finance.money(
        active.reduce(
          (sum, subscription) => sum + monthlyEquivalent(subscription),
          0,
        ),
      ),
      upcoming: model.renewals.upcoming(today),
      rows,
    };
  }, [model, today]);
  const visible = rows.filter(
    ({ subscription }) =>
      (filter === "all" || filter === subscription.status) &&
      [subscription.name, subscription.category, subscription.note]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const upcomingTotal = Finance.money(
    upcoming.reduce((total, item) => total + item.subscription.amount, 0),
  );
  const horizon = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(today, index);
    return {
      date,
      amount: upcoming
        .filter((item) => item.date === date)
        .reduce((sum, item) => sum + item.subscription.amount, 0),
    };
  });
  const peak = Math.max(1, ...horizon.map((day) => day.amount));
  return (
    <>
      <div className="toolbar subscriptions-toolbar">
        <div>
          <h2>Recurring payments</h2>
          <p className="period">
            Review the schedule before you record a charge.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => open({ kind: "subscription" })}
        >
          <Plus size={17} /> Add subscription
        </button>
      </div>
      <section
        className="recurring-summary"
        aria-label="Subscription estimates"
      >
        <div className="recurring-summary-primary">
          <span className="recurring-hero-label">
            <Repeat2 size={15} /> ACTIVE SUBSCRIPTIONS
          </span>
          <strong>{baht2(average)}</strong>
          <span className="recurring-monthly">Estimated monthly cost</span>
          <p>
            {active.length} active{" "}
            {active.length === 1 ? "schedule" : "schedules"} · weekly charges
            averaged over the year
          </p>
        </div>
        <div className="recurring-summary-horizon">
          <div className="recurring-horizon-head">
            <span>Next 30 days</span>
            <b>{baht2(upcomingTotal)}</b>
          </div>
          <div
            className="renewal-horizon"
            aria-label="Expected renewals across the next 30 days"
          >
            {horizon.map(({ date, amount }) =>
              amount ? (
                <button
                  key={date}
                  className="horizon-day has-renewal"
                  aria-label={`${dateText(date)}: ${baht2(amount)} expected. Open calendar`}
                  onClick={() => openCalendar(date, "renewals")}
                  title={`${dateText(date)} · ${baht2(amount)}`}
                >
                  <motion.i
                    initial={calm ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      type: "spring",
                      bounce: 0,
                      duration: calm ? 0 : 0.42,
                    }}
                    style={{
                      height: `${Math.max(12, (amount / peak) * 100)}%`,
                    }}
                  />
                </button>
              ) : (
                <span key={date} className="horizon-day" aria-hidden="true">
                  <i />
                </span>
              ),
            )}
          </div>
          <div className="recurring-horizon-foot">
            <span>{dateText(today)}</span>
            <span>{dateText(addDays(today, 29))}</span>
          </div>
        </div>
      </section>
      <div className="subscriptions-layout">
        <section
          className="subscription-library"
          aria-labelledby="subscription-library-title"
        >
          <div className="subscription-library-head">
            <div>
              <h2 id="subscription-library-title">Your subscriptions</h2>
              <p>{model.subscriptions.length} tracked</p>
            </div>
            <SearchField
              label="Search subscriptions"
              value={query}
              onChange={setQuery}
              placeholder="Find a subscription"
            />
          </div>
          <Segmented
            label="Subscription status filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <div className="subscription-list">
            {visible.map(({ subscription, next }) => {
              const card = model.cards.find(
                (item) => item.id === subscription.card,
              );
              const hue = subscription.category
                ? model.meta(subscription.category).color
                : palette[
                    Array.from(subscription.name).reduce(
                      (sum, char) => sum + (char.codePointAt(0) || 0),
                      0,
                    ) % palette.length
                  ];
              return (
                <motion.article
                  key={subscription.id}
                  className="subscription-row"
                  layout={calm ? false : "position"}
                  style={{ "--service-color": safeColor(hue) } as CSSVars}
                >
                  <span className="subscription-monogram" aria-hidden="true">
                    <RecordIcon
                      site={subscription.siteIcon}
                      size={24}
                      fallback={Array.from(subscription.name.trim())
                        .slice(0, 2)
                        .join("")
                        .toLocaleUpperCase()}
                    />
                  </span>
                  <div className="subscription-identity">
                    <h3>{subscription.name}</h3>
                    <p>
                      {subscription.category || "Uncategorized"}
                      {card ? ` · ${card.name}` : ""}
                    </p>
                    <span
                      className={`subscription-status status-${subscription.status}`}
                    >
                      <i />
                      {statusNames[subscription.status]}
                    </span>
                  </div>
                  <div className="subscription-cost">
                    <strong>{baht2(subscription.amount)}</strong>
                    <span>{CADENCES[subscription.cadence]}</span>
                    {next && (
                      <button
                        className="subscription-next"
                        onClick={() =>
                          open({
                            kind: "renewal",
                            subscriptionId: subscription.id,
                            date: next.date,
                          })
                        }
                      >
                        Due {dateText(next.date)} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    className="secondary subscription-edit"
                    aria-label={`Edit ${subscription.name}`}
                    onClick={() => open({ kind: "subscription", subscription })}
                  >
                    <Pencil size={16} />
                  </button>
                </motion.article>
              );
            })}
            {!visible.length && (
              <div className="planner-empty subscription-empty">
                <Repeat2 size={32} />
                <h3>
                  {model.subscriptions.length
                    ? "No matching subscriptions"
                    : "No subscriptions yet"}
                </h3>
                <p>
                  {model.subscriptions.length
                    ? "Try another search or status."
                    : "Add a recurring bill or membership and Moneywise will show its future renewal dates."}
                </p>
              </div>
            )}
          </div>
        </section>
        <aside
          className="subscription-upcoming"
          aria-labelledby="subscription-upcoming-title"
        >
          <span className="recurring-icon">
            <CalendarDays size={21} />
          </span>
          <h2 id="subscription-upcoming-title">Coming up</h2>
          <p>
            {upcoming.length
              ? `${upcoming.length} expected ${upcoming.length === 1 ? "charge" : "charges"} in the next 30 days`
              : "No scheduled renewals in the next 30 days."}
          </p>
          {upcoming.slice(0, 8).map(({ subscription, date }) => (
            <button
              key={`${subscription.id}:${date}`}
              className="upcoming-renewal"
              onClick={() =>
                open({ kind: "renewal", subscriptionId: subscription.id, date })
              }
            >
              <span className="upcoming-date">
                <small>{dateText(date).split(" ")[0]}</small>
                <b>{Number(date.slice(8))}</b>
              </span>
              <span>
                <strong className="record-reference-name">
                  <RecordIcon
                    site={subscription.siteIcon}
                    size={14}
                    fallback={null}
                  />
                  <span>{subscription.name}</span>
                </strong>
                <small>{CADENCES[subscription.cadence]}</small>
              </span>
              <b>{baht2(subscription.amount)}</b>
            </button>
          ))}
          <button
            className="link-button"
            onClick={() => openCalendar(upcoming[0]?.date || today, "renewals")}
          >
            Open renewal calendar <ArrowRight size={16} />
          </button>
          <p className="subscription-footnote">
            Renewals are estimates. Only expenses you record or link count
            toward your ledger.
          </p>
        </aside>
      </div>
    </>
  );
}
