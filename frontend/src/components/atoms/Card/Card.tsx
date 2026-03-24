import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = ({ children, className, padding = 'md', hover = false }: CardProps) => {
  const paddings: Record<string, string> = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-7',
  };

  return (
    <div
      className={clsx(
        'surface animate-fade-in',
        paddings[padding],
        hover && 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};
