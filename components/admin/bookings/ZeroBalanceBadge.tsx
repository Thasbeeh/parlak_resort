import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ZeroBalanceBadgeProps {
  balanceDue: number;
  className?: string;
}

export function ZeroBalanceBadge({ balanceDue, className }: ZeroBalanceBadgeProps) {
  const roundedBalance = isNaN(Number(balanceDue)) ? 0 : Math.round(Number(balanceDue));
  const isSettled = roundedBalance <= 0;

  if (isSettled) {
    return (
      <span
        data-slot="zero-balance-badge"
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tabular-nums select-none border',
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          className
        )}
      >
        Settled: ₹&nbsp;0
      </span>
    );
  }

  return (
    <span
      data-slot="zero-balance-badge"
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tabular-nums select-none border',
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        className
      )}
    >
      Due: ₹&nbsp;{roundedBalance.toLocaleString('en-IN')}
    </span>
  );
}

export default ZeroBalanceBadge;
