import {
  Fragment,
  useEffect,
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
  Search,
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
  signedMoney,
  TERMS,
} from "../lib/finance";
import type {
  Card,
  CategoryMeta,
  DialogState,
  Plan,
  Transaction,
  TransactionType,
  View,
} from "../types";
import { saveBackup } from "../lib/files";
import { ColorPicker } from "./ColorPicker";
import { Select } from "./ui/select";
import { ContextMenu } from "./ui/menus";
import { CardPreview } from "./shadcnspace/WalletCard";
const labels: Record<DialogState["kind"], [string, string]> = {
  transaction: [
    "Add transaction",
    "Record spending or income. Your summaries update immediately.",
  ],
  day: ["Day details", "Every recorded transaction for this date."],
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
    "Find your way",
    "Search transactions, cards, plans, and categories.",
  ],
  reminders: ["Your reminders", "Useful nudges from your own ledger."],
};
export function Dialogs() {
  const { dialog, close, calm } = useApp();
  const returnFocus = useRef<HTMLElement | null>(null);
  const Presence = calm ? Fragment : AnimatePresence;
  let title = dialog ? labels[dialog.kind][0] : "";
  if (dialog?.kind === "card" && dialog.card) title = "Edit card";
  if (dialog?.kind === "plan" && dialog.plan) title = "Edit installment plan";
  if (dialog?.kind === "category" && dialog.name) title = "Edit category";
  if (dialog?.kind === "transaction")
    title = dialog.row
      ? dialog.duplicate
        ? "Duplicate transaction"
        : "Edit transaction"
      : dialog.type
        ? `Add ${dialog.type}`
        : "Add transaction";
  const key =
    dialog?.kind === "transaction"
      ? `transaction-${dialog.row?.id || "new"}-${dialog.duplicate}`
      : dialog?.kind === "card"
        ? `card-${dialog.card?.id || "new"}`
        : dialog?.kind === "plan"
          ? `plan-${dialog.plan?.id || "new"}`
          : dialog?.kind === "category"
            ? `category-${dialog.name || "new"}`
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
                className="modal-backdrop is-open react-backdrop"
                initial={calm ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: calm ? 0 : 0.15 }}
              >
                <Primitive.Content
                  forceMount
                  asChild
                  onOpenAutoFocus={() => {
                    returnFocus.current = document.activeElement as HTMLElement;
                  }}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    const target = returnFocus.current?.isConnected
                      ? returnFocus.current
                      : document.querySelector<HTMLElement>(".nav-item.active");
                    target?.focus();
                  }}
                >
                  <motion.div
                    className="modal react-modal"
                    initial={calm ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      calm ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }
                    }
                    transition={
                      calm
                        ? { duration: 0.08 }
                        : { type: "spring", bounce: 0, duration: 0.32 }
                    }
                  >
                    <div className="modal-head">
                      <div>
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
                    <div key={key}>
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
    case "card":
      return <CardForm card={dialog.card} kind={dialog.cardKind} />;
    case "plan":
      return <PlanForm plan={dialog.plan} />;
    case "planDetail":
      return <PlanDetails plan={dialog.plan} />;
    case "category":
      return <CategoryForm original={dialog.name} />;
    case "budget":
      return <BudgetForm />;
    case "settings":
      return <DataSettings />;
    case "clear":
      return <ClearForm />;
    case "preferences":
      return <PreferencesForm />;
    case "search":
      return <GlobalSearch />;
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
}: {
  children: ReactNode;
  save: () => void;
  label?: string;
}) {
  const { close } = useApp(),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
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
        >
          {label}
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
  const aggregate = Boolean(
    row &&
    (row.source === "workbook" ||
      Object.keys(row.categories || {}).length > 1 ||
      (row.income && row.expense)),
  );
  const [date, setDate] = useState(
      row?.date || dialog.date || Finance.localDate(),
    ),
    [type, setType] = useState<TransactionType>(
      dialog.type || (row?.income && !row.expense ? "income" : "expense"),
    );
  const [amount, setAmount] = useState(
      String(row?.income || row?.expense || ""),
    ),
    [income, setIncome] = useState(String(row?.income || 0)),
    [expense, setExpense] = useState(String(row?.expense || 0));
  const [category, setCategory] = useState(
      row?.category ||
        Object.keys(row?.categories || {}).find(
          (name) => row?.categories[name],
        ) ||
        "",
    ),
    [card, setCard] = useState(row?.card || dialog.card || ""),
    [note, setNote] = useState(row?.note || "");
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
          },
          row?.id,
          dialog.duplicate,
        );
        transactionSaved(saved.date);
        notify("Transaction saved.");
      }}
    >
      <div
        className="form-section"
        data-transaction-form
        data-aggregate={aggregate}
      >
        <div className="form-grid">
          <Field label="Date" id="date">
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          {aggregate ? (
            <>
              <Field label="Income (THB)" id="income">
                <input
                  id="income"
                  type="number"
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
    [color, setColor] = useState(card?.color || COLORS[0]),
    [color2, setColor2] = useState(card?.color2 || "#17211F");
  const preview = {
    name,
    last4,
    kind: cardKind,
    status,
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
            <input
              id="due"
              type="number"
              min="1"
              max="31"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </Field>
          <Field label="Status" id="status" full>
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
  const calc = calcPlan(Number(amount) || 0, months, rate);
  return (
    <Form
      save={() => {
        store.savePlan({
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
            <input
              id="plan-start"
              type="month"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </Field>
          <Field label="Payments already made" id="plan-paid">
            <input
              id="plan-paid"
              type="number"
              min="0"
              max={months}
              value={paid}
              onChange={(event) => setPaid(event.target.value)}
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
          <b>{plan.name}</b>
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
        categories, budgets, pins, and preferences in a portable backup. Browser
        data does not sync between devices.
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
    dues = model.upcoming().slice(0, 6);
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
      {!dues.length && (
        <div className="space-empty-note">
          No card due dates yet. Add a due day to a card to see reminders here.
        </div>
      )}
      <p className="ledger-hint">
        Due-date reminders do not confirm a bill amount or post a payment.
      </p>
    </div>
  );
}
function GlobalSearch() {
  const {
      model,
      open,
      close,
      navigate,
      setMonth,
      setFilters,
      setTxMode,
      setPage,
    } = useApp(),
    [query, setQuery] = useState(""),
    input = useRef<HTMLInputElement>(null),
    results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const q = query.trim().toLowerCase();
  const entries: { title: string; sub: string; action: () => void }[] = [];
  for (const [view, title] of [
    ["overview", "Overview"],
    ["transactions", "Transactions"],
    ["cards", "Cards"],
    ["installments", "Installments"],
    ["categories", "Categories"],
  ] as [View, string][])
    if (!q || title.toLowerCase().includes(q))
      entries.push({
        title,
        sub: "Go to page",
        action: () => {
          close();
          navigate(view);
        },
      });
  if (q) {
    model.transactions
      .filter((row) =>
        [row.note, row.date, row.category, ...Object.keys(row.categories || {})]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(-8)
      .reverse()
      .forEach((row) =>
        entries.push({
          title: row.note || row.category || row.date,
          sub: `${row.date} · ${signedMoney(row.income - row.expense)}`,
          action: () => {
            close();
            setMonth(row.date.slice(0, 7));
            setFilters({ query: row.date, type: "", category: "", card: "" });
            setTxMode("day");
            setPage(0);
            navigate("transactions");
          },
        }),
      );
    model.cards
      .filter((card) => `${card.name} ${card.last4}`.toLowerCase().includes(q))
      .forEach((card) =>
        entries.push({
          title: card.name,
          sub: `${card.kind === "cash" ? "Cash" : "Credit"} card · •••• ${card.last4}`,
          action: () => {
            close();
            navigate("cards");
            requestAnimationFrame(() =>
              document
                .getElementById(`wallet-${card.id}`)
                ?.scrollIntoView({ block: "center" }),
            );
          },
        }),
      );
    model.plans
      .filter((plan) => plan.name.toLowerCase().includes(q))
      .forEach((plan) =>
        entries.push({
          title: plan.name,
          sub: `${baht2(plan.monthly)} / month`,
          action: () => open({ kind: "planDetail", plan }),
        }),
      );
    model.categories
      .filter((name) => name.toLowerCase().includes(q))
      .forEach((name) =>
        entries.push({
          title: name,
          sub: model.meta(name).type,
          action: () => {
            close();
            navigate("categories");
          },
        }),
      );
  }
  return (
    <>
      <div className="space-command-field">
        <Search />
        <input
          ref={input}
          id="space-command-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try groceries, a card, or a purchase…"
          aria-label="Search all your finances"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              results.current?.querySelector("button")?.focus();
            }
          }}
        />
      </div>
      <div
        ref={results}
        className="space-command-results"
        aria-live="polite"
        onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...results.current!.querySelectorAll("button")],
            at = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[
            (at + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
              buttons.length
          ]?.focus();
        }}
      >
        {entries.slice(0, 16).map((entry, index) => (
          <button
            className="space-command-result"
            key={`${entry.title}-${index}`}
            onClick={entry.action}
          >
            <span className="space-tile violet">
              <Search />
            </span>
            <span>
              <strong>{entry.title}</strong>
              <small>{entry.sub}</small>
            </span>
            <ArrowRight />
          </button>
        ))}
        {!entries.length && (
          <p className="space-empty-note">
            No matches yet. Try another note, name, or date.
          </p>
        )}
      </div>
      <div className="space-command-footer">
        <span>↑ ↓ to move · Enter to open</span>
        <kbd>esc</kbd>
      </div>
    </>
  );
}
