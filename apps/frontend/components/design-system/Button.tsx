'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import {
  getCssVariableWithFallback,
} from '@/lib/design-system/tokens';

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
};

const variantSlots: Record<
  ButtonVariant,
  {
    background: string;
    foreground: string;
    border?: string;
    focus?: string;
    progress?: string;
  }
> = {
  primary: {
    background: 'color.action.primary',
    foreground: 'color.content.inverse',
    border: 'color.action.primary',
    focus: 'color.focus.ring',
    progress: 'color.action.primary',
  },
  secondary: {
    background: 'color.action.secondary',
    foreground: 'color.content.primary',
    border: 'color.border.emphasis',
    focus: 'color.focus.ring',
    progress: 'color.action.primary',
  },
  ghost: {
    background: 'color.surface.card',
    foreground: 'color.action.primary',
    border: 'color.surface.card',
    focus: 'color.focus.ring',
    progress: 'color.action.primary',
  },
  destructive: {
    background: 'color.state.error.border',
    foreground: 'color.state.error.content',
    border: 'color.state.error.border',
    focus: 'color.focus.ring',
    progress: 'color.state.error.border',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-11 px-5 text-base',
};

const buildSlotAttributes = (slots: Record<string, string | undefined>) => {
  return Object.entries(slots).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value) {
      acc[`data-slot-${key}`] = value;
    }
    return acc;
  }, {});
};

const spinner = (
  <span
    aria-hidden
    className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"
  />
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      disabled,
      type = 'button',
      style,
      ...rest
    },
    ref,
  ) => {
    const slots = variantSlots[variant];
    const slotAttributes = buildSlotAttributes({
      background: slots.background,
      foreground: slots.foreground,
      border: slots.border,
      focus: slots.focus,
      progress: slots.progress,
    });

    const styleWithVars: CSSVarStyle = {
      ...(style as CSSProperties),
      '--ds-button-bg': getCssVariableWithFallback(slots.background),
      '--ds-button-text': getCssVariableWithFallback(slots.foreground),
      '--ds-button-border': getCssVariableWithFallback(
        slots.border ?? slots.background,
      ),
      '--ds-button-focus': getCssVariableWithFallback(
        slots.focus ?? 'color.focus.ring',
      ),
      '--ds-button-progress': getCssVariableWithFallback(
        slots.progress ?? slots.background,
      ),
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-[var(--radii-sm)] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-button-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background-canvas)] disabled:pointer-events-none disabled:opacity-60',
          {
            'border border-[color:var(--ds-button-border)] bg-[color:var(--ds-button-bg)] text-[color:var(--ds-button-text)] shadow-sm hover:bg-[color:var(--ds-button-bg)]/90':
              variant === 'primary',
            'border border-[color:var(--ds-button-border)] bg-[color:var(--ds-button-bg)] text-[color:var(--ds-button-text)] hover:bg-[color:var(--ds-button-bg)]/80':
              variant === 'secondary',
            'bg-transparent text-[color:var(--ds-button-text)] hover:bg-[color:var(--ds-button-bg)]/40':
              variant === 'ghost',
            'border border-[color:var(--ds-button-border)] bg-[color:var(--ds-button-bg)] text-[color:var(--ds-button-text)] shadow-[0_10px_15px_-3px_rgba(153,27,27,0.35)] hover:bg-[color:var(--ds-button-bg)]/90':
              variant === 'destructive',
          },
          sizeClasses[size],
          className,
        )}
        aria-disabled={disabled || loading ? 'true' : undefined}
        data-state={loading ? 'loading' : 'ready'}
        style={styleWithVars}
        {...slotAttributes}
        {...rest}
        disabled={disabled || loading}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-[color:var(--ds-button-text)]">
            {spinner}
            <span className="text-sm font-medium">{children}</span>
          </span>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
