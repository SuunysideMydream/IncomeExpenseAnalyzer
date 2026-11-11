import { useRef, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { useApp } from "../context";

export function ThemeSwitch() {
  const { state, store, calm, notify } = useApp();
  const active = useRef<ViewTransition | null>(null);

  function changeTheme(event: ChangeEvent<HTMLInputElement>) {
    const theme = event.currentTarget.checked ? "dark" : "light";
    const commit = () => {
      try {
        store.commit({ theme });
      } catch (error) {
        notify((error as Error).message);
      }
    };
    const thumb = event.currentTarget
      .closest(".mode-switch")
      ?.querySelector(".mode-thumb")
      ?.getBoundingClientRect();
    if (calm || !thumb || typeof document.startViewTransition !== "function") {
      commit();
      return;
    }

    const x = thumb.left + thumb.width / 2;
    const y = thumb.top + thumb.height / 2;
    const radius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    const root = document.documentElement;
    active.current?.skipTransition();
    root.classList.add("theme-revealing");
    const transition = document.startViewTransition(() => flushSync(commit));
    active.current = transition;
    void transition.ready
      .then(() =>
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 340,
            easing: "cubic-bezier(0.22, 0.76, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
    const cleanup = () => {
      if (active.current !== transition) return;
      active.current = null;
      root.classList.remove("theme-revealing");
    };
    void transition.finished.then(cleanup, cleanup);
  }

  return (
    <label className="mode-switch" title="Toggle light and dark mode">
      <input
        id="theme-toggle"
        type="checkbox"
        role="switch"
        aria-label="Dark mode"
        checked={state.theme === "dark"}
        onChange={changeTheme}
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
  );
}
