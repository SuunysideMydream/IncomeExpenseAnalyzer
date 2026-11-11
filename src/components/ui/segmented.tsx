import { useId } from "react";
import { LayoutGroup, motion } from "motion/react";
import { useApp } from "../../context";
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  const id = useId(),
    { calm } = useApp();
  return (
    <LayoutGroup id={id}>
      <div
        className="view-switch ui-segments react-segmented"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const at = options.findIndex((row) => row.value === value);
                const index =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? options.length - 1
                      : (at +
                          (event.key === "ArrowLeft" ? -1 : 1) +
                          options.length) %
                        options.length;
                onChange(options[index].value);
                (
                  event.currentTarget.parentElement?.children[
                    index
                  ] as HTMLElement
                )?.focus();
              }
            }}
          >
            {value === option.value && (
              <motion.span
                className="react-segment-marker"
                aria-hidden="true"
                layoutId="selection"
                transition={
                  calm
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0, duration: 0.32 }
                }
              />
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
