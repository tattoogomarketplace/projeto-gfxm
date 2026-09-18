'use client';

import { getPasswordStrength } from '@/lib/utils/password-strength';
import { cn } from '@/lib/utils';

type PasswordStrengthBarProps = {
  password: string;
};

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password);
  const machineLeft = `clamp(0px, calc(${strength.percent}% - 14px), calc(100% - 28px))`;
  const inkTone =
    strength.score >= 5
      ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.55)]'
      : strength.score >= 3
        ? 'bg-amber-500'
        : 'bg-red-500/80';

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', inkTone)}
            style={{ width: `${strength.percent}%` }}
          />
        </div>
        <div
          className={cn(
            'absolute top-1/2 h-7 w-7 -translate-y-1/2 transition-all duration-500 ease-out',
            strength.score > 0 && 'tattoo-machine-buzz'
          )}
          style={{ left: machineLeft }}
          aria-hidden
        >
          <div className="absolute inset-0 rounded-md border-2 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" />
          <div className="absolute inset-[3px] overflow-hidden rounded-[4px] bg-zinc-950">
            <div className="h-full w-full origin-bottom bg-gradient-to-t from-orange-600 via-orange-500 to-amber-400 tattoo-machine-fill" />
          </div>
          <div className="absolute -right-1 top-1/2 h-2.5 w-1.5 -translate-y-1/2 rounded-r-sm bg-orange-500" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.16em]',
            strength.isComplete ? 'text-orange-500' : 'text-zinc-500'
          )}
        >
          {strength.label}
        </p>
        <p className="text-[10px] text-zinc-600">{strength.score}/5</p>
      </div>
      <ul className="grid grid-cols-2 gap-1">
        {strength.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              'text-[10px] tracking-wide',
              check.passed ? 'text-orange-400' : 'text-zinc-600'
            )}
          >
            {check.passed ? '+' : '-'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
