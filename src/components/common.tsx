import type { ReactNode } from "react";
import { useApp } from "../context";
import { monthText } from "../lib/finance";
import { Select } from "./ui/select";
export function MonthPicker({
  value,
  onChange,
  label = "Month",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { model } = useApp();
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[...new Set([...model.months, value])]
        .sort()
        .reverse()
        .map((month) => ({ value: month, label: monthText(month) }))}
    />
  );
}
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
