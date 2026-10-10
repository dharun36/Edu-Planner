import React, { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-medium uppercase tracking-wider text-[#525252] dark:text-[#A3A3A3]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#171717] px-3.5 py-2 text-sm text-[#0A0A0A] dark:text-[#FAFAFA] placeholder:text-[#A3A3A3] dark:placeholder:text-[#737373] focus-visible:outline-none focus-visible:border-[#0A0A0A] dark:focus-visible:border-[#FAFAFA] focus-visible:ring-1 focus-visible:ring-[#0A0A0A] dark:focus-visible:ring-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-[#262626] dark:border-red-500 focus-visible:ring-[#262626]",
            className
          )}
          {...props}
        />
        {helperText && !error && <span className="text-xs text-[#737373] dark:text-[#A3A3A3]">{helperText}</span>}
        {error && <span className="text-xs text-[#262626] dark:text-red-400 font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

