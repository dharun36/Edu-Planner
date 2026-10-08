import React from 'react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-[#E5E5E5] rounded-xl bg-white max-w-lg mx-auto',
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mb-4 text-[#262626]">
          <Icon className="w-5 h-5 stroke-[1.5]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[#0A0A0A] tracking-tight">{title}</h3>
      <p className="text-sm text-[#737373] mt-1.5 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
