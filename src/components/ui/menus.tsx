import type { ReactNode } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Context from "@radix-ui/react-context-menu";
export interface MenuItem {
  label: string;
  icon?: ReactNode;
  action: () => void;
  danger?: boolean;
}
export function DropdownMenu({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="react-menu"
          align="end"
          sideOffset={10}
          aria-label={label}
        >
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              className={item.danger ? "is-danger" : ""}
              onSelect={item.action}
            >
              {item.icon}
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function ContextMenu({
  children,
  items,
}: {
  children: ReactNode;
  items: MenuItem[];
}) {
  return (
    <Context.Root>
      <Context.Trigger asChild>{children}</Context.Trigger>
      <Context.Portal>
        <Context.Content className="react-menu">
          {items.map((item) => (
            <Context.Item
              key={item.label}
              className={item.danger ? "is-danger" : ""}
              onSelect={item.action}
            >
              {item.icon}
              {item.label}
            </Context.Item>
          ))}
        </Context.Content>
      </Context.Portal>
    </Context.Root>
  );
}
