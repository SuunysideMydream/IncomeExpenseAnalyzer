// Adapted from Assets/shadcnspace asset/credit-card-new-design.tsx.
import { useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
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
import { CardNetworkMark } from "../CardNetworkMark";
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
}: {
  card: Partial<CardType>;
  amount: number;
  preview?: boolean;
  revealed?: boolean;
}) {
  return (
    <div
      id={preview ? "card-preview" : undefined}
      className={`credit-card space-card-front ${card.kind === "cash" ? "cash-card" : ""} ${preview ? "mini-card" : ""}`}
      style={{ background: cardBackground(card) }}
    >
      <span className="card-sheen" aria-hidden="true" />
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
        <CardNetworkMark network={card.network} />
      </div>
    </div>
  );
}
export function CardPreview({ card }: { card: Partial<CardType> }) {
  return <CardFront card={card} amount={0} preview />;
}
export function WalletCard({ card }: { card: CardType }) {
  const { model, cardMonth, calm, open, cardActivity } = useApp();
  const [hovered, setHovered] = useState(false);
  const [manualFace, setManualFace] = useState<boolean | null>(null);
  const [backFocused, setBackFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const flipped = manualFace ?? (hovered || backFocused);
  const [settledBack, setSettledBack] = useState<boolean | null>(false);
  const rotatorRef = useRef<HTMLDivElement>(null);
  const rotateY = useMotionValue(0);
  // Keep hit targets out of the 3D rotation until the visible face settles.
  const faceIsInteractive = calm || settledBack === flipped;
  const frontActive = !flipped && faceIsInteractive;
  const backActive = flipped && faceIsInteractive;
  useLayoutEffect(() => {
    const rotator = rotatorRef.current;
    if (!rotator) return;
    const target = flipped ? 180 : 0;
    const draw = (angle: number) => {
      rotator.style.transform = `rotateY(${angle}deg)`;
    };
    if (calm || rotateY.get() === target) {
      rotateY.jump(target);
      draw(target);
      setSettledBack(flipped);
      return;
    }
    setSettledBack(null);
    const rotation = animate(rotateY, target, {
      type: "spring",
      bounce: 0,
      duration: 0.4,
      onUpdate: draw,
      onComplete: () => {
        draw(target);
        setSettledBack(flipped);
      },
    });
    return () => rotation.stop();
  }, [calm, flipped, rotateY]);
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
      initial={calm ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
    >
      <div
        className="wallet-card-stage"
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          setManualFace(null);
          setHovered(true);
        }}
        onPointerMove={(event) => {
          if (calm || event.pointerType !== "mouse") return;
          const rect = event.currentTarget.getBoundingClientRect();
          lightX.set(((event.clientX - rect.left) / rect.width) * 100);
          lightY.set(((event.clientY - rect.top) / rect.height) * 100);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setHovered(false);
          setManualFace(null);
          lightX.set(50);
          lightY.set(30);
        }}
        onClick={(event) => {
          if (
            !hovered &&
            event.target instanceof Element &&
            !event.target.closest("button")
          )
            setManualFace(!flipped);
        }}
      >
        <button
          type="button"
          className="wallet-keyboard-toggle"
          aria-label={`${flipped ? "Show front of" : "Show details for"} ${card.name}`}
          aria-pressed={flipped}
          onClick={() => setManualFace(!flipped)}
        >
          <Repeat2 size={14} /> {flipped ? "Show front" : "Show back"}
        </button>
        <div className="space-card-rotator" ref={rotatorRef}>
          <div
            className="react-card-face"
            inert={!frontActive}
            aria-hidden={!frontActive}
          >
            <CardFront card={card} amount={amount} revealed={revealed} />
          </div>
          <div
            className="space-card-back"
            style={{ background: cardBackground(card) }}
            inert={!backActive}
            aria-hidden={!backActive}
            onFocusCapture={(event) =>
              setBackFocused(event.target.matches(":focus-visible"))
            }
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setBackFocused(false);
            }}
          >
            {!calm && (
              <motion.span
                className="wallet-pointer-light"
                aria-hidden="true"
                style={{ background: highlight }}
              />
            )}
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
        </div>
      </div>
      <div className="space-wallet-card-actions">
        <span className="wallet-flip-hint" aria-hidden="true">
          <span>Tap for details</span>
          <span>Hover for details</span>
        </span>
        <div>
          <button
            type="button"
            aria-label={
              revealed ? "Hide recorded purchases" : "Show recorded purchases"
            }
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff /> : <Eye />} {revealed ? "Hide" : "Reveal"}
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
