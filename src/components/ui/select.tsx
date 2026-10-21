import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}
export function Select({
  id,
  label,
  value,
  onChange,
  options,
  name,
  disabled,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  name?: string;
  disabled?: boolean;
}) {
  // Radix reserves an empty item value; retain the ledger's empty-string semantics.
  const encode = (value: string) => `mw:${value}`;
  return (
    <div className="ui-select">
      <Primitive.Root
        value={encode(value)}
        onValueChange={(next) => onChange(next.slice(3))}
        name={name}
        disabled={disabled}
      >
        <Primitive.Trigger
          id={id}
          className="ui-select-trigger"
          aria-label={label}
        >
          <Primitive.Value />
          <Primitive.Icon>
            <ChevronDown size={14} />
          </Primitive.Icon>
        </Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            position="popper"
            sideOffset={7}
            collisionPadding={12}
            className="react-select-content"
          >
            <Primitive.ScrollUpButton className="react-select-scroll">
              <ChevronUp size={14} />
            </Primitive.ScrollUpButton>
            <Primitive.Viewport>
              {options.map((option) => (
                <Primitive.Item
                  className="ui-option"
                  key={option.value}
                  value={encode(option.value)}
                  disabled={option.disabled}
                >
                  <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  <Primitive.ItemIndicator>
                    <Check size={14} />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.Viewport>
            <Primitive.ScrollDownButton className="react-select-scroll">
              <ChevronDown size={14} />
            </Primitive.ScrollDownButton>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </div>
  );
}
