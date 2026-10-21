// Adapted from Assets/shadcnspace asset/credit-card-new-design.tsx.
import { useState } from "react";
import {
  motion,
  useMotionTemplate,
  useSpring,
  type MotionValue,
} from "motion/react";
import { ArrowRight, Eye, EyeOff, Pencil, Plus, Repeat2 } from "lucide-react";
import { useApp } from "../../context";
import {
  baht2,
  dueDateForMonth,
  Finance,
  monthText,
  safeColor,
} from "../../lib/finance";
import type { Card as CardType } from "../../types";
export const cardBackground = (card: Partial<CardType>) =>
  `linear-gradient(0deg,rgba(0,0,0,.28),transparent 85%),linear-gradient(135deg,${safeColor(card.color, "#2C9B72")},${safeColor(card.color2, "#17211F")})`;
export function ChipSVG() {
  return (
    <svg
      className="space-chip-svg"
      width="44"
      height="34"
      viewBox="0 0 44 34"
      fill="none"
      aria-hidden="true"
    >
      <rect width="44" height="34" rx="5" fill="#C9963A" />
      <rect x="14" width="16" height="34" fill="#B8852A" />
      <rect y="11" width="44" height="12" fill="#B8852A" />
      <rect x="14" y="11" width="16" height="12" fill="#E0B060" />
      <path
        d="M14 0v11m16-11v11M14 23v11m16-11v11M0 11h14M0 23h14m16-12h14M30 23h14"
        stroke="#9A6E1A"
        strokeWidth=".6"
      />
    </svg>
  );
}
function CardFront({
  card,
  amount,
  preview = false,
  revealed = false,
  toggle,
  highlight,
}: {
  card: Partial<CardType>;
  amount: number;
  preview?: boolean;
  revealed?: boolean;
  toggle?: () => void;
  highlight?: MotionValue<string>;
}) {
  return (
    <div
      id={preview ? "card-preview" : undefined}
      className={`credit-card space-card-front ${card.kind === "cash" ? "cash-card" : ""} ${preview ? "mini-card" : ""}`}
      style={{ background: cardBackground(card) }}
    >
      <span className="card-sheen" aria-hidden="true" />
      {highlight && (
        <motion.span
          className="wallet-pointer-light"
          aria-hidden="true"
          style={{ background: highlight }}
        />
      )}
      <div className="space-card-top">
        <div>
          <span className="wallet-type-label">
            {card.kind === "cash" ? "Cash card" : "Credit card"}
          </span>
          <b>{card.name || "Your card"}</b>
        </div>
        <div className="space-card-purchase">
          <small>Recorded purchases</small>
          <div>
            <strong data-card-purchase-value>
              {preview ? "Preview" : revealed ? baht2(amount) : "••••••"}
            </strong>
            {!preview && (
              <button
                className="space-card-control"
                aria-label={
                  revealed
                    ? "Hide recorded purchases"
                    : "Show recorded purchases"
                }
                onClick={toggle}
              >
                {revealed ? <EyeOff /> : <Eye />}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="space-card-middle">
        <div className="card-chip">
          <ChipSVG />
        </div>
        <svg
          className="space-contactless"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M8 8a7 7 0 0 1 0 8m4-11a12 12 0 0 1 0 14m4-17a17 17 0 0 1 0 20" />
        </svg>
      </div>
      <div className="card-number">
        •••• &nbsp; •••• &nbsp; {card.last4 || "1234"}
      </div>
      <div className="card-footer">
        <div>
          <span>STATUS</span>
          <b>{preview ? "Your design, your way" : card.status || "Active"}</b>
        </div>
        <span className="space-card-network" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
export function CardPreview({ card }: { card: Partial<CardType> }) {
  return <CardFront card={card} amount={0} preview />;
}
export function WalletCard({ card }: { card: CardType }) {
  const { model, cardMonth, calm, open, cardActivity } = useApp();
  const [flipped, setFlipped] = useState(false),
    [revealed, setRevealed] = useState(false);
  const lightX = useSpring(50, { stiffness: 180, damping: 26 }),
    lightY = useSpring(30, { stiffness: 180, damping: 26 });
  const highlight = useMotionTemplate`radial-gradient(240px circle at ${lightX}% ${lightY}%, #ffffff30, transparent 70%)`;
  const amount = Finance.totals(
      model.transactions.filter(
        (row) => row.card === card.id && row.date.startsWith(cardMonth),
      ),
    ).expense,
    due = dueDateForMonth(card, cardMonth);
  return (
    <motion.article
      layout={!calm}
      className={`space-payment-card react-wallet ${flipped ? "is-flipped" : ""}`}
      id={`wallet-${card.id}`}
      data-space-card={card.id}
      onPointerMove={(event) => {
        if (calm || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        lightX.set(((event.clientX - rect.left) / rect.width) * 100);
        lightY.set(((event.clientY - rect.top) / rect.height) * 100);
      }}
      onPointerLeave={() => {
        lightX.set(50);
        lightY.set(30);
      }}
      initial={calm ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
    >
      <motion.div
        className="space-card-rotator"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={
          calm ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.55 }
        }
      >
        <div className="react-card-face" inert={flipped} aria-hidden={flipped}>
          <CardFront
            card={card}
            amount={amount}
            revealed={revealed}
            highlight={calm ? undefined : highlight}
            toggle={() => setRevealed((value) => !value)}
          />
        </div>
        <div
          className="space-card-back"
          style={{ background: cardBackground(card) }}
          inert={!flipped}
          aria-hidden={!flipped}
        >
          <div className="space-magnetic-strip" />
          <div className="space-card-back-content">
            <span>{card.name}</span>
            <h4>{baht2(amount)}</h4>
            <p>Recorded purchases · {monthText(cardMonth)}</p>
            <div className="space-card-back-meta">
              <span>Ends in {card.last4}</span>
              <span>{due ? `Due ${due}` : "No due day set"}</span>
            </div>
            <div className="space-card-back-actions">
              <button onClick={() => cardActivity(card.id, cardMonth)}>
                View activity <ArrowRight />
              </button>
              <button
                onClick={() =>
                  open({
                    kind: "transaction",
                    type: "expense",
                    date: Finance.localDate(),
                    card: card.id,
                  })
                }
              >
                <Plus /> Expense
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="space-wallet-card-actions">
        <span>{card.kind === "cash" ? "Polygon series" : "Circle series"}</span>
        <div>
          <button
            aria-label={`${flipped ? "Show front of" : "Show details for"} ${card.name}`}
            aria-pressed={flipped}
            onClick={() => setFlipped((value) => !value)}
          >
            <Repeat2 /> Flip
          </button>
          <button
            className="edit-row wallet-edit"
            aria-label={`Edit ${card.name}`}
            onClick={() => open({ kind: "card", card })}
          >
            <Pencil /> Edit
          </button>
        </div>
      </div>
    </motion.article>
  );
}
