'use client';

import { forwardRef, useId } from 'react';
import type {
  CSSProperties,
  SelectHTMLAttributes,
  ChangeEvent,
} from 'react';
import { cn } from '@/lib/cn';
import { getCssVariableWithFallback } from '@/lib/design-system/tokens';

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>['onChange'];
}

const selectSlots = {
  background: 'color.surface.card',
  border: 'color.border.emphasis',
  focus: 'color.focus.ring',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      className,
      style,
      options,
      placeholder,
      onValueChange,
      onChange,
      value,
      defaultValue,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [helperId, errorId, ariaDescribedBy]
      .filter(Boolean)
      .join(' ');

    const selectStyle: CSSVarStyle = {
      ...(style as CSSProperties),
      '--ds-select-background': getCssVariableWithFallback(selectSlots.background),
      '--ds-select-border': getCssVariableWithFallback(selectSlots.border),
      '--ds-select-focus': getCssVariableWithFallback(selectSlots.focus),
    };

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      onValueChange?.(event.target.value);
      onChange?.(event);
    };

    const controlProps =
      value !== undefined
        ? { value }
        : defaultValue !== undefined
          ? { defaultValue }
          : undefined;

    return (
      <div className={cn('flex flex-col gap-1 text-sm', className)}>
        {label && (
          <label className="font-medium" htmlFor={selectId}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            role="combobox"
            aria-haspopup="listbox"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'h-11 w-full appearance-none rounded-[var(--radii-sm)] border border-[color:var(--ds-select-border)] bg-[color:var(--ds-select-background)] px-4 text-base text-[color:var(--color-content-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-select-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background-canvas)]',
              error ? 'border-[color:var(--color-state-error-border)]' : undefined,
            )}
            data-slot-background={selectSlots.background}
            data-slot-border={selectSlots.border}
            data-slot-focus={selectSlots.focus}
            style={selectStyle}
            onChange={handleChange}
            {...(controlProps ?? {})}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
            ▾
          </span>
        </div>
        {helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-[color:var(--color-state-error-content)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
