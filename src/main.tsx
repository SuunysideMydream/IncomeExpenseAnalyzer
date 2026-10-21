import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProvider } from "./context";
import { LiquidWelcome } from "./components/shadcnspace/TextEffects";
import type { Workbook } from "./types";
import workbookUrl from "../data.json?url";
import "../space.css";
import "./styles.css";
import "./studio.css";

// Read-only initialization: migration never rewrites a user's saved ledger.
try {
  document.body.classList.toggle(
    "dark",
    JSON.parse(localStorage.getItem("mw-theme") || '"light"') === "dark",
  );
} catch {
  /* Leave unreadable storage unchanged. */
}
function Bootstrap() {
  const [workbook, setWorkbook] = useState<Workbook | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(workbookUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw Error(
            `Workbook snapshot could not be opened (${response.status}).`,
          );
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.records) || !Array.isArray(data.months))
          throw Error("The workbook snapshot has an invalid format.");
        setWorkbook(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <main className="react-boot-error">
        <WalletMark />
        <h1>Your data is still safe.</h1>
        <p>{error}</p>
        <p>
          No saved ledger data has been changed. Check the connection or preview
          server, then retry.
        </p>
        <button
          className="primary"
          onClick={() => {
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </main>
    );
  return workbook ? (
    <AppProvider workbook={workbook}>
      <App />
    </AppProvider>
  ) : (
    <LiquidWelcome />
  );
}
function WalletMark() {
  return (
    <div className="space-brand-mark" aria-hidden="true">
      M
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
