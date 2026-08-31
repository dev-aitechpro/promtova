import { cn } from '../../utils/cn';

// =============== Button ===============
const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const base = 'btn-press inline-flex items-center justify-center gap-1.5 font-medium transition-colors';
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px] rounded-md',
    md: 'h-9 px-3.5 text-[13px] rounded-md',
    lg: 'h-11 px-5 text-[14px] rounded-lg',
  }[size];

  const variants = {
    primary: {
      background: 'var(--primary-button)',
      color: 'var(--primary-button-text)',
    },
    secondary: {
      background: 'var(--secondary-button)',
      color: 'var(--text-primary)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      background: 'var(--status-error)',
      color: '#fff',
    },
  }[variant];

  return (
    <button
      className={cn(base, sizes, className)}
      style={variants}
      onMouseEnter={(e) => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--primary-button-hover)';
        if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--secondary-button-hover)';
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--primary-button)';
        if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--secondary-button)';
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconButton = ({
  active,
  title,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; title: string }) => (
  <button
    title={title}
    aria-label={title}
    className={cn('btn-press inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors', className)}
    style={{
      background: active ? 'var(--bg-active)' : 'transparent',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
    }}
    {...props}
  >
    {children}
  </button>
);

export default Button;
