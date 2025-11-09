'use client';

import { forwardRef, useId } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { getCssVariableWithFallback } from '@/lib/design-system/tokens';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

const slotAttributes = {
  background: 'color.surface.card',
  border: 'color.border.emphasis',
  focus: 'color.focus.ring',
  error: 'color.state.error.border',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, helperText, error, className, style, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedByEntries = [helperId, errorId, rest['aria-describedby']]
      .filter(Boolean)
      .join(' ');

    const inputStyle: CSSProperties & Record<string, string> = {
      ...(style as CSSProperties),
      '--ds-input-background': getCssVariableWithFallback(slotAttributes.background),
      '--ds-input-border': getCssVariableWithFallback(slotAttributes.border),
      '--ds-input-focus': getCssVariableWithFallback(slotAttributes.focus),
      '--ds-input-error': getCssVariableWithFallback(slotAttributes.error),
    };

    return (
      <div className={cn('flex flex-col gap-1 text-sm text-[color:var(--color-content-primary)]', className)}>
        {label && (
          <label className="font-medium" htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-11 rounded-[var(--radii-sm)] border border-[color:var(--ds-input-border)] bg-[color:var(--ds-input-background)] px-4 text-base text-[color:var(--color-content-primary)] shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-input-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background-canvas)]',
            error
              ? 'border-[color:var(--ds-input-error)] ring-1 ring-[color:var(--ds-input-error)]'
              : 'placeholder:text-slate-500',
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedByEntries || undefined}
          style={inputStyle}
          data-slot-background={slotAttributes.background}
          data-slot-border={slotAttributes.border}
          data-slot-focus={slotAttributes.focus}
          data-slot-error={slotAttributes.error}
          {...rest}
        />
        {helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-[color:var(--ds-input-error)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
