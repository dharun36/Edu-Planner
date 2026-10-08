import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'mastered' | 'developing' | 'needs_attention' | 'neutral' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const variants = {
    mastered: 'bg-[#0A0A0A] text-white border border-[#0A0A0A]',
    developing: 'bg-[#F5F5F5] text-[#262626] border border-[#737373]',
    needs_attention: 'bg-white text-[#525252] border border-[#E5E5E5] font-semibold',
    neutral: 'bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]',
    outline: 'bg-transparent text-[#0A0A0A] border border-[#0A0A0A]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium tracking-wide uppercase',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
