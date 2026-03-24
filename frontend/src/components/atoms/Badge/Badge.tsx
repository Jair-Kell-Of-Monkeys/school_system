import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
  dot?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  default: 'bg-gray-400',
};

export const Badge = ({ children, variant = 'default', className, dot = false }: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        `badge-${variant}`,
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLORS[variant])} aria-hidden />
      )}
      {children}
    </span>
  );
};
