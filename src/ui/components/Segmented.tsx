import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

/**
 * A radio group that looks like a segmented control. Real radios underneath, so
 * arrow keys, screen readers and form semantics all behave.
 */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  legend: string;
}) {
  return (
    <fieldset className="segmented">
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={`segmented-option ${value === option.value ? "is-active" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.icon}
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
