import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "default";
  size?: "default" | "sm" | "icon" | "icon-sm";
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        variant === "default"
          ? "primary"
          : variant === "outline"
            ? "secondary"
            : variant,
        size.startsWith("icon") && "space-text-icon",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
