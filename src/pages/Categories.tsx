import { motion } from "motion/react";
import {
  House,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  TrainFront,
  Utensils,
  Wallet,
} from "lucide-react";
import { useApp } from "../context";
import { baht2, monthText, safeColor } from "../lib/finance";
import type { CSSVars } from "../types";
export default function Categories() {
  const { model, store, month, open, notify, calm } = useApp(),
    rows = model.transactions.filter((row) => row.date.startsWith(month));
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Categories</h2>
          <p className="period">
            A place for every little thing · {monthText(month)}
          </p>
        </div>
        <button className="primary" onClick={() => open({ kind: "category" })}>
          <Plus size={16} /> New category
        </button>
      </div>
      {!model.categories.length ? (
        <section className="card space-empty-state">
          <span className="space-empty-icon">
            <Tag />
          </span>
          <h3>A little organization goes a long way.</h3>
          <p>
            Create your own categories or start with a set you can make your
            own.
          </p>
          <button
            className="secondary"
            onClick={() => {
              try {
                store.starters();
                notify("Starter categories added.");
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            Use starter categories
          </button>
        </section>
      ) : (
        <div className="category-board">
          {model.categories.map((name) => {
            const info = model.meta(name),
              used = rows.filter(
                (row) =>
                  row.category === name ||
                  Math.abs(row.categories?.[name] || 0) > 0,
              ),
              expense = used.reduce(
                (sum, row) => sum + Math.abs(row.categories?.[name] || 0),
                0,
              ),
              income = used
                .filter((row) => row.category === name)
                .reduce((sum, row) => sum + row.income, 0),
              Icon = /food|meal|lunch|dinner|snack|breakfast/i.test(name)
                ? Utensils
                : /transport/i.test(name)
                  ? TrainFront
                  : /home|bill/i.test(name)
                    ? House
                    : info.type === "Income"
                      ? Wallet
                      : ShoppingBag;
            return (
              <motion.article
                layout={!calm}
                initial={calm ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="category-tile"
                key={name}
                style={{ "--category-color": safeColor(info.color) } as CSSVars}
              >
                <div className="space-category-art">
                  <span>
                    <Icon />
                  </span>
                  <i />
                  <span className="space-category-type">{info.type}</span>
                </div>
                <div className="space-category-content">
                  <div>
                    <strong>{name}</strong>
                    <button
                      className="space-text-icon edit-row"
                      aria-label={`Edit ${name}`}
                      onClick={() => open({ kind: "category", name })}
                    >
                      <Pencil />
                    </button>
                  </div>
                  <p>
                    {used.length} {used.length === 1 ? "entry" : "entries"} this
                    month
                  </p>
                  <div className="space-category-value">
                    {baht2(info.type === "Income" ? income : expense)}
                    <small>
                      {info.type === "Income" ? "income" : "spending"} recorded
                    </small>
                  </div>
                  {info.type === "Both" && income > 0 && (
                    <small className="positive">
                      {baht2(income)} income recorded
                    </small>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </>
  );
}
