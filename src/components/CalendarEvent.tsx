import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Repeat2,
} from "lucide-react";
import type { CalendarItem } from "../lib/calendar";
import { baht2 } from "../lib/finance";
import { CADENCES } from "../lib/recurring";
import { useApp } from "../context";
import type { Subscription } from "../types";
import { RecordIcon } from "./RecordIcon";

export function siteForEvent(
  item: CalendarItem,
  subscriptions: Subscription[],
) {
  if (item.kind === "renewal") return item.renewal.subscription.siteIcon;
  if (item.kind === "expense" && item.transaction.renewal) {
    const id = item.transaction.renewal.subscriptionId;
    return subscriptions.find((subscription) => subscription.id === id)
      ?.siteIcon;
  }
}

export const eventMeta = {
  income: { Icon: ArrowDownLeft, label: "Recorded income" },
  expense: { Icon: ArrowUpRight, label: "Recorded spending" },
  renewal: { Icon: Repeat2, label: "Subscription renewal" },
  "card-due": { Icon: CreditCard, label: "Card reminder" },
};

function subtitle(item: CalendarItem, today: string) {
  if (item.kind === "renewal") {
    const { status, subscription } = item.renewal;
    const label =
      status === "recorded"
        ? "Recorded renewal"
        : status === "skipped"
          ? "Skipped renewal"
          : item.date < today
            ? "Renewal not logged"
            : "Expected renewal";
    return `${label} · ${CADENCES[subscription.cadence]}`;
  }
  if (item.kind === "card-due") return "Payment reminder";
  return [eventMeta[item.kind].label, item.card?.name]
    .filter(Boolean)
    .join(" · ");
}

export function CalendarEvent({
  item,
  today,
  onOpen,
}: {
  item: CalendarItem;
  today: string;
  onOpen: () => void;
}) {
  const { model } = useApp();
  const { Icon } = eventMeta[item.kind];
  const direction =
    item.kind === "income" ? "+" : item.kind === "expense" ? "−" : "";
  return (
    <button
      type="button"
      className="planner-event-row"
      data-event-kind={item.kind}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className={`planner-event-icon event-${item.kind}`}>
        <RecordIcon
          site={siteForEvent(item, model.subscriptions)}
          size={17}
          fallback={<Icon size={16} />}
        />
      </span>
      <span className="planner-event-title">
        <strong>{item.title}</strong>
        <small>{subtitle(item, today)}</small>
      </span>
      {"amount" in item && (
        <b
          className={`event-amount ${item.kind === "income" ? "positive" : ""}`}
        >
          {direction}
          {baht2(item.amount)}
        </b>
      )}
      <ArrowRight size={14} className="planner-event-arrow" />
    </button>
  );
}
