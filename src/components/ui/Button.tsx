import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-6 py-2.5 text-base rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary: 'btn-maple-primary',
    secondary: 'btn-maple-secondary',
    outline: 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-500',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 select-none ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export const GradientButton: React.FC<ButtonProps> = (props) => {
  return <Button variant="primary" {...props} />;
};
