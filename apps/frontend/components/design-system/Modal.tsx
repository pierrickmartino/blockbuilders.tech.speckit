'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { getCssVariableWithFallback } from '@/lib/design-system/tokens';

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  testId,
}: ModalProps) => {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const focusables = useCallback((): HTMLElement[] => {
    if (!dialogRef.current) {
      return [];
    }
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.hasAttribute('disabled'));
  }, []);

  const previouslyFocusedElement = useCallback(
    () => previousFocusRef.current,
    [],
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (!open) {
      document.body.style.removeProperty('overflow');
      previouslyFocusedElement()?.focus();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusables = focusables();
      if (currentFocusables.length === 0) {
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.target === overlayRef.current) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    overlayRef.current?.addEventListener('mousedown', handleMouseDown);

    let focusTimeout: number | undefined;
    if (typeof window !== 'undefined') {
      focusTimeout = window.setTimeout(() => {
        const currentFocusables = focusables();
        const first = currentFocusables[0];
        if (first) {
          first.focus();
        }
      }, 0);
    }

    return () => {
      if (focusTimeout) {
        window.clearTimeout(focusTimeout);
      }
      document.removeEventListener('keydown', handleKeyDown);
      overlayRef.current?.removeEventListener('mousedown', handleMouseDown);
      document.body.style.removeProperty('overflow');
      previousFocusRef.current?.focus();
    };
  }, [focusables, onOpenChange, open, previouslyFocusedElement]);

  const styleWithVars: CSSVarStyle = useMemo(
    () => ({
      '--ds-modal-surface': getCssVariableWithFallback('color.surface.card'),
      '--ds-modal-border': getCssVariableWithFallback('color.border.subtle'),
      '--ds-modal-focus': getCssVariableWithFallback('color.focus.ring'),
      '--ds-modal-shadow': getCssVariableWithFallback('shadow.elevation.high'),
    }),
    [],
  );

  const overlayStyle = useMemo<CSSProperties>(() => ({
    backgroundColor: getCssVariableWithFallback('color.overlay.scrim'),
  }), []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    open ? (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        data-slot-overlay="color.overlay.scrim"
        style={overlayStyle}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          data-slot-surface="color.surface.card"
          data-slot-border="color.border.subtle"
          data-slot-focus="color.focus.ring"
          className={cn(
            'w-full max-w-lg rounded-[var(--radii-lg)] border border-[color:var(--ds-modal-border)] bg-[color:var(--ds-modal-surface)] p-6 shadow-[var(--ds-modal-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-modal-focus)]',
          )}
          style={styleWithVars}
          data-testid={testId}
        >
          <header className="space-y-2">
            <h2 id={titleId} className="text-xl font-semibold text-[color:var(--color-content-primary)]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-slate-500">
                {description}
              </p>
            )}
          </header>
          <div className="mt-4 space-y-4 text-sm text-[color:var(--color-content-primary)]">
            {children}
          </div>
          {footer && <footer className="mt-6 flex flex-wrap gap-3">{footer}</footer>}
        </div>
      </div>
    ) : null,
    document.body,
  );
};
