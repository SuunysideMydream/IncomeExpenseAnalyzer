import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSystemReducedMotion } from "./lib/motion";
import { Finance } from "./lib/finance";
import { createLedgerStore, KEYS, selectLedger } from "./lib/model";
import { viewFromHash } from "./lib/routes";
import type { LedgerModel, LedgerStore } from "./lib/model";
import type {
  DialogState,
  CalendarFilter,
  Filters,
  LedgerState,
  View,
  Workbook,
} from "./types";
export const EMPTY_FILTERS: Filters = {
  query: "",
  type: "",
  category: "",
  card: "",
};
export interface AppContextType {
  state: LedgerState;
  store: LedgerStore;
  model: LedgerModel;
  view: View;
  navigate: (view: View) => void;
  month: string;
  setMonth: (month: string) => void;
  cardMonth: string;
  setCardMonth: (month: string) => void;
  walletJump: { id: string } | null;
  showWalletCard: (id: string) => void;
  calendar: { date: string; filter: CalendarFilter };
  setCalendar: (calendar: { date: string; filter: CalendarFilter }) => void;
  openCalendar: (date?: string, filter?: CalendarFilter) => void;
  dialog: DialogState | null;
  open: (dialog: DialogState) => void;
  close: () => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  txMode: "day" | "month";
  setTxMode: (mode: "day" | "month") => void;
  sort: string;
  setSort: (sort: string) => void;
  page: number;
  setPage: (page: number) => void;
  notice: string;
  notify: (message: string) => void;
  calm: boolean;
  cardActivity: (id: string, month?: string) => void;
  openMonth: (month: string) => void;
  transactionSaved: (date: string) => void;
}
const Context = createContext<AppContextType | null>(null);
export const useApp = () => {
  const context = useContext(Context);
  if (!context) throw Error("Moneywise provider missing.");
  return context;
};
export function AppProvider({
  workbook,
  children,
}: {
  workbook: Workbook;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createLedgerStore(window.localStorage, workbook),
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const model = useMemo(() => selectLedger(state, workbook), [state, workbook]);
  const date = Finance.localDate();
  const today = date.slice(0, 7);
  const [view, setView] = useState<View>(() =>
      viewFromHash(window.location.hash),
    ),
    [month, setMonthRaw] = useState(today),
    [cardMonth, setCardMonth] = useState(today);
  const [calendar, setCalendar] = useState<{
    date: string;
    filter: CalendarFilter;
  }>({ date, filter: "all" });
  const [dialog, setDialog] = useState<DialogState | null>(null),
    [walletJump, setWalletJump] = useState<{ id: string } | null>(null),
    [filters, setFilters] = useState<Filters>(EMPTY_FILTERS),
    [txMode, setTxMode] = useState<"day" | "month">("day");
  const [sort, setSort] = useState("newest"),
    [page, setPage] = useState(0),
    [notice, setNotice] = useState("");
  const systemReduced = useSystemReducedMotion(),
    calm = Boolean(systemReduced) || state.workspace.motion === "reduced";
  const notify = useCallback((message: string) => setNotice(message), []);
  const activate = useCallback((next: View) => {
    setView(next);
    setPage(0);
    setWalletJump(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const navigate = useCallback(
    (next: View) => {
      const hash = `#/${next}`;
      if (
        window.location.hash !== hash &&
        (next !== "overview" || window.location.hash)
      )
        window.history.pushState(null, "", hash);
      activate(next);
    },
    [activate],
  );
  const showWalletCard = useCallback(
    (id: string) => {
      navigate("cards");
      setWalletJump({ id });
    },
    [navigate],
  );
  useEffect(() => {
    const sync = () => {
      setDialog(null);
      activate(viewFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [activate]);
  const openCalendar = useCallback(
    (day = Finance.localDate(), filter: CalendarFilter = "all") => {
      setCalendar({
        date: Finance.validDate(day) ? day : Finance.localDate(),
        filter,
      });
      navigate("calendar");
    },
    [navigate],
  );
  const setMonth = useCallback((next: string) => {
    setMonthRaw(next);
    setPage(0);
  }, []);
  const open = useCallback((next: DialogState) => setDialog(next), []),
    close = useCallback(() => setDialog(null), []);
  const cardActivity = useCallback(
    (id: string, selected = month) => {
      setFilters({ query: "", type: "expense", category: "", card: id });
      setMonthRaw(selected);
      navigate("transactions");
      setTxMode("day");
      setPage(0);
      setDialog(null);
    },
    [month, navigate],
  );
  const openMonth = useCallback(
    (next: string) => {
      setMonthRaw(next);
      navigate("transactions");
      setTxMode("day");
      setFilters(EMPTY_FILTERS);
      setPage(0);
    },
    [navigate],
  );
  const transactionSaved = useCallback((date: string) => {
    setMonthRaw(date.slice(0, 7));
    setCardMonth(date.slice(0, 7));
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }, []);
  useLayoutEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
    document.body.dataset.motion = calm ? "reduced" : "full";
    document.body.dataset.density = state.workspace.density || "comfortable";
  }, [state.theme, state.workspace.density, calm]);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (
        event.key === null ||
        Object.values(KEYS).includes(event.key as never)
      )
        store.reload();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [store]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open({ kind: "search" });
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [open]);
  return (
    <Context.Provider
      value={{
        state,
        store,
        model,
        view,
        navigate,
        month,
        setMonth,
        cardMonth,
        setCardMonth,
        walletJump,
        showWalletCard,
        calendar,
        setCalendar,
        openCalendar,
        dialog,
        open,
        close,
        filters,
        setFilters,
        txMode,
        setTxMode,
        sort,
        setSort,
        page,
        setPage,
        notice,
        notify,
        calm,
        cardActivity,
        openMonth,
        transactionSaved,
      }}
    >
      {children}
      <div className="sr-only" aria-live="polite">
        {notice}
      </div>
      {notice && (
        <div id="ledger-notice" role="status">
          <span>{notice}</span>
          {state.undo && (
            <button
              onClick={() => {
                try {
                  store.undoDelete();
                  notify("Entry restored.");
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            >
              Undo delete
            </button>
          )}
          <button
            className="notice-close"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
