import { useEffect, useState, type ReactNode } from "react";
import { Globe, RefreshCw, X } from "lucide-react";
import {
  fetchSiteIcon,
  isSiteIcon,
  normalizeSiteHost,
  type SiteIcon,
} from "../lib/site-icon";
import { RecordIcon } from "./RecordIcon";

export function useSiteIcon(initial?: SiteIcon) {
  const [resolved, setResolved] = useState(() =>
    isSiteIcon(initial) ? initial : undefined,
  );
  const [input, setInput] = useState(() =>
    isSiteIcon(initial) ? initial.host : "",
  );
  const host = normalizeSiteHost(input);
  const pending = Boolean(host && resolved?.host !== host);
  const value = host
    ? resolved?.host === host
      ? resolved
      : { host }
    : undefined;

  useEffect(() => {
    if (!host || resolved?.host === host) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const image = await fetchSiteIcon(host, controller.signal).catch(
        () => undefined,
      );
      if (!controller.signal.aborted) setResolved({ host, image });
    }, 360);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [host, resolved?.host]);

  return {
    input,
    setInput,
    pending,
    value,
    invalid: Boolean(input.trim()) && !host,
    retry: () => setResolved(undefined),
  };
}

export function SiteIconField({
  id,
  lookup,
  fallback = <Globe size={18} />,
}: {
  id: string;
  lookup: ReturnType<typeof useSiteIcon>;
  fallback?: ReactNode;
}) {
  const missing = Boolean(
    lookup.value && !lookup.value.image && !lookup.pending,
  );
  return (
    <div className="field site-icon-field">
      <label htmlFor={id}>
        Website icon <span>(optional)</span>
      </label>
      <div className="site-icon-input">
        <span className="site-icon-swatch" aria-hidden="true">
          <RecordIcon site={lookup.value} size={22} fallback={fallback} />
        </span>
        <input
          id={id}
          value={lookup.input}
          onChange={(event) => lookup.setInput(event.target.value)}
          placeholder="e.g. youtube.com"
          inputMode="url"
          maxLength={2048}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={lookup.invalid}
          aria-describedby={`${id}-hint`}
        />
        {lookup.input && (
          <button
            type="button"
            aria-label="Clear website icon"
            onClick={() => lookup.setInput("")}
          >
            <X size={15} />
          </button>
        )}
      </div>
      <p id={`${id}-hint`} className="site-icon-hint" aria-live="polite">
        {lookup.invalid
          ? "Enter a public website such as youtube.com."
          : lookup.pending
            ? "Looking up the site icon…"
            : lookup.value?.image
              ? `Icon ready for ${lookup.value.host}.`
              : missing
                ? "Icon unavailable. Your fallback stays visible."
                : "Only the hostname is used to look up an icon."}
      </p>
      {missing && (
        <button
          type="button"
          className="link-button site-icon-retry"
          onClick={lookup.retry}
        >
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}
