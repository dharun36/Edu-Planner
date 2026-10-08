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
  // dark = strong (≥ 70%)
  // medium = developing (40-69%)
  // light-gray = needs attention (< 40%)
  let fillBg = 'bg-[#0A0A0A]';
  if (variant === 'adaptive') {
    if (percentage >= 70) {
      fillBg = 'bg-[#0A0A0A]';
    } else if (percentage >= 40) {
      fillBg = 'bg-[#525252]';
    } else {
      fillBg = 'bg-[#A3A3A3]';
    }
  } else if (variant === 'medium') {
    fillBg = 'bg-[#525252]';
  } else {
    fillBg = 'bg-[#0A0A0A]';
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-[#E5E5E5] rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', fillBg)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-[11px] text-[#737373]">
          <span>Progress</span>
          <span className="font-semibold text-[#0A0A0A]">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
