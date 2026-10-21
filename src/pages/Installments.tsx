// Product/price card.tsx becomes a purchase plan; the wishlist heart pins real plans.
import { motion } from "motion/react";
import { Calendar, Check, Heart, Plus, ShoppingBag, Timer } from "lucide-react";
import { useApp } from "../context";
import { baht2, nextMonth, planProgress, safeColor } from "../lib/finance";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { CSSVars } from "../types";
export default function Installments() {
  const { model, state, store, open, notify, calm } = useApp(),
    pins = new Set(state.workspace.pinnedPlans || []),
    plans = model.plans
      .filter((plan) => plan.name)
      .sort((a, b) => Number(pins.has(b.id)) - Number(pins.has(a.id))),
    active = plans.filter((plan) => plan.status === "Ongoing"),
    commitment = active.reduce((sum, plan) => sum + plan.monthly, 0);
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Installment planner</h2>
          <p className="period">Thoughtful plans for the things you choose.</p>
        </div>
        <button className="primary" onClick={() => open({ kind: "plan" })}>
          <Plus size={16} /> Add plan
        </button>
      </div>
      <div className="space-installment-banner">
        <span className="space-tile violet">
          <Timer />
        </span>
        <div>
          <span>Monthly commitment</span>
          <strong>
            {baht2(commitment)} <small>/ month</small>
          </strong>
        </div>
        <span className="space-soft-badge">
          {active.length} active {active.length === 1 ? "plan" : "plans"}
        </span>
        <p>
          Track your progress here.
          <br />
          Record actual payments in Transactions.
        </p>
      </div>
      {!plans.length ? (
        <section className="card space-empty-state">
          <span className="space-empty-icon">
            <ShoppingBag />
          </span>
          <h3>Your next big thing starts with a plan.</h3>
          <p>
            Add a purchase to calculate its monthly cost and track your
            progress.
          </p>
        </section>
      ) : (
        <div className="plan-board">
          {plans.map((plan, index) => {
            const progress = planProgress(plan),
              card = model.cards.find((card) => card.id === plan.card),
              color = safeColor(
                card?.color,
                ["#9b8cdb", "#78a8a1", "#d49c77"][index % 3],
              ),
              next =
                plan.startMonth && progress.remaining
                  ? nextMonth(plan.startMonth, progress.paid)
                  : null;
            return (
              <motion.div
                layout={!calm}
                key={plan.id}
                initial={calm ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              >
                <Card className="plan-card">
                  <div
                    className="space-product-art"
                    style={{ "--product-color": color } as CSSVars}
                  >
                    <div className="space-product-ring" />
                    <motion.span
                      className="space-product-icon"
                      whileHover={calm ? undefined : { rotate: 0, y: -3 }}
                    >
                      <ShoppingBag />
                    </motion.span>
                    <span className={`pill ${plan.status.toLowerCase()}`}>
                      {plan.status}
                    </span>
                    <Button
                      variant="ghost"
                      className={`space-pin ${pins.has(plan.id) ? "is-pinned" : ""}`}
                      aria-label={`${pins.has(plan.id) ? "Unpin" : "Pin"} ${plan.name}`}
                      aria-pressed={pins.has(plan.id)}
                      onClick={() => {
                        try {
                          store.togglePin(plan.id);
                        } catch (error) {
                          notify((error as Error).message);
                        }
                      }}
                    >
                      <Heart
                        fill={pins.has(plan.id) ? "currentColor" : "none"}
                      />
                    </Button>
                    <div className="space-product-tag">
                      {plan.months} MONTH PLAN
                    </div>
                  </div>
                  <CardContent className="space-product-content">
                    <span className="space-product-category">
                      {card?.name || "Personal installment"}
                    </span>
                    <h3>{plan.name}</h3>
                    <div className="space-product-price">
                      {baht2(plan.monthly)}
                      <span>/ month</span>
                    </div>
                    <p className="space-product-total">
                      {baht2(plan.amount)} purchase · {plan.rate}% monthly
                      interest
                    </p>
                    <div className="budget-track">
                      <motion.i
                        initial={false}
                        animate={{ width: `${progress.percent}%` }}
                        transition={
                          calm
                            ? { duration: 0 }
                            : { type: "spring", bounce: 0, duration: 0.4 }
                        }
                      />
                    </div>
                    <div className="space-plan-progress">
                      <b>
                        {progress.paid} / {plan.months} paid
                      </b>
                      <span>{progress.remaining} to go</span>
                    </div>
                    {next && (
                      <p className="space-plan-next">
                        <Calendar /> Next planned month {next}
                      </p>
                    )}
                    <div className="entry-actions">
                      <Button
                        variant="secondary"
                        onClick={() => open({ kind: "planDetail", plan })}
                      >
                        Details
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => open({ kind: "plan", plan })}
                      >
                        Edit
                      </Button>
                      {plan.status === "Ongoing" && (
                        <Button
                          onClick={() => {
                            try {
                              store.markPlanPaid(plan.id);
                              notify(
                                "Plan progress updated. Record the actual payment separately in Transactions.",
                              );
                            } catch (error) {
                              notify((error as Error).message);
                            }
                          }}
                        >
                          <Check size={13} /> Mark month paid
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
