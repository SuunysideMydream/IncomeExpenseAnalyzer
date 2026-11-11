import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  CornerDownLeft,
  ReceiptText,
  Repeat2,
  Search,
  Tags,
  X,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "../context";
import { baht2, signedMoney } from "../lib/finance";
import { CADENCES, dateText } from "../lib/recurring";
import { ROUTES, ROUTE_ICONS } from "../lib/routes";
import { PlanIcon, RecordIcon } from "./RecordIcon";

interface Command {
  id: string;
  title: string;
  sub?: string;
  icon: ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const {
    model,
    open,
    close,
    navigate,
    openCalendar,
    openMonth,
    showWalletCard,
    setFilters,
  } = useApp();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const listId = useId();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (...values: (string | undefined)[]) => {
    const text = values.join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  };
  const groups: { label: string; entries: Command[] }[] = [
    {
      label: "Quick actions",
      entries: [
        {
          id: "expense",
          title: "Add expense",
          icon: <ArrowUpRight />,
          action: () => open({ kind: "transaction", type: "expense" }),
        },
        {
          id: "income",
          title: "Add income",
          icon: <ArrowDownLeft />,
          action: () => open({ kind: "transaction", type: "income" }),
        },
        {
          id: "today",
          title: "Today in Calendar",
          icon: <CalendarDays />,
          action: () => {
            close();
            openCalendar();
          },
        },
      ].filter((command) => matches(command.title)),
    },
    {
      label: "Pages",
      entries: ROUTES.filter(({ label }) => matches(label)).map(
        ({ label, view }) => {
          const Icon = ROUTE_ICONS[view];
          return {
            id: `page-${view}`,
            title: label,
            icon: <Icon />,
            action: () => {
              close();
              navigate(view);
            },
          };
        },
      ),
    },
  ];
  if (words.length) {
    const cardNames = new Map(model.cards.map(({ id, name }) => [id, name]));
    groups.push(
      {
        label: "Transactions",
        entries: model.transactions
          .filter((row) =>
            matches(
              row.note,
              row.date,
              row.category,
              ...Object.keys(row.categories || {}),
              cardNames.get(row.card || ""),
            ),
          )
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 8)
          .map((row) => ({
            id: `transaction-${row.id}`,
            title: row.note || row.category || row.date,
            sub: `${dateText(row.date)} · ${signedMoney(row.income - row.expense)}`,
            icon: <ReceiptText />,
            action: () => {
              close();
              openMonth(row.date.slice(0, 7));
              setFilters({ ...EMPTY_FILTERS, query: row.date });
            },
          })),
      },
      {
        label: "Wallet",
        entries: model.cards
          .filter((card) => matches(card.name, card.last4))
          .slice(0, 8)
          .map((card) => ({
            id: `card-${card.id}`,
            title: card.name,
            sub: `${card.kind === "cash" ? "Cash" : "Credit"} card · •••• ${card.last4}`,
            icon: <CreditCard />,
            action: () => {
              close();
              showWalletCard(card.id);
            },
          })),
      },
      {
        label: "Subscriptions",
        entries: model.subscriptions
          .filter((subscription) =>
            matches(
              subscription.name,
              subscription.note,
              subscription.siteIcon?.host,
            ),
          )
          .slice(0, 8)
          .map((subscription) => ({
            id: `subscription-${subscription.id}`,
            title: subscription.name,
            sub: `${CADENCES[subscription.cadence]} · ${baht2(subscription.amount)}`,
            icon: (
              <RecordIcon
                site={subscription.siteIcon}
                size={18}
                fallback={<Repeat2 size={18} />}
              />
            ),
            action: () => open({ kind: "subscription", subscription }),
          })),
      },
      {
        label: "Installment plans",
        entries: model.plans
          .filter((plan) => matches(plan.name, plan.siteIcon?.host))
          .slice(0, 8)
          .map((plan) => ({
            id: `plan-${plan.id}`,
            title: plan.name,
            sub: `${baht2(plan.monthly)} / month`,
            icon: <PlanIcon plan={plan} size={18} />,
            action: () => open({ kind: "planDetail", plan }),
          })),
      },
      {
        label: "Categories",
        entries: model.categories
          .filter((name) => matches(name))
          .slice(0, 8)
          .map((name) => ({
            id: `category-${name}`,
            title: name,
            sub: model.meta(name).type,
            icon: <Tags />,
            action: () => {
              close();
              navigate("categories");
            },
          })),
      },
    );
  }
  const entries = groups.flatMap(({ entries }) => entries);
  const focusedIndex = entries.findIndex(({ id }) => id === activeId);
  const at =
    focusedIndex < 0 && words.length && entries.length ? 0 : focusedIndex;
  const optionId = (index: number) => `${listId}-${index}`;

  function changeQuery(value: string) {
    setQuery(value);
    setActiveId(null);
    document.getElementById(listId)?.scrollTo({ top: 0, behavior: "instant" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || !entries.length) return;
    if (event.key === "Enter" && at >= 0) {
      event.preventDefault();
      entries[at].action();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const index =
        at < 0
          ? step > 0
            ? 0
            : entries.length - 1
          : (at + step + entries.length) % entries.length;
      setActiveId(entries[index].id);
      document
        .getElementById(optionId(index))
        ?.scrollIntoView({ block: "nearest" });
    }
  }

  return (
    <>
      <div className="space-command-field">
        <Search size={20} aria-hidden="true" />
        <input
          id="space-command-query"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={entries.length > 0}
          aria-activedescendant={at >= 0 ? optionId(at) : undefined}
          aria-label="Search all your finances"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Try a name, date, or ‘add expense’"
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search query"
            className="space-text-icon"
            onClick={() => {
              changeQuery("");
              document.getElementById("space-command-query")?.focus();
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div
        id={listId}
        className="space-command-results"
        role="listbox"
        aria-label="Search results and actions"
        hidden={!entries.length}
      >
        {groups
          .filter((group) => group.entries.length > 0)
          .map((group) => (
            <div
              className="command-group"
              role="group"
              key={group.label}
              aria-label={group.label}
            >
              <div className="command-group-label" aria-hidden="true">
                {group.label}
              </div>
              {group.entries.map((entry) => (
                <button
                  type="button"
                  className="space-command-result"
                  key={entry.id}
                  id={optionId(entries.indexOf(entry))}
                  role="option"
                  tabIndex={-1}
                  aria-selected={entry === entries[at]}
                  onPointerMove={(event) => {
                    if (event.pointerType === "mouse") setActiveId(entry.id);
                  }}
                  onClick={entry.action}
                >
                  <span className="command-icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                  <span>
                    <strong>{entry.title}</strong>
                    {entry.sub && <small>{entry.sub}</small>}
                  </span>
                  {entry === entries[at] ? (
                    <CornerDownLeft size={15} aria-hidden="true" />
                  ) : (
                    <ArrowRight size={15} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          ))}
      </div>
      {!entries.length && (
        <p className="command-empty" role="status">
          No matches for “{query.trim()}”.
        </p>
      )}
      <div className="space-command-footer">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> Move
        </span>
        <span>
          <kbd>Enter</kbd> Open
        </span>
        <span>
          <kbd>Esc</kbd> Close
        </span>
      </div>
    </>
  );
}
