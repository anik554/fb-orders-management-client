'use client';

import Link from 'next/link';
import { forwardRef } from 'react';

/** Tiny class joiner. Not worth a dependency for what this does. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------- Button */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'facebook';
type ButtonSize = 'sm' | 'md';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition ' +
  'disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap';

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-content text-canvas hover:opacity-90',
  secondary:
    'border border-border-strong bg-surface text-content hover:bg-surface-sunken',
  ghost: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  danger: 'border border-danger/40 text-danger hover:bg-danger-soft',
  facebook: 'bg-brand text-brand-contrast hover:bg-brand-hover',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = 'secondary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      // A loading button that stays clickable submits twice.
      disabled={disabled || loading}
      className={cx(BUTTON_BASE, BUTTON_TONES[tone], BUTTON_SIZES[size], className)}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------------------------------------------------- Badge */

export type BadgeTone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger' | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-content-muted',
  brand: 'bg-brand-soft text-brand',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------- Card */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        'rounded-card border border-border-subtle bg-surface shadow-card',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-content">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-content-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- Inputs */

const FIELD_BASE =
  'w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-content ' +
  'placeholder:text-content-faint focus:border-brand focus:outline-none disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(FIELD_BASE, 'h-9', className)} {...rest} />;
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(FIELD_BASE, 'h-9 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(FIELD_BASE, 'py-2', className)} {...rest} />;
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-content-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-content-faint">{hint}</span>}
    </label>
  );
}

/* ----------------------------------------------------------------- Feedback */

export function Notice({
  tone,
  title,
  children,
}: {
  tone: 'positive' | 'warning' | 'danger' | 'info';
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    positive: 'bg-positive-soft text-positive',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  } as const;

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('rounded-lg px-3 py-2 text-sm', tones[tone])}
    >
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? 'mt-0.5 text-[13px] opacity-90' : undefined}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <div className="max-w-xs">
        <p className="text-sm font-medium text-content">{title}</p>
        {description && <p className="mt-1 text-xs text-content-muted">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/** Skeleton rows, so a loading list holds its shape instead of collapsing. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-surface-sunken', className)} />;
}

/* ------------------------------------------------------------------- Avatar */

/**
 * Initials avatar. Customers arrive as a PSID with no picture — fetching one
 * needs a profile permission this app deliberately does not request — so a
 * stable colour derived from the identifier is the honest alternative.
 */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials =
    name
      .replace(/[^\p{L}\p{N} ]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundColor: `oklch(0.72 0.09 ${hash})`,
        fontSize: size * 0.36,
      }}
      className="grid shrink-0 place-items-center rounded-full font-semibold text-[#10141a]"
    >
      {initials}
    </span>
  );
}

/* -------------------------------------------------------------------- Links */

export function NavLink({
  href,
  active,
  icon,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
        active
          ? 'bg-surface-sunken font-medium text-content'
          : 'text-content-muted hover:bg-surface-sunken hover:text-content',
      )}
    >
      <span className={cx('shrink-0', active ? 'text-brand' : 'text-content-faint')}>{icon}</span>
      <span className="truncate">{children}</span>
      {badge && <span className="ml-auto">{badge}</span>}
    </Link>
  );
}
