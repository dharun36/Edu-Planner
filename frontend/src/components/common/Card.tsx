import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#171717] transition-colors duration-150", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={cn("text-base sm:text-lg font-semibold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: CardProps) {
  return (
    <p className={cn("text-xs sm:text-sm text-[#737373] dark:text-[#A3A3A3]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("p-5 sm:p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}

