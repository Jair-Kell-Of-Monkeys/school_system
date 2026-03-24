import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading, className, disabled, ...props }, ref) => {
    const base = clsx(
      'inline-flex items-center justify-center font-semibold rounded-lg',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'active:scale-[.97]',
    );

    const variants: Record<string, string> = {
      primary: clsx(
        'bg-gradient-brand text-white',
        'hover:brightness-110 hover:-translate-y-px hover:shadow-glow',
        'focus-visible:ring-primary-500',
      ),
      secondary: clsx(
        'bg-surface border border-theme text-[var(--text-secondary)]',
        'hover:bg-surface-2 hover:border-theme-strong hover:-translate-y-px',
        'focus-visible:ring-primary-500',
      ),
      outline: clsx(
        'border-2 border-primary-500 text-primary-600 bg-transparent',
        'hover:bg-primary-50 hover:-translate-y-px dark:hover:bg-primary-950',
        'focus-visible:ring-primary-500',
      ),
      ghost: clsx(
        'text-[var(--text-secondary)] bg-transparent',
        'hover:bg-surface-3 hover:text-[var(--text-primary)]',
        'focus-visible:ring-primary-500',
      ),
      danger: clsx(
        'bg-red-600 text-white',
        'hover:bg-red-700 hover:-translate-y-px',
        'focus-visible:ring-red-500',
      ),
      success: clsx(
        'bg-emerald-600 text-white',
        'hover:bg-emerald-700 hover:-translate-y-px',
        'focus-visible:ring-emerald-500',
      ),
    };

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-2.5 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
