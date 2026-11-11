import { useRef } from "react";
import { Search, X } from "lucide-react";

export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="themed-search-field">
      <Search size={17} aria-hidden="true" />
      <input
        ref={input}
        id={id}
        aria-label={label}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
