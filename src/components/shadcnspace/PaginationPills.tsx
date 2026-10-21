// Adapted from pagination-pills.tsx; the active pill is a shared-layout spring.
import { useId } from "react";
import { LayoutGroup, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "../../context";
export function PaginationPills({
  total,
  per = 10,
}: {
  total: number;
  per?: number;
}) {
  const { page, setPage, calm } = useApp(),
    id = useId(),
    count = Math.ceil(total / per);
  if (!count) return null;
  const safe = Math.min(page, count - 1),
    pages = [
      ...new Set([
        0,
        count - 1,
        ...[safe - 1, safe, safe + 1].filter(
          (value) => value >= 0 && value < count,
        ),
      ]),
    ].sort((a, b) => a - b);
  const go = (value: number) => {
    setPage(value);
    requestAnimationFrame(() =>
      document.querySelector(".ledger-workspace")?.scrollIntoView({
        block: "start",
        behavior: calm ? "auto" : "smooth",
      }),
    );
  };
  return (
    <div className="ledger-pagination">
      <span>
        Days {safe * per + 1}–{Math.min((safe + 1) * per, total)} of {total}
      </span>
      <LayoutGroup id={id}>
        <nav className="space-pagination" aria-label="Transaction pages">
          <button
            disabled={!safe}
            aria-label="Previous page"
            onClick={() => go(safe - 1)}
          >
            <ArrowLeft />
          </button>
          {pages.map((value, index) => (
            <span className="react-page-item" key={value}>
              {index > 0 && value > pages[index - 1] + 1 && (
                <span className="space-page-gap">…</span>
              )}
              <button
                className={safe === value ? "is-current" : ""}
                aria-label={`Page ${value + 1}`}
                aria-current={safe === value ? "page" : undefined}
                onClick={() => go(value)}
              >
                {safe === value && (
                  <motion.span
                    className="react-page-marker"
                    layoutId="pill-active"
                    transition={
                      calm
                        ? { duration: 0 }
                        : { type: "spring", bounce: 0, duration: 0.35 }
                    }
                  />
                )}
                <span>{value + 1}</span>
              </button>
            </span>
          ))}
          <button
            disabled={safe === count - 1}
            aria-label="Next page"
            onClick={() => go(safe + 1)}
          >
            <ArrowRight />
          </button>
        </nav>
      </LayoutGroup>
    </div>
  );
}
