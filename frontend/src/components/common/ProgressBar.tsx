import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'dark' | 'medium' | 'adaptive';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'adaptive',
  className,
  size = 'md',
  showLabel = false,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  // Adaptive fill based on prompt:
  // In dark mode, fill should be high-contrast (#FAFAFA) and track should be dark-gray (#262626)
  let fillBg = 'bg-[#0A0A0A] dark:bg-[#FAFAFA]';
  if (variant === 'adaptive') {
    if (percentage >= 70) {
      fillBg = 'bg-[#0A0A0A] dark:bg-[#FAFAFA]';
    } else if (percentage >= 40) {
      fillBg = 'bg-[#525252] dark:bg-[#E5E5E5]';
    } else {
      fillBg = 'bg-[#737373] dark:bg-[#D4D4D4]';
    }
  } else if (variant === 'medium') {
    fillBg = 'bg-[#525252] dark:bg-[#E5E5E5]';
  } else {
    fillBg = 'bg-[#0A0A0A] dark:bg-[#FAFAFA]';
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-[#E5E5E5] dark:bg-[#262626] rounded-full overflow-hidden border border-transparent dark:border-[#383838]', sizeClasses[size])}>
        <div
          data-progress-bar-fill="true"
          className={cn('h-full rounded-full transition-all duration-500 ease-out', fillBg)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-[11px] text-[#737373] dark:text-[#A3A3A3]">
          <span>Progress</span>
          <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
