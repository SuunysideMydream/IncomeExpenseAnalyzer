import { lazy, Suspense, useRef, useState, type ChangeEvent } from "react";
import {
  LayoutGroup,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  Home,
  LayoutDashboard,
  Search,
  Settings,
  SlidersHorizontal,
  Tags,
  Timer,
  Upload,
  Wallet,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "./context";
import { Finance } from "./lib/finance";
import { parseBackup } from "./lib/model";
import { saveBackup } from "./lib/files";
import { Dialogs } from "./components/Dialogs";
import { DropdownMenu } from "./components/ui/menus";
const WelcomePage = lazy(() => import("./components/WelcomePage"));

const pages = {
  overview: lazy(() => import("./pages/Overview")),
  transactions: lazy(() => import("./pages/Transactions")),
  cards: lazy(() => import("./pages/Cards")),
  installments: lazy(() => import("./pages/Installments")),
  categories: lazy(() => import("./pages/Categories")),
};
const navigation = [
  {
    view: "overview",
    label: "Overview",
    Icon: LayoutDashboard,
    title: "Income, spending and commitments for the month.",
  },
  {
    view: "transactions",
    label: "Transactions",
    Icon: ArrowDownUp,
    title: "Every day, with every detail in reach.",
  },
  {
    view: "cards",
    label: "Cards",
    Icon: CreditCard,
    title: "Your wallet, purchases and payment reminders.",
  },
  {
    view: "installments",
    label: "Installments",
    Icon: Timer,
    title: "Monthly costs, interest and your payment progress.",
  },
  {
    view: "categories",
    label: "Categories",
    Icon: Tags,
    title: "Organize your ledger in your own colors.",
  },
] as const;

export default function App() {
  const {
    state,
    store,
    model,
    view,
    navigate,
    calm,
    open,
    close,
    setMonth,
    setCardMonth,
    setFilters,
    setTxMode,
    notify,
  } = useApp();
  const fileInput = useRef<HTMLInputElement>(null),
    [saving, setSaving] = useState(false),
    [intro, setIntro] = useState(false);
  const current = navigation.find((item) => item.view === view)!,
    Page = pages[view],
    name = state.workspace.profile?.name || "My workspace";
  const initials =
    name === "My workspace"
      ? "MW"
      : name
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();
  const { scrollYProgress } = useScroll();
  const readingProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
  });
  async function save() {
    setSaving(true);
    try {
      if (await saveBackup(state))
        notify("Backup saved. Keep it somewhere safe.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("Backup is too large (10 MB maximum).");
      const restored = parseBackup(await file.text());
      if (
        !window.confirm(
          `Restore “${file.name}”? This replaces the ledger saved for this site in this browser. Save a backup of your current data first if needed.`,
        )
      )
        return;
      store.restore(restored);
      close();
      setMonth(Finance.localDate().slice(0, 7));
      setCardMonth(Finance.localDate().slice(0, 7));
      setFilters(EMPTY_FILTERS);
      setTxMode("day");
      navigate("overview");
      notify("Backup restored. All pages now use your loaded ledger.");
    } catch (error) {
      notify(`Could not load backup: ${(error as Error).message}`);
    }
  }
  const menu = [
    {
      label: "Welcome to Moneywise",
      icon: <Home size={16} />,
      action: () => setIntro(true),
    },
    {
      label: "Workspace preferences",
      icon: <SlidersHorizontal size={16} />,
      action: () => open({ kind: "preferences" }),
    },
    {
      label: "Data & settings",
      icon: <Settings size={16} />,
      action: () => open({ kind: "settings" }),
    },
    {
      label: "Save data",
      icon: <Download size={16} />,
      action: () => void save(),
    },
    {
      label: "Load data",
      icon: <Upload size={16} />,
      action: () => fileInput.current?.click(),
    },
    {
      label: "Clear data & start fresh",
      danger: true,
      action: () => open({ kind: "clear" }),
    },
  ];
  return (
    <MotionConfig
      reducedMotion={calm ? "always" : "never"}
      transition={{ type: "spring", bounce: 0, duration: 0.34 }}
    >
      <a className="skip-link" href="#app">
        Skip to finance workspace
      </a>
      <header className="space-header sidebar">
        <motion.div
          className="studio-reading-progress"
          aria-hidden="true"
          style={{ scaleX: calm ? scrollYProgress : readingProgress }}
        />
        <div className="space-head-row">
          <a
            className="space-brand"
            href="./"
            aria-label="Moneywise home"
            onClick={(event) => {
              event.preventDefault();
              navigate("overview");
            }}
          >
            <span className="space-brand-mark">
              <Wallet />
            </span>
            <strong>moneywise</strong>
            <small>PERSONAL</small>
          </a>
          <button
            className="space-search icon-button"
            onClick={() => open({ kind: "search" })}
            aria-label="Search your finances"
          >
            <Search />
            <span>Search your money space</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="space-head-tools">
            <div className="space-backup-actions">
              <button
                className="backup-button secondary"
                id="load-backup-button"
                onClick={() => fileInput.current?.click()}
              >
                Load data
              </button>
              <button
                className="backup-button primary"
                id="save-backup-button"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save data"}
              </button>
              <button
                className="backup-button secondary"
                id="clear-data-button"
                onClick={() => open({ kind: "clear" })}
              >
                Clear data
              </button>
            </div>
            <input
              ref={fileInput}
              id="backup-file"
              type="file"
              accept=".js,application/javascript,text/javascript"
              hidden
              onChange={(event) => void load(event)}
            />
            <button
              className="space-shell-icon"
              aria-label="View payment reminders"
              onClick={() => open({ kind: "reminders" })}
            >
              <Bell />
              {model.upcoming().length > 0 && (
                <span className="space-reminder-dot" />
              )}
            </button>
            <label className="mode-switch" title="Toggle light and dark mode">
              <input
                id="theme-toggle"
                type="checkbox"
                role="switch"
                aria-label="Dark mode"
                checked={state.theme === "dark"}
                onChange={(event) => {
                  try {
                    store.commit({
                      theme: event.target.checked ? "dark" : "light",
                    });
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              />
              <span className="mode-track" aria-hidden="true">
                <span className="mode-thumb">
                  <svg className="mode-sun" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                  </svg>
                  <svg className="mode-moon" viewBox="0 0 24 24">
                    <path d="M19.5 15.5A8 8 0 0 1 8.5 4.5a8.5 8.5 0 1 0 11 11Z" />
                  </svg>
                </span>
              </span>
            </label>
            <DropdownMenu
              label="Workspace menu"
              trigger={
                <button
                  className="space-profile-trigger avatar"
                  aria-label="Workspace menu"
                >
                  {initials}
                </button>
              }
              items={menu}
            />
          </div>
        </div>
        <div className="space-nav-band">
          <div className="space-nav-row">
            <LayoutGroup id="main-navigation">
              <nav aria-label="Main navigation">
                {navigation.map(({ view: target, label, Icon }) => (
                  <button
                    key={target}
                    className={`nav-item react-nav-item ${view === target ? "active" : ""}`}
                    aria-current={view === target ? "page" : undefined}
                    data-view={target}
                    onClick={() => navigate(target)}
                  >
                    {view === target && (
                      <motion.span
                        className="react-nav-selection"
                        layoutId="nav-selection"
                        transition={
                          calm
                            ? { duration: 0 }
                            : { type: "spring", bounce: 0, duration: 0.32 }
                        }
                      />
                    )}
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </LayoutGroup>
            <div className="space-nav-meta">
              <button
                className="studio-welcome-link"
                onClick={() => setIntro(true)}
              >
                Welcome <ArrowUpRight size={14} />
              </button>
              <span className="space-status">
                <i />
                Saved on this browser
              </span>
              <button
                className="settings"
                onClick={() => open({ kind: "settings" })}
              >
                <Settings />
                Data & settings
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="main">
        <div className="space-page-heading">
          <div>
            <div className="space-breadcrumb">
              <Home />
              <span>{name}</span>
              <span>/</span>
              <span>{current.label}</span>
            </div>
            <h1 id="page-title">
              {current.label}
              <span className="studio-title-dot">.</span>
            </h1>
            <p className="studio-page-description">{current.title}</p>
          </div>
          <div className="space-today">
            <CalendarDays />
            <span>
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <section id="app" tabIndex={-1} aria-label="Finance workspace">
          <Suspense
            fallback={
              <div className="card" role="status">
                Opening {current.label.toLowerCase()}…
              </div>
            }
          >
            {calm ? (
              <div key={view} data-page={view}>
                <Page />
              </div>
            ) : (
              <motion.div
                key={view}
                data-page={view}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  calm
                    ? { duration: 0.06 }
                    : { type: "spring", bounce: 0, duration: 0.36 }
                }
              >
                <Page />
              </motion.div>
            )}
          </Suspense>
        </section>
        <footer className="space-footer">
          <div className="source-note">
            {state.workspace.mode === "fresh"
              ? "Your personal ledger · data stays in this browser"
              : `Workbook history + your entries · ${model.transactions.length} recorded days & transactions`}
            <br />
            Save data regularly to keep a portable backup.
          </div>
          <div>
            <button onClick={() => open({ kind: "preferences" })}>
              Workspace preferences
            </button>
            <span aria-hidden="true"> · </span>
            <button onClick={() => open({ kind: "settings" })}>
              Data & settings
            </button>
            <span aria-hidden="true"> · </span>
            <button onClick={() => setIntro(true)}>Replay welcome</button>
          </div>
        </footer>
      </main>
      <Dialogs />
      <Suspense fallback={null}>
        {intro && <WelcomePage onClose={() => setIntro(false)} />}
      </Suspense>
    </MotionConfig>
  );
}
