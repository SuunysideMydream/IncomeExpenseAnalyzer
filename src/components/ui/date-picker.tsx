import { useRef, useState, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Finance, monthText, nextMonth } from "../../lib/finance";
import { addDays, calendarDays, dateText, monthDay } from "../../lib/recurring";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function DatePicker({
  id,
  label,
  value,
  onChange,
  mode = "date",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: "date" | "month";
}) {
  const today = Finance.localDate();
  const parsed = mode === "month" ? `${value}-01` : value;
  const valid = Finance.validDate(parsed);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(today);
  const [monthGrid, setMonthGrid] = useState(mode === "month");
  const panel = useRef<HTMLDivElement>(null);
  const period = cursor.slice(0, 7);
  const year = period.slice(0, 4);
  const days = monthGrid ? [] : calendarDays(period);
  const rows = Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
  const focusCell = () =>
    panel.current
      ?.querySelector<HTMLButtonElement>(".date-picker-cell[tabindex='0']")
      ?.focus({ preventScroll: true });
  const changeOpen = (next: boolean) => {
    if (next) {
      setCursor(valid ? parsed : today);
      setMonthGrid(mode === "month");
    }
    setOpen(next);
  };
  const move = (day: string, focus = false) => {
    if (!Finance.validDate(day)) return;
    setCursor(day);
    if (focus) requestAnimationFrame(focusCell);
  };
  const moveMonth = (offset: number, focus = false) => {
    const target = nextMonth(period, offset);
    if (Finance.validDate(`${target}-01`))
      move(monthDay(target, Number(cursor.slice(8))), focus);
  };
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  function navigateGrid(event: KeyboardEvent) {
    const arrows: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: monthGrid ? -4 : -7,
      ArrowDown: monthGrid ? 4 : 7,
    };
    if (Object.hasOwn(arrows, event.key)) {
      event.preventDefault();
      if (monthGrid) moveMonth(arrows[event.key], true);
      else move(addDays(cursor, arrows[event.key]), true);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveMonth(
        (event.key === "PageUp" ? -1 : 1) *
          (monthGrid || event.shiftKey ? 12 : 1),
        true,
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (monthGrid) {
        move(`${year}-${event.key === "Home" ? "01" : "12"}-01`, true);
      } else {
        const weekday = new Date(`${cursor}T12:00:00Z`).getUTCDay();
        move(
          addDays(cursor, event.key === "Home" ? -weekday : 6 - weekday),
          true,
        );
      }
    }
  }
  const step = monthGrid ? 12 : 1;
  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Anchor asChild>
        <div className="date-picker-field">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={mode === "month" ? "YYYY-MM" : "YYYY-MM-DD"}
            maxLength={mode === "month" ? 7 : 10}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(value) && !valid}
            onKeyDown={(event) => {
              if (event.altKey && event.key === "ArrowDown") {
                event.preventDefault();
                changeOpen(true);
              }
            }}
          />
          <Popover.Trigger asChild>
            <button type="button" aria-label={`Choose ${label.toLowerCase()}`}>
              <CalendarDays size={17} />
            </button>
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          ref={panel}
          className="date-picker-popover"
          aria-label={
            mode === "month"
              ? `Choose month for ${label}`
              : `Calendar for ${label}`
          }
          align="start"
          sideOffset={7}
          collisionPadding={10}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusCell();
          }}
        >
          <div className="date-picker-heading">
            <button
              type="button"
              className="date-picker-arrow"
              aria-label={monthGrid ? "Previous year" : "Previous month"}
              disabled={!Finance.validDate(`${nextMonth(period, -step)}-01`)}
              onClick={() => moveMonth(-step)}
            >
              <ChevronLeft size={17} />
            </button>
            {mode === "date" ? (
              <button
                type="button"
                className="date-picker-period"
                aria-label={monthGrid ? "Show days" : "Browse months"}
                onClick={() => setMonthGrid(!monthGrid)}
              >
                {monthGrid ? year : monthText(period)} <ChevronDown size={13} />
              </button>
            ) : (
              <strong className="date-picker-period" aria-live="polite">
                {year}
              </strong>
            )}
            <button
              type="button"
              className="date-picker-arrow"
              aria-label={monthGrid ? "Next year" : "Next month"}
              disabled={!Finance.validDate(`${nextMonth(period, step)}-01`)}
              onClick={() => moveMonth(step)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          {monthGrid ? (
            <div
              className="date-picker-grid month-grid"
              role="grid"
              aria-label={`Months in ${year}`}
              onKeyDown={navigateGrid}
            >
              {[0, 4, 8].map((start) => (
                <div key={start} role="row" className="date-picker-row">
                  {months.slice(start, start + 4).map((name, index) => {
                    const item = `${year}-${String(start + index + 1).padStart(2, "0")}`;
                    return (
                      <div
                        key={item}
                        role="gridcell"
                        aria-selected={valid && parsed.startsWith(item)}
                      >
                        <button
                          type="button"
                          className="date-picker-cell"
                          tabIndex={item === period ? 0 : -1}
                          aria-label={monthText(item)}
                          aria-current={
                            today.startsWith(item) ? "date" : undefined
                          }
                          onClick={() => {
                            if (mode === "month") choose(item);
                            else {
                              setMonthGrid(false);
                              move(
                                monthDay(item, Number(cursor.slice(8))),
                                true,
                              );
                            }
                          }}
                        >
                          {name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="date-picker-grid"
              role="grid"
              aria-label={monthText(period)}
              onKeyDown={navigateGrid}
            >
              <div role="row" className="date-picker-row date-picker-week">
                {weekdays.map((day) => (
                  <span key={day} role="columnheader">
                    {day}
                  </span>
                ))}
              </div>
              {rows.map((week, index) => (
                <div key={index} role="row" className="date-picker-row">
                  {week.map((day, index) => {
                    const available = Finance.validDate(day);
                    return (
                      <div
                        key={index}
                        role="gridcell"
                        aria-selected={value === day}
                      >
                        <button
                          type="button"
                          className={`date-picker-cell${day.startsWith(period) ? "" : " is-adjacent"}`}
                          tabIndex={day === cursor ? 0 : -1}
                          disabled={!available}
                          aria-label={
                            available ? dateText(day, "long") : undefined
                          }
                          aria-current={day === today ? "date" : undefined}
                          onClick={() => choose(day)}
                        >
                          {available ? Number(day.slice(8)) : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="date-picker-footer">
            <button
              type="button"
              className="link-button"
              onClick={() => choose("")}
            >
              Clear
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                choose(mode === "month" ? today.slice(0, 7) : today)
              }
            >
              {mode === "month" ? "This month" : "Today"}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
