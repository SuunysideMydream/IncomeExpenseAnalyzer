import { Finance, nextMonth, planProgress } from "./finance";
import { isSiteIcon } from "./site-icon";
import type {
  BillingCadence,
  Plan,
  RenewalLink,
  Subscription,
  Transaction,
} from "../types";

export const CADENCES: Record<BillingCadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
const monthSteps = { monthly: 1, quarterly: 3, yearly: 12 };
const dayMs = 86_400_000;
const utcDay = (value: string) => Date.parse(value + "T00:00:00Z");
const monthIndex = (value: string) =>
  Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
const fromMonthIndex = (index: number) =>
  `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;

export function addDays(date: string, count: number) {
  return new Date(utcDay(date) + count * dayMs).toISOString().slice(0, 10);
}
export function daysInMonth(month: string) {
  return new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
}
export function monthDay(month: string, day: number) {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}
export function calendarDays(month: string) {
  const start = monthDay(month, 1);
  const weekday = new Date(utcDay(start)).getUTCDay();
  const count = Math.ceil((weekday + daysInMonth(month)) / 7) * 7;
  return Array.from({ length: count }, (_, index) =>
    addDays(start, index - weekday),
  );
}
export function dateText(date: string, style: "short" | "long" = "short") {
  return new Date(utcDay(date)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: style,
    day: "numeric",
    ...(style === "long" ? { weekday: "long", year: "numeric" } : {}),
  });
}
export function monthlyEquivalent(
  subscription: Pick<Subscription, "amount" | "cadence">,
) {
  return (
    subscription.amount *
    (subscription.cadence === "weekly"
      ? 52 / 12
      : 1 / monthSteps[subscription.cadence])
  );
}

// Use the original anchor for every occurrence. Jan 31 → Feb 28 → Mar 31.
// UTC date-only arithmetic avoids shifting a weekly renewal across DST.
function* datesFrom(
  subscription: Subscription,
  from: string,
): Generator<string> {
  const anchor = subscription.startDate;
  if (!Finance.validDate(anchor) || !Finance.validDate(from)) return;
  if (subscription.cadence === "weekly") {
    const step = 7 * dayMs;
    let time =
      utcDay(anchor) +
      Math.max(0, Math.ceil((utcDay(from) - utcDay(anchor)) / step)) * step;
    const end = utcDay("9999-12-31");
    for (; time <= end; time += step)
      yield new Date(time).toISOString().slice(0, 10);
    return;
  }
  const anchorIndex = monthIndex(anchor),
    step = monthSteps[subscription.cadence];
  const anchorDay = Number(anchor.slice(8));
  if (!step) return;
  const first = Math.max(
    0,
    Math.floor((monthIndex(from) - anchorIndex) / step),
  );
  for (
    let index = anchorIndex + first * step;
    index < 10000 * 12;
    index += step
  ) {
    const date = monthDay(fromMonthIndex(index), anchorDay);
    if (date >= from) yield date;
  }
}
export function isScheduledDate(subscription: Subscription, date: string) {
  return datesFrom(subscription, date).next().value === date;
}
export function renewalKey(link: RenewalLink) {
  return `${link.subscriptionId}:${link.scheduledFor}`;
}
export function isRenewalLink(value: unknown): value is RenewalLink {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const link = value as RenewalLink;
  return (
    typeof link.subscriptionId === "string" &&
    /^sub-[a-zA-Z0-9-]+$/.test(link.subscriptionId) &&
    Finance.validDate(link.scheduledFor)
  );
}
export function validateSubscription(
  value: unknown,
): asserts value is Subscription {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid subscription.");
  const sub = value as Subscription;
  if (typeof sub.id !== "string" || !/^sub-[a-zA-Z0-9-]+$/.test(sub.id))
    throw Error("Invalid subscription ID.");
  if (typeof sub.name !== "string" || !sub.name.trim() || sub.name.length > 100)
    throw Error("Enter a subscription name, up to 100 characters.");
  if (!Number.isFinite(sub.amount) || sub.amount < 0.01 || sub.amount > 1e9)
    throw Error("Enter a charge between ฿0.01 and ฿1,000,000,000.");
  if (!Finance.validDate(sub.startDate))
    throw Error("Choose a valid first renewal date.");
  if (
    !Object.hasOwn(CADENCES, sub.cadence) ||
    !["active", "paused", "archived"].includes(sub.status)
  )
    throw Error("Choose a valid billing cycle and status.");
  for (const field of ["category", "card", "note"] as const)
    if (
      sub[field] !== undefined &&
      (typeof sub[field] !== "string" || sub[field].length > 500)
    )
      throw Error("Invalid subscription details.");
  if (sub.siteIcon !== undefined && !isSiteIcon(sub.siteIcon))
    throw Error("Invalid subscription website icon.");
  if (
    sub.skippedDates !== undefined &&
    (!Array.isArray(sub.skippedDates) ||
      sub.skippedDates.some((date) => !Finance.validDate(date)) ||
      new Set(sub.skippedDates).size !== sub.skippedDates.length)
  )
    throw Error("Invalid skipped renewal dates.");
}
export function validateSubscriptions(
  value: unknown,
): asserts value is Subscription[] {
  if (!Array.isArray(value)) throw Error("Invalid subscriptions in backup.");
  const ids = new Set<string>();
  for (const subscription of value) {
    validateSubscription(subscription);
    if (ids.has(subscription.id))
      throw Error("Duplicate subscription ID in backup.");
    ids.add(subscription.id);
  }
}

export interface Renewal {
  subscription: Subscription;
  date: string;
  status: "scheduled" | "recorded" | "skipped";
  transaction?: Transaction;
}
export function createRenewalIndex(
  subscriptions: Subscription[],
  transactions: Transaction[],
) {
  const recorded = new Map<string, Map<string, Transaction>>();
  for (const row of transactions) {
    if (!isRenewalLink(row.renewal) || row.expense <= 0) continue;
    const { subscriptionId, scheduledFor } = row.renewal;
    const dates =
      recorded.get(subscriptionId) || new Map<string, Transaction>();
    dates.set(scheduledFor, row);
    recorded.set(subscriptionId, dates);
  }
  const get = (id: string, date: string): Renewal | undefined => {
    const subscription = subscriptions.find((item) => item.id === id);
    if (!subscription) return;
    const transaction = recorded.get(id)?.get(date);
    if (transaction)
      return { subscription, date, status: "recorded", transaction };
    if (subscription.skippedDates?.includes(date))
      return { subscription, date, status: "skipped" };
    if (subscription.status === "active" && isScheduledDate(subscription, date))
      return { subscription, date, status: "scheduled" };
  };
  const between = (from: string, until: string): Renewal[] =>
    subscriptions
      .flatMap((subscription): Renewal[] => {
        const dates = new Set<string>();
        if (subscription.status === "active")
          for (const date of datesFrom(subscription, from)) {
            if (date > until) break;
            dates.add(date);
          }
        for (const date of [
          ...(subscription.skippedDates || []),
          ...(recorded.get(subscription.id)?.keys() || []),
        ])
          if (date >= from && date <= until) dates.add(date);
        return [...dates].flatMap((date) => {
          const renewal = get(subscription.id, date);
          return renewal ? [renewal] : [];
        });
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.subscription.name.localeCompare(b.subscription.name),
      );
  const next = (
    id: string,
    from = Finance.localDate(),
  ): Renewal | undefined => {
    const subscription = subscriptions.find((item) => item.id === id);
    if (subscription?.status !== "active") return;
    const skipped = new Set(subscription.skippedDates || []);
    for (const date of datesFrom(subscription, from))
      if (!skipped.has(date) && !recorded.get(id)?.has(date))
        return { subscription, date, status: "scheduled" };
  };
  return {
    get,
    between,
    next,
    upcoming: (from = Finance.localDate(), days = 30) =>
      between(from, addDays(from, days - 1)).filter(
        (item) => item.status === "scheduled",
      ),
  };
}

export function plansInMonth(plans: Plan[], month: string) {
  return plans.filter((plan) => {
    if (
      plan.status !== "Ongoing" ||
      !plan.startMonth ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(plan.startMonth)
    )
      return false;
    const progress = planProgress(plan);
    return (
      progress.remaining > 0 &&
      month >= nextMonth(plan.startMonth, progress.paid) &&
      monthIndex(month) < monthIndex(plan.startMonth) + plan.months
    );
  });
}
