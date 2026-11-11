import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  LayoutGroup,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Download,
  Home,
  Search,
  Settings,
  SlidersHorizontal,
  Upload,
  Wallet,
} from "lucide-react";
import { EMPTY_FILTERS, useApp } from "./context";
import { Finance } from "./lib/finance";
import { ROUTES, ROUTE_ICONS } from "./lib/routes";
import { parseBackup } from "./lib/model";
import { saveBackup } from "./lib/files";
import { Dialogs } from "./components/Dialogs";
import { Atmosphere } from "./components/Atmosphere";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { DropdownMenu } from "./components/ui/menus";
const WelcomePage = lazy(() => import("./components/WelcomePage"));

const loaders = {
  overview: () => import("./pages/Overview"),
  transactions: () => import("./pages/Transactions"),
  calendar: () => import("./pages/Calendar"),
  cards: () => import("./pages/Cards"),
  subscriptions: () => import("./pages/Subscriptions"),
  installments: () => import("./pages/Installments"),
  categories: () => import("./pages/Categories"),
};
const pages = {
  overview: lazy(loaders.overview),
  transactions: lazy(loaders.transactions),
  calendar: lazy(loaders.calendar),
  cards: lazy(loaders.cards),
  subscriptions: lazy(loaders.subscriptions),
  installments: lazy(loaders.installments),
  categories: lazy(loaders.categories),
};
function Brand({ onClick }: { onClick: () => void }) {
  return (
    <a
      className="space-brand"
      href="#/overview"
      aria-label="Moneywise home"
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      <span className="space-brand-mark">
        <Wallet size={21} />
      </span>
      <strong>
        moneywise<span className="brand-dot">.</span>
      </strong>
    </a>
  );
}

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
    openCalendar,
    setFilters,
    setTxMode,
    notify,
  } = useApp();
  const fileInput = useRef<HTMLInputElement>(null),
    [saving, setSaving] = useState(false),
    [intro, setIntro] = useState(false);
  const current = ROUTES.find((item) => item.view === view)!,
    Page = pages[view],
    name = state.workspace.profile?.name || "My workspace";
  const order = ROUTES.indexOf(current),
    previousOrder = useRef(order);
  const direction = order >= previousOrder.current ? 1 : -1;
  const navigationScroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    previousOrder.current = order;
    const scroller = navigationScroller.current;
    const active =
      scroller?.querySelector<HTMLButtonElement>(".nav-item.active");
    if (scroller && active && scroller.scrollWidth > scroller.clientWidth) {
      const outer = scroller.getBoundingClientRect(),
        inner = active.getBoundingClientRect();
      if (inner.right > outer.right || inner.left < outer.left)
        scroller.scrollTo({
          left: scroller.scrollLeft + inner.left - outer.left - 12,
          behavior: calm ? "instant" : "smooth",
        });
    }
  }, [order, calm]);
  useEffect(() => {
    // Warm the two most common drill-throughs after the shell is interactive.
    const warm = () => {
      void loaders.transactions().catch(() => {});
      void loaders.calendar().catch(() => {});
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(warm, { timeout: 1800 });
      return () => cancelIdleCallback(id);
    }
  }, []);
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
      <a
        className="skip-link"
        href="#app"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("app")?.focus();
        }}
      >
        Skip to finance workspace
      </a>
      <div className="moneywise-workbench">
        <Atmosphere calm={calm} />
        <header className="space-header sidebar">
          <motion.div
            className="studio-reading-progress"
            aria-hidden="true"
            style={{ scaleX: calm ? scrollYProgress : readingProgress }}
          />
          <div className="space-head-row">
            <div className="workbench-mobile-brand">
              <Brand onClick={() => navigate("overview")} />
            </div>
            <button
              className="space-search icon-button"
              onClick={() => open({ kind: "search" })}
              aria-label="Search your finances"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search />
              <span>Search or jump to…</span>
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
                {(model.upcoming().length > 0 ||
                  model.renewals.upcoming(Finance.localDate(), 14).length >
                    0) && <span className="space-reminder-dot" />}
              </button>
              <ThemeSwitch />
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
        </header>
        <aside
          className="space-nav-band workbench-nav"
          aria-label="Workspace navigation"
        >
          <div className="workbench-brand">
            <Brand onClick={() => navigate("overview")} />
            <span>PERSONAL FINANCE</span>
          </div>
          <div className="space-nav-row" ref={navigationScroller}>
            <LayoutGroup id="main-navigation">
              <nav aria-label="Main navigation">
                {["Workspace", "Manage"].map((group) => (
                  <div className="workbench-nav-group" key={group}>
                    <span className="workbench-nav-label">{group}</span>
                    {ROUTES.filter((item) => item.group === group).map(
                      ({ view: target, label }) => {
                        const Icon = ROUTE_ICONS[target];
                        return (
                          <button
                            key={target}
                            className={`nav-item react-nav-item ${view === target ? "active" : ""}`}
                            aria-current={view === target ? "page" : undefined}
                            data-view={target}
                            onPointerEnter={() => {
                              void loaders[target]().catch(() => {});
                            }}
                            onFocus={() => {
                              void loaders[target]().catch(() => {});
                            }}
                            onClick={() => navigate(target)}
                          >
                            {view === target && (
                              <motion.span
                                className="react-nav-selection"
                                aria-hidden="true"
                                layoutId={calm ? undefined : "nav-selection"}
                                transition={
                                  calm
                                    ? { duration: 0 }
                                    : {
                                        type: "spring",
                                        bounce: 0,
                                        duration: 0.32,
                                      }
                                }
                              />
                            )}
                            <Icon />
                            <span>{label}</span>
                          </button>
                        );
                      },
                    )}
                  </div>
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
        </aside>
        <div className="workbench-main">
          <main className="main">
            {view !== "overview" && (
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
                <button
                  className="space-today"
                  aria-label="Open calendar for today"
                  onClick={() => openCalendar()}
                >
                  <CalendarDays />
                  <span>
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </button>
              </div>
            )}
            <section id="app" tabIndex={-1} aria-label="Finance workspace">
              <Suspense
                fallback={
                  <div className="route-loading" role="status">
                    Opening {current.label.toLowerCase()}…
                  </div>
                }
              >
                <motion.div
                  key={view}
                  data-page={view}
                  initial={
                    calm ? false : { opacity: 0.6, x: direction * 12, y: 4 }
                  }
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={
                    calm
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0, duration: 0.32 }
                  }
                >
                  <Page />
                </motion.div>
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
        </div>
      </div>
      <Dialogs />
      <Suspense fallback={null}>
        {intro && <WelcomePage onClose={() => setIntro(false)} />}
      </Suspense>
    </MotionConfig>
  );
}
