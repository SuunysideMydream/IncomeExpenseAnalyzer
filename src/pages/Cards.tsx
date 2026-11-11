import { useEffect } from "react";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { useApp } from "../context";
import { baht2, Finance, monthText } from "../lib/finance";
import { MonthPicker } from "../components/common";
import { WalletCard } from "../components/shadcnspace/WalletCard";
export default function Cards() {
  const {
      model,
      cardMonth,
      setCardMonth,
      open,
      cardActivity,
      openCalendar,
      walletJump,
    } = useApp(),
    rows = model.transactions.filter(
      (row) => row.date.startsWith(cardMonth) && row.card && row.expense > 0,
    ),
    sum = Finance.totals(rows);
  useEffect(() => {
    if (!walletJump) return;
    document
      .getElementById(`wallet-${walletJump.id}`)
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [walletJump]);
  const showCalendar = () => {
    const today = Finance.localDate();
    openCalendar(
      today.startsWith(cardMonth) ? today : `${cardMonth}-01`,
      "cards",
    );
  };
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Your card wallet</h2>
          <p className="period">Credit cards and cash cards in one place</p>
        </div>
        <div className="wallet-toolbar-actions">
          <MonthPicker
            value={cardMonth}
            onChange={setCardMonth}
            label="Wallet month"
          />
          <button
            className="secondary wallet-calendar-shortcut"
            onClick={showCalendar}
          >
            <CalendarDays size={16} /> Calendar
          </button>
          <button className="primary" onClick={() => open({ kind: "card" })}>
            <Plus size={16} /> Add card
          </button>
        </div>
      </div>
      {(["credit", "cash"] as const).map((kind) => {
        const cards = model.cards.filter((card) => card.kind === kind);
        return (
          <section
            className="wallet-section"
            aria-labelledby={`wallet-${kind}-title`}
            key={kind}
          >
            <div className="wallet-section-head">
              <div>
                <h3 id={`wallet-${kind}-title`}>
                  {kind === "credit" ? "Credit cards" : "Cash cards"}{" "}
                  <span>{cards.length}</span>
                </h3>
                <p>
                  {kind === "credit"
                    ? "Purchases and payment reminders for your credit cards."
                    : "Keep your cash-card purchases together in one place."}
                </p>
              </div>
              <button
                className="secondary"
                onClick={() => open({ kind: "card", cardKind: kind })}
              >
                <Plus size={14} /> Add {kind === "credit" ? "credit" : "cash"}{" "}
                card
              </button>
            </div>
            {cards.length ? (
              <div
                className={`card-wallet ${cards.length === 1 ? "wallet-with-insights" : ""}`}
              >
                {cards.map((card) => (
                  <WalletCard card={card} key={card.id} />
                ))}
                {cards.length === 1 && <WalletActivity id={cards[0].id} />}
              </div>
            ) : (
              <div className="wallet-empty">
                No {kind === "credit" ? "credit" : "cash"} cards yet. Add one to
                start tracking its spending.
              </div>
            )}
          </section>
        );
      })}
      <section className="card wallet-spending-summary">
        <div className="toolbar">
          <div>
            <h3>Card spending</h3>
            <p className="period">
              Recorded purchases · {monthText(cardMonth)}
            </p>
          </div>
          <button className="secondary" onClick={showCalendar}>
            <CalendarDays size={17} /> Open card calendar
          </button>
        </div>
        <div className="card-report">
          <div>
            <span>Recorded card purchases</span>
            <strong>{baht2(sum.expense)}</strong>
          </div>
          <div>
            <span>Purchase records</span>
            <strong>{rows.length}</strong>
          </div>
          <div>
            <span>Cards used</span>
            <strong>{new Set(rows.map((row) => row.card)).size}</strong>
          </div>
        </div>
        <div className="card-spend-summary">
          {model.cards.map((card) => (
            <button
              className="spend-chip"
              key={card.id}
              onClick={() => cardActivity(card.id, cardMonth)}
            >
              <i
                style={{
                  background: card.color,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                }}
              />
              {card.name}{" "}
              <b>
                {baht2(
                  Finance.totals(rows.filter((row) => row.card === card.id))
                    .expense,
                )}
              </b>{" "}
              →
            </button>
          ))}
        </div>
        <p className="ledger-hint">
          Open Calendar to see individual purchases and due dates, or add an
          expense on a specific day.
        </p>
      </section>
    </>
  );
}

function WalletActivity({ id }: { id: string }) {
  const { model, cardMonth, open, cardActivity } = useApp();
  const rows = model.transactions.filter(
    (row) =>
      row.card === id && row.date.startsWith(cardMonth) && row.expense > 0,
  );
  const days = new Map(Finance.daily(rows).map((row) => [row.date, row]));
  const count = new Date(
    Number(cardMonth.slice(0, 4)),
    Number(cardMonth.slice(5, 7)),
    0,
  ).getDate();
  const max = Math.max(
    1,
    ...Array.from(days.values()).map((row) => row.expense),
  );
  const recent = rows
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <div className="wallet-activity" aria-label="Selected month card activity">
      <div className="wallet-activity-heading">
        <div>
          <span className="studio-eyebrow">{monthText(cardMonth)}</span>
          <h4>Recorded purchases</h4>
        </div>
        <strong>{baht2(Finance.totals(rows).expense)}</strong>
      </div>
      {recent.length ? (
        <>
          <svg
            className="wallet-activity-bars"
            viewBox={`0 0 ${count * 10} 70`}
            role="img"
            aria-label="Daily recorded purchases for this card"
          >
            <line x1="0" x2={count * 10} y1="65" y2="65" stroke="var(--line)" />
            {Array.from({ length: count }, (_, index) => {
              const date = `${cardMonth}-${String(index + 1).padStart(2, "0")}`,
                amount = days.get(date)?.expense || 0,
                height = (amount / max) * 53;
              return (
                <rect
                  key={date}
                  x={index * 10 + 1}
                  y={65 - height}
                  width={6}
                  height={height}
                  rx={2}
                  fill="var(--primary)"
                  opacity={0.65}
                >
                  <title>
                    {date}: {baht2(amount)}
                  </title>
                </rect>
              );
            })}
          </svg>
          <div className="wallet-activity-rows">
            {recent.map((row) => (
              <button
                key={row.id}
                onClick={() => open({ kind: "day", date: row.date })}
              >
                <span>
                  <strong>{row.note || row.category || "Card purchase"}</strong>
                  <small>{row.date}</small>
                </span>
                <b>{baht2(row.expense)}</b>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="wallet-activity-empty">
          No purchases recorded this month. Select this card when adding an
          expense to see its activity here.
        </p>
      )}
      <button
        className="link-button"
        onClick={() => cardActivity(id, cardMonth)}
      >
        View card activity <ArrowRight size={14} />
      </button>
    </div>
  );
}
