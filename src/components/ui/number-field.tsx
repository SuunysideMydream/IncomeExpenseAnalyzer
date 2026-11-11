import { useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function NumberField({
  id,
  label,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const step = (delta: number) => {
    const field = input.current;
    if (!field) return;
    field.stepUp(delta);
    onChange(field.value);
  };
  return (
    <div className="number-field">
      <input
        ref={input}
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="number-field-steps">
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value !== "" && Number(value) >= max}
          onClick={() => step(1)}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value === "" || Number(value) <= min}
          onClick={() => step(-1)}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
