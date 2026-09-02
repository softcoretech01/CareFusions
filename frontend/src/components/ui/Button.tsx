
type ButtonVariant = 'filled' | 'outline' | 'text';
type ButtonColor = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  icon?: React.ElementType;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | string;
  children?: React.ReactNode;
}

export const Button = ({
  variant = 'filled',
  color = 'primary',
  icon: Icon,
  isLoading,
  children,
  className = '',
  disabled,
  size = 'md',
  ...props
}: ButtonProps) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm': return 'px-4 py-1.5 text-sm';
      case 'lg': return 'px-8 py-3 text-lg';
      default: return 'px-6 py-2.5';
    }
  };

  const baseStyles = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getSizeStyles()}`;
  
  const getStyles = () => {
    // Primary (Emerald)
    if (color === 'primary') {
      if (variant === 'filled') return 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30';
      if (variant === 'outline') return 'border-2 border-primary text-primary hover:bg-primary/10';
      if (variant === 'text') return 'text-primary hover:bg-primary/10';
    }
    
    // Secondary (Gold)
    if (color === 'secondary') {
      if (variant === 'filled') return 'bg-white border-2 border-secondary text-secondary hover:bg-secondary hover:text-white shadow-sm';
      if (variant === 'outline') return 'border-2 border-secondary text-secondary hover:bg-secondary/10';
      if (variant === 'text') return 'text-secondary hover:bg-secondary/10';
    }

    // Danger (Red)
    if (color === 'danger') {
      if (variant === 'filled') return 'bg-danger text-white hover:bg-red-700 shadow-md shadow-danger/20';
      if (variant === 'outline') return 'border-2 border-danger text-danger hover:bg-danger/10';
      if (variant === 'text') return 'text-danger hover:bg-danger/10';
    }

    return '';
  };

  return (
    <button 
      className={`${baseStyles} ${getStyles()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-5 h-5" />
      ) : null}
      {children}
    </button>
  );
};
