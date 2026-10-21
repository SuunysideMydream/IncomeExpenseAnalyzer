import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowRight,
  CreditCard,
  Plus,
  Tags,
  Timer,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "../context";
import { baht2, Finance, monthText, signedMoney } from "../lib/finance";
import type { View } from "../types";
import hero from "../../Assets/moneywise-welcome.png";

export default function WelcomePage({ onClose }: { onClose: () => void }) {
  const { model, month, navigate, open, calm } = useApp();
  const container = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  const { scrollYProgress } = useScroll({ container });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const totals = Finance.totals(
    model.transactions.filter((row) => row.date.startsWith(month)),
  );
  const features = [
    {
      view: "transactions",
      Icon: ArrowDownUp,
      number: "01",
      title: "Every day, accounted for.",
      copy: "A daily ledger for income, spending and the details behind them.",
    },
    {
      view: "cards",
      Icon: CreditCard,
      number: "02",
      title: "A wallet that makes sense.",
      copy: "Your credit and cash cards, their purchases and upcoming reminders.",
    },
    {
      view: "installments",
      Icon: Timer,
      number: "03",
      title: "See the whole plan.",
      copy: "Calculate monthly costs, compare interest and track payment progress.",
    },
    {
      view: "categories",
      Icon: Tags,
      number: "04",
      title: "Find your own patterns.",
      copy: "Personal categories and colors that bring your spending into focus.",
    },
  ] as const;
  function go(view: View) {
    onClose();
    navigate(view);
  }
  function add() {
    onClose();
    requestAnimationFrame(() => open({ kind: "transaction" }));
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="welcome-overlay" />
        <Dialog.Content
          asChild
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current?.isConnected
              ? returnFocus.current
              : document.querySelector<HTMLElement>(".nav-item.active");
            target?.focus({ preventScroll: true });
          }}
        >
          <motion.div
            ref={container}
            className="react-intro welcome-page"
            initial={calm ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: calm ? 0 : 0.4 }}
          >
            <Dialog.Title className="sr-only">
              Welcome to Moneywise
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Explore your personal finance workspace. Continue to your overview
              or open any of the four finance tools.
            </Dialog.Description>
            <header className="welcome-topbar">
              <a
                className="welcome-wordmark"
                href="./"
                onClick={(event) => {
                  event.preventDefault();
                  go("overview");
                }}
              >
                <Wallet size={23} /> moneywise
              </a>
              <Dialog.Close
                className="welcome-close"
                aria-label="Continue to workspace"
              >
                Continue to workspace <X size={18} />
              </Dialog.Close>
            </header>
            <section className="welcome-hero">
              <motion.img
                src={hero}
                alt="Sunlight over an open notebook, silver pen and lilac glass on a quiet desk"
                className="welcome-photo"
                style={{ y: calm ? 0 : imageY }}
              />
              <div className="welcome-photo-shade" />
              <div className="welcome-hero-content">
                <motion.span
                  className="welcome-kicker"
                  initial={calm ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  A LITTLE CLARITY, EVERY DAY
                </motion.span>
                <motion.h1
                  initial={calm ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    bounce: 0,
                    duration: 0.55,
                    delay: calm ? 0 : 0.04,
                  }}
                >
                  moneywise<span>PERSONAL FINANCE</span>
                </motion.h1>
                <motion.div
                  initial={calm ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: calm ? 0 : 0.12, duration: 0.35 }}
                >
                  <h2>
                    Your money.
                    <br />A clearer picture.
                  </h2>
                  <p>
                    Bring your income, spending, cards and plans into one
                    personal workspace.
                  </p>
                  <button
                    className="primary welcome-primary"
                    onClick={() => go("overview")}
                  >
                    Open my overview <ArrowRight size={18} />
                  </button>
                </motion.div>
              </div>
              <button
                className="welcome-explore"
                onClick={() =>
                  document
                    .getElementById("welcome-tools")
                    ?.scrollIntoView({ behavior: calm ? "instant" : "smooth" })
                }
              >
                Explore your workspace <ArrowDown size={17} />
              </button>
              <span className="welcome-private">
                Your data. Your browser. Your pace.
              </span>
            </section>
            <section className="welcome-month">
              <div>
                <span className="studio-eyebrow">
                  YOUR WORKSPACE, RIGHT NOW
                </span>
                <h2>{monthText(month)}</h2>
                <p>Based on your recorded entries.</p>
              </div>
              <div>
                <span>Income</span>
                <strong>{baht2(totals.income)}</strong>
              </div>
              <div>
                <span>Spending</span>
                <strong>{baht2(totals.expense)}</strong>
              </div>
              <div>
                <span>Net recorded</span>
                <strong>{signedMoney(totals.net)}</strong>
              </div>
            </section>
            <section id="welcome-tools" className="welcome-tools">
              <div className="welcome-section-intro">
                <span className="studio-eyebrow">ONE PERSONAL WORKSPACE</span>
                <h2>
                  The details.
                  <br />
                  And the bigger picture.
                </h2>
                <p>
                  Move from the smallest everyday entry to the patterns that
                  help you understand your month.
                </p>
              </div>
              <div className="welcome-feature-list">
                {features.map(({ view, number, Icon, title, copy }, index) => (
                  <motion.button
                    key={view}
                    onClick={() => go(view)}
                    initial={calm ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: calm ? 0 : index * 0.035,
                      duration: 0.3,
                    }}
                  >
                    <span className="welcome-feature-number">{number}</span>
                    <div>
                      <Icon size={23} />
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                    <ArrowRight size={22} />
                  </motion.button>
                ))}
              </div>
            </section>
            <section className="welcome-final">
              <span className="studio-eyebrow">START WITH TODAY</span>
              <h2>
                A small entry.
                <br />A little more clarity.
              </h2>
              <button className="primary welcome-primary" onClick={add}>
                <Plus size={18} /> Add a transaction
              </button>
              <p>Saved in this browser. Save data to keep a portable backup.</p>
            </section>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
