import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none';
    
    const variants = {
      primary: 'bg-[#0A0A0A] text-white hover:bg-[#262626] active:bg-[#171717]',
      secondary: 'bg-white text-[#0A0A0A] border border-[#E5E5E5] hover:bg-[#F5F5F5] active:bg-[#E5E5E5]',
      outline: 'bg-transparent text-[#0A0A0A] border border-[#262626] hover:bg-[#F5F5F5] active:bg-[#E5E5E5]',
      ghost: 'bg-transparent text-[#262626] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]',
      danger: 'bg-[#262626] text-white hover:bg-[#0A0A0A]',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

