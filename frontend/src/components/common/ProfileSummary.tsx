import React from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ProfileSummaryProps {
  name?: string | null;
  roleLabel: string;
  onClick?: () => void;
}

export function ProfileSummary({ name, roleLabel, onClick }: ProfileSummaryProps) {
  const displayName = name?.trim() || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const content = (
    <>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-sm font-semibold text-neutral-100 shadow-inner shadow-black/30">
        {initial || <UserRound className="h-4 w-4" />}
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-neutral-400" />
      </span>
      <span className="hidden min-w-0 text-left sm:block">
        <span className="block max-w-40 truncate text-sm font-semibold leading-5 text-neutral-100">
          {displayName}
        </span>
        <span className="block text-[11px] font-medium leading-4 text-neutral-400">
          {roleLabel}
        </span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-neutral-700 hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
        title="Edit Profile"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl px-2 py-1.5")}>
      {content}
    </div>
  );
}
