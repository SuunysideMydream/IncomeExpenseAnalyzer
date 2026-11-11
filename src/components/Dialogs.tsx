import {
  Fragment,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Bell,
  CreditCard,
  Repeat2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "../context";
import {
  baht2,
  calcPlan,
  COLORS,
  Finance,
  monthText,
  normalizeColor,
  planProgress,
  RATES,
  safeColor,
  signedMoney,
  TERMS,
} from "../lib/finance";
import type {
  Card,
  BillingCadence,
  CategoryMeta,
  DialogState,
  Plan,
  Subscription,
  SubscriptionStatus,
  Transaction,
  TransactionType,
  View,
} from "../types";
import {
  addDays,
  CADENCES,
  dateText,
  monthlyEquivalent,
} from "../lib/recurring";
import { saveBackup } from "../lib/files";
import { ColorPicker } from "./ColorPicker";
import { Select } from "./ui/select";
import { ContextMenu } from "./ui/menus";
import { CardPreview } from "./shadcnspace/WalletCard";
import { CalendarDetails } from "./CalendarDetails";
import { PlanAppearance, type PlanAppearanceState } from "./PlanAppearance";
import { PlanIcon, RecordIcon } from "./RecordIcon";
import { SiteIconField, useSiteIcon } from "./SiteIconField";
import { DatePicker } from "./ui/date-picker";
import { NumberField } from "./ui/number-field";
import { CommandPalette } from "./CommandPalette";
import {
  CARD_NETWORKS,
  glyphForPlan,
  isCardNetwork,
  isCoverFrame,
  isPlanCover,
} from "../lib/appearance";
const labels: Record<DialogState["kind"], [string, string]> = {
  transaction: [
    "Add transaction",
    "Record spending or income. Your summaries update immediately.",
  ],
  day: ["Day details", "Every recorded transaction for this date."],
  calendarDay: [
    "Day details",
    "Recorded totals, card activity, and subscription renewals.",
  ],
  card: ["Add card", "Choose credit or cash, and make it yours."],
  plan: [
    "Add installment plan",
    "Calculate a purchase and track its payment progress.",
  ],
  planDetail: [
    "Installment details",
    "A clear breakdown of your purchase plan.",
  ],
  category: ["Create category", "Choose its type and display color."],
  subscription: [
    "Add subscription",
    "Set up a recurring bill, membership, or service.",
  ],
  renewal: [
    "Review renewal",
    "Check the schedule, then record or link a charge when it happens.",
  ],
  budget: [
    "Monthly spending budget",
    "Give your recorded spending a comfortable limit.",
  ],
  settings: ["Data & settings", "Manage this browser’s personal ledger."],
  clear: [
    "Clear all data & start fresh",
    "Start a personal ledger from today.",
  ],
  preferences: [
    "Make yourself at home",
    "A few details for your local workspace.",
  ],
  search: [
    "Search Moneywise",
    "Find a record, open a page, or start an entry.",
  ],
  reminders: ["Your reminders", "Useful nudges from your own ledger."],
};
export function Dialogs() {
  const { dialog, close, calm } = useApp();
  const returnFocus = useRef<HTMLElement | null>(null);
  const Presence = calm ? Fragment : AnimatePresence;
  const drawer = dialog?.kind === "calendarDay";
  const search = dialog?.kind === "search";
  let title = dialog ? labels[dialog.kind][0] : "";
  if (dialog?.kind === "calendarDay") title = dateText(dialog.date, "long");
  if (dialog?.kind === "card" && dialog.card) title = "Edit card";
  if (dialog?.kind === "plan" && dialog.plan) title = "Edit installment plan";
  if (dialog?.kind === "category" && dialog.name) title = "Edit category";
  if (dialog?.kind === "subscription" && dialog.subscription)
    title = "Edit subscription";
  if (dialog?.kind === "transaction")
    title = dialog.row
      ? dialog.duplicate
        ? "Duplicate transaction"
        : "Edit transaction"
      : dialog.type
        ? `Add ${dialog.type}`
        : "Add transaction";
  if (dialog?.kind === "transaction" && dialog.renewal)
    title = "Record renewal charge";
  const key =
    dialog?.kind === "transaction"
      ? `transaction-${dialog.row?.id || dialog.renewal?.subscriptionId || "new"}-${dialog.duplicate}`
      : dialog?.kind === "card"
        ? `card-${dialog.card?.id || "new"}`
        : dialog?.kind === "plan"
          ? `plan-${dialog.plan?.id || "new"}`
          : dialog?.kind === "category"
            ? `category-${dialog.name || "new"}`
            : dialog?.kind === "subscription"
              ? `subscription-${dialog.subscription?.id || "new"}`
              : dialog?.kind === "renewal"
                ? `renewal-${dialog.subscriptionId}-${dialog.date}`
                : dialog?.kind || "closed";
  return (
    <Primitive.Root
      open={Boolean(dialog)}
      onOpenChange={(opened) => {
        if (!opened) close();
      }}
    >
      <Presence>
        {dialog && (
          <Primitive.Portal forceMount>
            <Primitive.Overlay forceMount asChild>
              <motion.div
                className={`modal-backdrop is-open react-backdrop${drawer ? " calendar-drawer-backdrop" : ""}`}
                initial={calm ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: calm ? 0 : 0.15 }}
              >
                <Primitive.Content
                  forceMount
                  asChild
                  onOpenAutoFocus={(event) => {
                    returnFocus.current = document.activeElement as HTMLElement;
                    if (search) {
                      event.preventDefault();
                      document.getElementById("space-command-query")?.focus();
                    }
                  }}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    const previous = returnFocus.current;
                    const target = previous?.isConnected
                      ? previous.closest("[inert]")
                        ? previous
                            .closest("[data-space-card]")
                            ?.querySelector<HTMLElement>(
                              ".wallet-keyboard-toggle",
                            )
                        : previous
                      : document.querySelector<HTMLElement>(".nav-item.active");
                    target?.focus();
                  }}
                >
                  <motion.div
                    className={`modal react-modal${drawer ? " calendar-drawer" : ""}${search ? " command-palette" : ""}`}
                    initial={
                      calm
                        ? false
                        : drawer
                          ? { opacity: 0.8, x: "105%" }
                          : { opacity: 0, y: 12, scale: 0.98 }
                    }
                    animate={{ opacity: 1, x: "0%", y: 0, scale: 1 }}
                    exit={
                      calm
                        ? { opacity: 0 }
                        : drawer
                          ? { opacity: 0.8, x: "105%" }
                          : { opacity: 0, y: 8, scale: 0.99 }
                    }
                    transition={
                      calm
                        ? { duration: 0.08 }
                        : { type: "spring", bounce: 0, duration: 0.32 }
                    }
                  >
                    <div className="modal-head">
                      <div>
                        {drawer && (
                          <span className="studio-eyebrow">
                            CALENDAR / DAY DETAILS
                          </span>
                        )}
                        <Primitive.Title>{title}</Primitive.Title>
                        <Primitive.Description>
                          {labels[dialog.kind][1]}
                        </Primitive.Description>
                      </div>
                      <Primitive.Close
                        className="close-modal"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </Primitive.Close>
                    </div>
                    <div
                      key={key}
                      className={drawer ? "calendar-drawer-body" : undefined}
                    >
                      <DialogBody dialog={dialog} />
                    </div>
                  </motion.div>
                </Primitive.Content>
              </motion.div>
            </Primitive.Overlay>
          </Primitive.Portal>
        )}
      </Presence>
    </Primitive.Root>
  );
}
function DialogBody({ dialog }: { dialog: DialogState }) {
  switch (dialog.kind) {
    case "transaction":
      return <TransactionForm dialog={dialog} />;
    case "day":
      return <DayDetails date={dialog.date} filtered={dialog.filtered} />;
    case "calendarDay":
      return <CalendarDetails details={dialog} />;
    case "card":
      return <CardForm card={dialog.card} kind={dialog.cardKind} />;
    case "plan":
      return <PlanForm plan={dialog.plan} />;
    case "planDetail":
      return <PlanDetails plan={dialog.plan} />;
    case "category":
      return <CategoryForm original={dialog.name} />;
    case "subscription":
      return (
        <SubscriptionForm
          subscription={dialog.subscription}
          date={dialog.date}
        />
      );
    case "renewal":
      return <RenewalDetails id={dialog.subscriptionId} date={dialog.date} />;
    case "budget":
      return <BudgetForm />;
    case "settings":
      return <DataSettings />;
    case "clear":
      return <ClearForm />;
    case "preferences":
      return <PreferencesForm />;
    case "search":
      return <CommandPalette />;
    case "reminders":
      return <Reminders />;
  }
}
function Field({
  label,
  id,
  children,
  full = false,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
function Form({
  children,
  save,
  label = "Save",
  pending,
}: {
  children: ReactNode;
  save: () => void;
  label?: string;
  pending?: string;
}) {
  const { close } = useApp(),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (pending) return;
        try {
          save();
          close();
        } catch (error) {
          setError((error as Error).message);
        }
      }}
      onInputCapture={() => setError("")}
      noValidate
    >
      {children}
      <p className="modal-error" role={error ? "alert" : undefined}>
        {error}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="secondary cancel-modal"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className={`primary save-modal ${label === "Clear all data" ? "danger-button" : ""}`}
          type="submit"
          disabled={Boolean(pending)}
        >
          {pending || label}
        </button>
      </div>
    </form>
  );
}
function TransactionForm({
  dialog,
}: {
  dialog: Extract<DialogState, { kind: "transaction" }>;
}) {
  const { model, store, transactionSaved, notify } = useApp(),
    row = dialog.row;
  const renewal = dialog.renewal
    ? model.renewals.get(
        dialog.renewal.subscriptionId,
        dialog.renewal.scheduledFor,
      )
    : undefined;
  const lockedExpense = Boolean(
    dialog.renewal || (row?.renewal && !dialog.duplicate),
  );
  const aggregate = Boolean(
    row &&
    (row.source === "workbook" ||
      Object.keys(row.categories || {}).length > 1 ||
      (row.income && row.expense)),
  );
  const [date, setDate] = useState(
      row?.date ||
        dialog.date ||
        (renewal && renewal.date < Finance.localDate()
          ? renewal.date
          : Finance.localDate()),
    ),
    [type, setType] = useState<TransactionType>(
      lockedExpense
        ? "expense"
        : dialog.type || (row?.income && !row.expense ? "income" : "expense"),
    );
  const [amount, setAmount] = useState(
      String(row?.income || row?.expense || renewal?.subscription.amount || ""),
    ),
    [income, setIncome] = useState(String(row?.income || 0)),
    [expense, setExpense] = useState(String(row?.expense || 0));
  const [category, setCategory] = useState(
      row?.category ||
        Object.keys(row?.categories || {}).find(
          (name) => row?.categories[name],
        ) ||
        renewal?.subscription.category ||
        "",
    ),
    [card, setCard] = useState(
      row?.card || dialog.card || renewal?.subscription.card || "",
    ),
    [note, setNote] = useState(row?.note || renewal?.subscription.name || "");
  const allocationsList = [
    ...new Set([
      ...Object.keys(row?.categories || {}),
      ...model.categories.filter((name) => model.meta(name).type !== "Income"),
    ]),
  ];
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allocationsList.map((name) => [
        name,
        String(Math.abs(row?.categories?.[name] || 0)),
      ]),
    ),
  );
  const allowed = model.categories.filter(
    (name) =>
      model.meta(name).type === "Both" ||
      model.meta(name).type.toLowerCase() === type ||
      name === category,
  );
  return (
    <Form
      label={dialog.renewal ? "Record expense" : "Save"}
      save={() => {
        const categories: Record<string, number> = {};
        let inValue = 0,
          outValue = 0;
        if (aggregate) {
          inValue = Number(income);
          outValue = Number(expense);
          for (const [name, text] of Object.entries(allocations)) {
            const value = Number(text);
            if (!Number.isFinite(value) || value < 0)
              throw Error("Category amounts must be zero or positive.");
            if (value) categories[name] = value;
          }
        } else {
          const value = Number(amount);
          if (type === "income") inValue = value;
          else {
            outValue = value;
            if (category) categories[category] = value;
          }
        }
        const saved = store.saveTransaction(
          {
            id: row?.id || "",
            date,
            income: inValue,
            expense: outValue,
            categories,
            category: aggregate ? "" : category,
            card,
            note: note.trim(),
            renewal: dialog.renewal,
          },
          row?.id,
          dialog.duplicate,
        );
        transactionSaved(saved.date);
        notify(
          dialog.renewal
            ? "Renewal recorded in Transactions."
            : "Transaction saved.",
        );
      }}
    >
      <div
        className="form-section"
        data-transaction-form
        data-aggregate={aggregate}
      >
        {renewal && (
          <p className="preview-box renewal-prefill">
            <Repeat2 size={16} /> Scheduled {dateText(renewal.date)} · enter the
            date and amount actually charged.
          </p>
        )}
        <div className="form-grid">
          <Field label="Date" id="date">
            <DatePicker
              id="date"
              label="Date"
              value={date}
              onChange={setDate}
            />
          </Field>
          {aggregate ? (
            <>
              <Field label="Income (THB)" id="income">
                <input
                  id="income"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step=".01"
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                />
              </Field>
              <Field label="Total spending (THB)" id="expense">
                <input
                  id="expense"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step=".01"
                  value={expense}
                  onChange={(event) => setExpense(event.target.value)}
                />
              </Field>
              <p className="ledger-hint field full">
                Workbook entries are daily aggregates. Keep total spending and
                all category allocations consistent.
              </p>
              {allocationsList.map((name, index) => (
                <Field key={name} label={name} id={`allocation-${index}`}>
                  <input
                    id={`allocation-${index}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step=".01"
                    value={allocations[name] || "0"}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                  />
                </Field>
              ))}
            </>
          ) : (
            <>
              <Field label="Type" id="type">
                <Select
                  id="type"
                  label="Type"
                  value={type}
                  disabled={lockedExpense}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                  onChange={(value) => {
                    setType(value as TransactionType);
                    setCategory("");
                  }}
                />
              </Field>
              <Field label="Amount (THB)" id="amount">
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  min=".01"
                  step=".01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field label="Category" id="category">
                <Select
                  id="category"
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: "", label: "Uncategorized" },
                    ...allowed.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </Field>
            </>
          )}
          <Field label="Payment method" id="card" full>
            <Select
              id="card"
              label="Payment method"
              value={card}
              onChange={setCard}
              options={[
                { value: "", label: "Cash / bank / unspecified" },
                ...model.cards.map((card) => ({
                  value: card.id,
                  label: `${card.name} · •••• ${card.last4}`,
                })),
              ]}
            />
          </Field>
          <Field label="Note" id="note" full>
            <textarea
              id="note"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was this for?"
            />
          </Field>
        </div>
        <p className="preview-box">
          Saved on this browser. Use Save data for a portable backup.
        </p>
      </div>
    </Form>
  );
}
function SubscriptionForm({
  subscription,
  date,
}: {
  subscription?: Subscription;
  date?: string;
}) {
  const { model, store, notify } = useApp();
  const [name, setName] = useState(subscription?.name || "");
  const [amount, setAmount] = useState(String(subscription?.amount ?? ""));
  const [cadence, setCadence] = useState<BillingCadence>(
    subscription?.cadence || "monthly",
  );
  const [startDate, setStartDate] = useState(
    subscription?.startDate || date || Finance.localDate(),
  );
  const [status, setStatus] = useState<SubscriptionStatus>(
    subscription?.status || "active",
  );
  const [category, setCategory] = useState(subscription?.category || "");
  const [card, setCard] = useState(subscription?.card || "");
  const [note, setNote] = useState(subscription?.note || "");
  const site = useSiteIcon(subscription?.siteIcon);
  const categories = model.categories.filter(
    (item) => model.meta(item).type !== "Income" || item === category,
  );
  return (
    <Form
      label={subscription ? "Save subscription" : "Add subscription"}
      pending={site.pending ? "Looking up icon…" : undefined}
      save={() => {
        if (site.invalid)
          throw Error("Enter a public website or clear the website field.");
        store.saveSubscription(
          {
            name,
            amount: Number(amount),
            cadence,
            startDate,
            status,
            category,
            card,
            note,
            siteIcon: site.value,
          },
          subscription?.id,
        );
        notify(
          subscription
            ? "Subscription updated."
            : "Subscription added to your calendar.",
        );
      }}
    >
      <div className="form-section">
        <div className="form-grid">
          <Field label="Subscription name" id="subscription-name" full>
            <input
              id="subscription-name"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Internet, gym, music"
            />
          </Field>
          <Field label="Charge amount (THB)" id="subscription-amount">
            <input
              id="subscription-amount"
              type="number"
              inputMode="decimal"
              min=".01"
              step=".01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Billing cycle" id="subscription-cycle">
            <Select
              id="subscription-cycle"
              label="Billing cycle"
              value={cadence}
              onChange={(value) => setCadence(value as BillingCadence)}
              options={Object.entries(CADENCES).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
          <Field label="First renewal date" id="subscription-date">
            <DatePicker
              id="subscription-date"
              label="First renewal date"
              value={startDate}
              onChange={setStartDate}
            />
          </Field>
          <Field label="Tracking status" id="subscription-status">
            <Select
              id="subscription-status"
              label="Tracking status"
              value={status}
              onChange={(value) => setStatus(value as SubscriptionStatus)}
              options={[
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </Field>
          <Field label="Expense category (optional)" id="subscription-category">
            <Select
              id="subscription-category"
              label="Expense category"
              value={category}
              onChange={setCategory}
              options={[
                { value: "", label: "Uncategorized" },
                ...categories.map((name) => ({ value: name, label: name })),
              ]}
            />
          </Field>
          <Field label="Payment method (optional)" id="subscription-card">
            <Select
              id="subscription-card"
              label="Subscription payment method"
              value={card}
              onChange={setCard}
              options={[
                { value: "", label: "Cash / bank / unspecified" },
                ...model.cards.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Field>
          <Field label="Notes (optional)" id="subscription-note" full>
            <textarea
              id="subscription-note"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Plan details or where to manage billing"
            />
          </Field>
        </div>
        <SiteIconField id="subscription-site" lookup={site} />
        <p className="preview-box">
          {Number(amount) > 0 && Number.isFinite(Number(amount)) && (
            <>
              About{" "}
              <b>
                {baht2(monthlyEquivalent({ amount: Number(amount), cadence }))}{" "}
                / month
              </b>
              .{" "}
            </>
          )}
          Your first date anchors the schedule. Pausing or archiving stops
          reminders here without changing the service or past transactions.
        </p>
      </div>
    </Form>
  );
}

function RenewalDetails({ id, date }: { id: string; date: string }) {
  const { model, store, open, notify, close } = useApp();
  const [existing, setExisting] = useState("");
  const [error, setError] = useState("");
  const renewal = model.renewals.get(id, date);
  if (!renewal)
    return (
      <p className="space-empty-note">
        This date is no longer on the subscription’s schedule.
      </p>
    );
  const { subscription, status, transaction } = renewal;
  const from = addDays(date, -30),
    until = addDays(date, 30);
  const nearby = model.transactions
    .filter(
      (row) =>
        row.source === "local" &&
        !row.renewal &&
        !row.income &&
        row.expense > 0 &&
        row.date >= from &&
        row.date <= until,
    )
    .slice()
    .reverse();
  const setSkipped = (skip: boolean) => {
    try {
      store.setRenewalSkipped(id, date, skip);
      notify(
        skip
          ? "Renewal skipped. No transaction was added."
          : "Renewal put back on the calendar.",
      );
      close();
    } catch (error) {
      setError((error as Error).message);
    }
  };
  return (
    <>
      <div className="renewal-review-head">
        <div className="recurring-icon">
          <RecordIcon
            site={subscription.siteIcon}
            size={24}
            fallback={<Repeat2 size={24} />}
          />
        </div>
        <div>
          <h3>{subscription.name}</h3>
          <p>
            {CADENCES[subscription.cadence]} · {dateText(date, "long")}
          </p>
        </div>
      </div>
      <div className="detail-summary renewal-detail-summary">
        <div>
          <span>Expected charge</span>
          <b>{baht2(subscription.amount)}</b>
        </div>
        <div>
          <span>Status</span>
          <b>
            {status === "recorded"
              ? "Recorded"
              : status === "skipped"
                ? "Skipped"
                : date < Finance.localDate()
                  ? "Not logged"
                  : "Scheduled"}
          </b>
        </div>
        {transaction && (
          <div>
            <span>Recorded charge</span>
            <b>{baht2(transaction.expense)}</b>
          </div>
        )}
      </div>
      <div className="entry-actions renewal-review-actions">
        {transaction && (
          <button
            className="primary"
            onClick={() => open({ kind: "day", date: transaction.date })}
          >
            View recorded entry <ArrowRight size={15} />
          </button>
        )}
        {status === "scheduled" && (
          <>
            <button
              className="primary"
              onClick={() =>
                open({
                  kind: "transaction",
                  type: "expense",
                  renewal: { subscriptionId: id, scheduledFor: date },
                })
              }
            >
              Record charge
            </button>
            <button className="secondary" onClick={() => setSkipped(true)}>
              Skip this date
            </button>
          </>
        )}
        {status === "skipped" && (
          <button className="primary" onClick={() => setSkipped(false)}>
            Restore renewal
          </button>
        )}
        <button
          className="secondary"
          onClick={() => open({ kind: "subscription", subscription })}
        >
          Edit subscription
        </button>
      </div>
      {status === "scheduled" && (
        <details className="renewal-link-picker">
          <summary>Already in your ledger? Link an expense</summary>
          <p className="ledger-hint">
            Choose a local expense within 30 days of the renewal. Linking keeps
            its amount and date as entered.
          </p>
          {nearby.length ? (
            <div className="renewal-link-controls">
              <Select
                label="Existing expense"
                value={existing}
                onChange={setExisting}
                options={[
                  { value: "", label: "Choose an expense" },
                  ...nearby.map((row) => ({
                    value: row.id,
                    label: `${dateText(row.date)} · ${row.note || row.category || "Expense"} · ${baht2(row.expense)}`,
                  })),
                ]}
              />
              <button
                className="secondary"
                disabled={!existing}
                onClick={() => {
                  try {
                    store.linkRenewal(id, date, existing);
                    setError("");
                    notify(
                      "Expense linked. No duplicate transaction was added.",
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                Link expense
              </button>
            </div>
          ) : (
            <p className="ledger-hint">
              No eligible expenses in that date range.
            </p>
          )}
        </details>
      )}
      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function DayDetails({
  date,
  filtered = false,
}: {
  date: string;
  filtered?: boolean;
}) {
  const { model, filters, month, store, open, close, notify } = useApp();
  const rows = (
      filtered
        ? Finance.filter(model.transactions, { ...filters, month }, model.cards)
        : model.transactions
    ).filter((row) => row.date === date),
    sum = Finance.totals(rows);
  const remove = (id: string) => {
    if (
      !window.confirm(
        "Delete this transaction? You can undo this until the next transaction change or reload.",
      )
    )
      return;
    try {
      store.deleteTransaction(id);
      close();
      notify("Transaction deleted.");
    } catch (error) {
      notify((error as Error).message);
    }
  };
  return (
    <>
      <div className="detail-summary">
        <div>
          <span>Date</span>
          <b>{date}</b>
        </div>
        <div>
          <span>Income</span>
          <b>{baht2(sum.income)}</b>
        </div>
        <div>
          <span>Spending</span>
          <b>{baht2(sum.expense)}</b>
        </div>
      </div>
      <p className="ledger-hint">
        {rows.some((row) => row.source === "workbook")
          ? "Workbook entries represent a day’s totals, not individual receipts. Editing preserves separate income and category amounts."
          : "Edit an entry, duplicate a similar purchase, or delete it with Undo available."}
      </p>
      <div className="entry-list">
        {rows.map((row) => {
          const edit = () => open({ kind: "transaction", row }),
            duplicate = () =>
              open({ kind: "transaction", row, duplicate: true });
          return (
            <ContextMenu
              key={row.id}
              items={[
                { label: "Edit transaction", action: edit },
                { label: "Duplicate", action: duplicate },
                {
                  label: "Delete transaction",
                  action: () => remove(row.id),
                  danger: true,
                },
              ]}
            >
              <article
                className="entry-item"
                style={
                  {
                    "--entry-accent":
                      row.income && row.expense
                        ? "#8f79ca"
                        : row.income
                          ? "#2c9b72"
                          : "#df725f",
                  } as React.CSSProperties
                }
              >
                <div className="entry-heading">
                  <span className="entry-symbol" aria-hidden="true">
                    {row.income && row.expense ? "↕" : row.income ? "↗" : "↘"}
                  </span>
                  <strong>
                    {row.source === "workbook"
                      ? "Workbook daily record"
                      : row.income
                        ? "Income"
                        : "Expense"}
                  </strong>
                </div>
                <div className="entry-category-chips">
                  {Object.entries(row.categories || {})
                    .filter(([, value]) => value)
                    .map(([name, value]) => (
                      <span
                        key={name}
                        className="entry-category-chip"
                        style={
                          {
                            "--category-color": model.meta(name).color,
                          } as React.CSSProperties
                        }
                      >
                        {name} <b>{baht2(value)}</b>
                      </span>
                    ))}
                  {!Object.values(row.categories || {}).some(Boolean) && (
                    <span className="entry-category-chip">
                      {row.category || "Uncategorized"}
                    </span>
                  )}
                </div>
                <p>
                  {row.note || "No note"}
                  {row.card
                    ? ` · ${model.cards.find((card) => card.id === row.card)?.name || "Card"}`
                    : ""}
                </p>
                <div className="entry-amounts">
                  {row.income > 0 && (
                    <span className="positive">
                      Income +{baht2(row.income)}
                    </span>
                  )}
                  {row.expense > 0 && (
                    <span className="negative">
                      Spending −{baht2(row.expense)}
                    </span>
                  )}
                </div>
                <div className="entry-actions">
                  <button className="edit-row" onClick={edit}>
                    Edit
                  </button>
                  <button className="secondary" onClick={duplicate}>
                    Duplicate
                  </button>
                  <button
                    className="secondary danger"
                    onClick={() => remove(row.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            </ContextMenu>
          );
        })}
      </div>
    </>
  );
}
function CardForm({ card, kind }: { card?: Card; kind?: "credit" | "cash" }) {
  const { store, notify } = useApp();
  const [name, setName] = useState(card?.name || ""),
    [last4, setLast4] = useState(card?.last4 || ""),
    [cardKind, setKind] = useState(card?.kind || kind || "credit");
  const [due, setDue] = useState(
      String(card?.dueDay || Number(card?.paymentDue?.slice(8, 10)) || ""),
    ),
    [status, setStatus] = useState(card?.status || "Active"),
    [network, setNetwork] = useState(
      isCardNetwork(card?.network) ? card.network : "mastercard",
    ),
    [color, setColor] = useState(card?.color || COLORS[0]),
    [color2, setColor2] = useState(card?.color2 || "#17211F");
  const preview = {
    name,
    last4,
    kind: cardKind,
    status,
    network,
    color: normalizeColor(color) || "#7460DC",
    color2: normalizeColor(color2) || "#17211F",
  };
  return (
    <Form
      save={() => {
        store.saveCard({
          ...card,
          ...preview,
          id: card?.id || "",
          color,
          color2,
          dueDay: due ? Number(due) : null,
          paymentDue: null,
        });
        notify("Card saved.");
      }}
    >
      <div className="form-section">
        <h4>CARD DETAILS</h4>
        <div className="form-grid">
          <Field label="Card name" id="name">
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. My everyday card"
            />
          </Field>
          <Field label="Last 4 digits" id="last4">
            <input
              id="last4"
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
              maxLength={4}
              inputMode="numeric"
              placeholder="1234"
            />
          </Field>
          <Field label="Card type" id="card-kind">
            <Select
              id="card-kind"
              label="Card type"
              value={cardKind}
              onChange={(value) => setKind(value as "credit" | "cash")}
              options={[
                { value: "credit", label: "Credit card" },
                { value: "cash", label: "Cash card" },
              ]}
            />
          </Field>
          <Field label="Payment due day (optional)" id="due">
            <NumberField
              id="due"
              label="payment due day"
              min={1}
              max={31}
              value={due}
              onChange={setDue}
            />
          </Field>
          <Field label="Status" id="status">
            <Select
              id="status"
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                ...new Set(["Active", "Plan", "Completed", status]),
              ].map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Card network" id="card-network">
            <Select
              id="card-network"
              label="Card network"
              value={network}
              onChange={(next) => {
                if (isCardNetwork(next)) setNetwork(next);
              }}
              options={Object.entries(CARD_NETWORKS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
        </div>
        <div className="card-preview-wrap">
          <span>LIVE PREVIEW</span>
          <CardPreview card={preview} />
        </div>
        <div className="gradient-heading">
          <h4>TWO-COLOR GRADIENT</h4>
          <p>Choose a start and end color to make this card yours.</p>
        </div>
        <div className="card-gradient-editors">
          <ColorPicker
            id="card-color-hex"
            label="Gradient start"
            value={color}
            onChange={setColor}
          />
          <ColorPicker
            id="card-color-hex-end"
            label="Gradient end"
            value={color2}
            onChange={setColor2}
          />
        </div>
      </div>
    </Form>
  );
}
function PlanForm({ plan }: { plan?: Plan }) {
  const { store, model, notify } = useApp();
  const [name, setName] = useState(plan?.name || ""),
    [amount, setAmount] = useState(String(plan?.amount || "")),
    [months, setMonths] = useState(plan?.months || 10),
    [rate, setRate] = useState(plan?.rate || 0),
    [status, setStatus] = useState(plan?.status || "Ongoing"),
    [start, setStart] = useState(
      plan?.startMonth || Finance.localDate().slice(0, 7),
    ),
    [paid, setPaid] = useState(String(plan?.paidMonths || 0)),
    [card, setCard] = useState(plan?.card || "");
  const [appearance, setAppearance] = useState<PlanAppearanceState>({
    glyph: glyphForPlan(plan),
    coverPhoto: isPlanCover(plan?.coverPhoto) ? plan.coverPhoto : undefined,
    coverFrame: isCoverFrame(plan?.coverFrame) ? plan.coverFrame : undefined,
  });
  const [preparing, setPreparing] = useState(false);
  const site = useSiteIcon(plan?.siteIcon);
  const calc = calcPlan(Number(amount) || 0, months, rate);
  return (
    <Form
      pending={
        preparing
          ? "Preparing photo…"
          : site.pending
            ? "Looking up icon…"
            : undefined
      }
      save={() => {
        if (site.invalid)
          throw Error("Enter a public website or clear the website field.");
        store.savePlan({
          ...appearance,
          siteIcon: site.value,
          id: plan?.id || "",
          name,
          amount: Number(amount),
          months,
          rate,
          status,
          startMonth: start,
          paidMonths: Number(paid),
          card,
          monthly: calc.monthly,
          total: calc.total,
        });
        notify("Installment plan saved.");
      }}
    >
      <div className="form-section">
        <h4>INSTALLMENT DETAILS</h4>
        <div className="form-grid">
          <Field label="Purchase name" id="name" full>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Original amount (THB)" id="plan-amount">
            <input
              id="plan-amount"
              type="number"
              inputMode="decimal"
              min=".01"
              step=".01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Term" id="months">
            <Select
              id="months"
              label="Term"
              value={String(months)}
              onChange={(value) => setMonths(Number(value))}
              options={TERMS.map((value) => ({
                value: String(value),
                label: `${value} mo`,
              }))}
            />
          </Field>
          <Field label="Interest rate / month" id="rate">
            <Select
              id="rate"
              label="Interest rate / month"
              value={String(rate)}
              onChange={(value) => setRate(Number(value))}
              options={RATES.map((value) => ({
                value: String(value),
                label: `${value}%`,
              }))}
            />
          </Field>
          <Field label="Monthly w/o interest" id="monthly-no">
            <input id="monthly-no" value={calc.no.toFixed(2)} readOnly />
          </Field>
          <Field label="Monthly with interest" id="monthly">
            <input id="monthly" value={calc.monthly.toFixed(2)} readOnly />
          </Field>
          <Field label="Total with interest" id="total">
            <input id="total" value={calc.total.toFixed(2)} readOnly />
          </Field>
          <Field label="First payment month" id="plan-start">
            <DatePicker
              id="plan-start"
              label="First payment month"
              mode="month"
              value={start}
              onChange={setStart}
            />
          </Field>
          <Field label="Payments already made" id="plan-paid">
            <NumberField
              id="plan-paid"
              label="payments made"
              min={0}
              max={months}
              value={paid}
              onChange={setPaid}
            />
          </Field>
          <Field label="Linked card (optional)" id="plan-card">
            <Select
              id="plan-card"
              label="Linked card (optional)"
              value={card}
              onChange={setCard}
              options={[
                { value: "", label: "No card" },
                ...model.cards.map((card) => ({
                  value: card.id,
                  label: card.name,
                })),
              ]}
            />
          </Field>
          <Field label="Status" id="status">
            <Select
              id="status"
              label="Status"
              value={status}
              onChange={setStatus}
              options={["Ongoing", "Plan", "Completed"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
        </div>
        <p className="preview-box">
          Flat monthly interest: amount ÷ term + amount × rate / 100. Progress
          does not create an expense; record actual payments in Transactions.
        </p>
      </div>
      <PlanAppearance
        value={appearance}
        onChange={setAppearance}
        color={safeColor(
          model.cards.find((item) => item.id === card)?.color,
          "#9b8cdb",
        )}
        preparing={preparing}
        onPreparing={setPreparing}
        site={site}
      />
    </Form>
  );
}
export function PlanDetails({ plan }: { plan: Plan }) {
  const calc = calcPlan(plan.amount, plan.months, plan.rate),
    progress = planProgress(plan);
  return (
    <>
      <div className="detail-summary">
        <div>
          <span>Purchase</span>
          <b className="record-reference-name">
            <PlanIcon plan={plan} size={17} />
            {plan.name}
          </b>
        </div>
        <div>
          <span>Status</span>
          <b>{plan.status}</b>
        </div>
        <div>
          <span>Progress</span>
          <b>
            {progress.paid} / {plan.months} payments
          </b>
        </div>
      </div>
      <div className="detail-metrics">
        {[
          ["Original amount", baht2(plan.amount)],
          ["Interest rate", `${plan.rate}% / month`],
          ["Monthly w/o interest", baht2(calc.no)],
          ["Monthly with interest", baht2(calc.monthly)],
          ["Total interest", baht2(calc.interest * plan.months)],
          [
            "Remaining planned payments",
            baht2(calc.monthly * progress.remaining),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <p className="ledger-hint">
        Progress is tracked manually and does not post expenses automatically.
      </p>
    </>
  );
}
function CategoryForm({ original }: { original?: string }) {
  const { store, model, notify } = useApp(),
    info = original
      ? model.meta(original)
      : {
          type: "Expense" as const,
          color: COLORS[model.categories.length % COLORS.length],
        };
  const [name, setName] = useState(original || ""),
    [type, setType] = useState(info.type),
    [color, setColor] = useState(info.color);
  return (
    <Form
      save={() => {
        store.saveCategory(name, { type, color }, original);
        notify("Category saved.");
      }}
    >
      <div className="form-section">
        <div className="form-grid">
          <Field label="Category name" id="name" full>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Type" id="type" full>
            <Select
              id="type"
              label="Type"
              value={type}
              onChange={(value) => setType(value as CategoryMeta["type"])}
              options={["Expense", "Income", "Both"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
        </div>
        <ColorPicker
          id="card-color-hex"
          label="Category color"
          value={color}
          onChange={setColor}
        />
        <p className="ledger-hint">
          Renaming updates the category shown on existing transactions.
        </p>
      </div>
    </Form>
  );
}
function BudgetForm() {
  const { state, store, month, notify } = useApp(),
    [amount, setAmount] = useState(String(state.budgets[month] || ""));
  return (
    <Form
      save={() => {
        store.setBudget(month, Number(amount));
        notify("Monthly budget saved.");
      }}
    >
      <Field
        label={`Spending limit (THB) · ${monthText(month)}`}
        id="monthly-budget"
      >
        <input
          id="monthly-budget"
          type="number"
          inputMode="decimal"
          min="0"
          step=".01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <p className="ledger-hint">
        Compare recorded expenses with your limit. Enter 0 to remove this
        month’s budget.
      </p>
    </Form>
  );
}
function ClearForm() {
  const { state, store, navigate, setMonth, setCardMonth, setFilters, notify } =
      useApp(),
    [confirmation, setConfirmation] = useState(""),
    [backupError, setBackupError] = useState("");
  return (
    <Form
      label="Clear all data"
      save={() => {
        store.clear(confirmation.trim());
        setMonth(Finance.localDate().slice(0, 7));
        setCardMonth(Finance.localDate().slice(0, 7));
        setFilters(EMPTY_FILTERS);
        navigate("overview");
        notify(
          "Fresh ledger ready. Add your first category, card, or transaction.",
        );
      }}
    >
      <div className="reset-summary">
        <p>
          This clears all transactions, credit and cash cards, installment
          plans, categories, budgets, and workbook edits saved for this site in
          this browser.
        </p>
        <p>
          The old workbook history stays excluded after reload. Your source
          Excel file is unchanged. Save a backup first if you want to restore
          this workspace later.
        </p>
        <button
          className="secondary"
          type="button"
          onClick={() =>
            void saveBackup(state).catch((error) =>
              setBackupError(error.message),
            )
          }
        >
          Download backup first
        </button>
        {backupError && <p role="alert">{backupError}</p>}
      </div>
      <Field label="Type CLEAR to confirm" id="clear-confirmation">
        <input
          id="clear-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
    </Form>
  );
}
function PreferencesForm() {
  const { state, store } = useApp(),
    [name, setName] = useState(state.workspace.profile?.name || ""),
    [density, setDensity] = useState(state.workspace.density || "comfortable"),
    [mode, setMode] = useState(state.workspace.motion || "full");
  return (
    <Form
      save={() =>
        store.commit({
          workspace: {
            ...state.workspace,
            profile: { name: name.trim() },
            density,
            motion: mode,
          },
        })
      }
    >
      <div className="space-profile-form">
        <div className="space-profile-badge">
          <Wallet />
          <span>Moneywise personal</span>
        </div>
        <Field label="Your name or workspace name" id="space-profile-name">
          <input
            id="space-profile-name"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            autoComplete="nickname"
            placeholder="e.g. My everyday money"
          />
        </Field>
        <Field label="Reading comfort" id="space-density">
          <Select
            id="space-density"
            label="Reading comfort"
            value={density}
            onChange={(value) => setDensity(value as typeof density)}
            options={[
              {
                value: "comfortable",
                label: "Comfortable · larger text and spacing",
              },
              { value: "compact", label: "Compact · more on screen" },
            ]}
          />
        </Field>
        <Field label="Motion preference" id="space-motion">
          <Select
            id="space-motion"
            label="Motion preference"
            value={mode}
            onChange={(value) => setMode(value as typeof mode)}
            options={[
              { value: "full", label: "Fluid animations" },
              { value: "reduced", label: "Calm · reduced motion" },
            ]}
          />
        </Field>
        <p className="space-profile-note">
          <ShieldCheck /> Your entries stay in this browser. Use Save data to
          take a backup with you.
        </p>
      </div>
    </Form>
  );
}
function DataSettings() {
  const { state, model, open } = useApp();
  return (
    <>
      <div className="detail-summary">
        <div>
          <span>Workspace</span>
          <b>
            {state.workspace.mode === "fresh"
              ? "Personal ledger"
              : "Workbook + personal entries"}
          </b>
        </div>
        <div>
          <span>Transactions</span>
          <b>{model.transactions.length}</b>
        </div>
        <div>
          <span>Cards</span>
          <b>{model.cards.length}</b>
        </div>
      </div>
      <p className="ledger-hint">
        Save data keeps your workspace mode, transactions, cards, plans,
        categories, subscriptions, linked renewals, budgets, pins, and
        preferences in a portable backup. Browser data does not sync between
        devices.
      </p>
      <div className="entry-actions">
        <button
          className="primary"
          onClick={() => document.getElementById("save-backup-button")?.click()}
        >
          Save data
        </button>
        <button
          className="secondary"
          onClick={() => document.getElementById("load-backup-button")?.click()}
        >
          Load data
        </button>
        <button
          className="secondary danger-button"
          onClick={() => open({ kind: "clear" })}
        >
          Clear data & start fresh
        </button>
      </div>
    </>
  );
}
function Reminders() {
  const { model, state, open, navigate } = useApp(),
    month = Finance.localDate().slice(0, 7),
    sum = Finance.totals(
      model.transactions.filter((row) => row.date.startsWith(month)),
    ),
    budget = state.budgets[month] || 0,
    dues = model.upcoming().slice(0, 6),
    renewals = model.renewals.upcoming(Finance.localDate(), 14).slice(0, 6);
  return (
    <div className="space-notifications">
      {budget > 0 && sum.expense >= budget && (
        <div className="space-notification">
          <Wallet />
          <div>
            <strong>Monthly budget reached</strong>
            <p>
              {baht2(sum.expense)} recorded against {baht2(budget)}.
            </p>
          </div>
        </div>
      )}
      {dues.map((card) => (
        <button
          key={card.id}
          className="space-notification"
          onClick={() => {
            open({ kind: "card", card });
            navigate("cards");
          }}
        >
          <CreditCard />
          <span>
            <strong>{card.name}</strong>
            <small>Payment reminder · {card.date}</small>
          </span>
          <ArrowRight />
        </button>
      ))}
      {renewals.map(({ subscription, date }) => (
        <button
          key={`${subscription.id}:${date}`}
          className="space-notification"
          onClick={() =>
            open({ kind: "renewal", subscriptionId: subscription.id, date })
          }
        >
          <RecordIcon
            site={subscription.siteIcon}
            size={19}
            fallback={<Repeat2 />}
          />
          <span>
            <strong>{subscription.name}</strong>
            <small>
              Renewal · {dateText(date)} · {baht2(subscription.amount)}
            </small>
          </span>
          <ArrowRight />
        </button>
      ))}
      {!dues.length && !renewals.length && (
        <div className="space-empty-note">
          No upcoming card due dates or subscription renewals.
        </div>
      )}
      <p className="ledger-hint">
        Due-date reminders do not confirm a bill amount or post a payment.
      </p>
    </div>
  );
}
