'use client';

import { User, PenTool, Building2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n/types';

export type RegisterRole = 'cliente' | 'tatuador' | 'estudio';

const ROLES: Array<{
  value: RegisterRole;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof User;
}> = [
  {
    value: 'cliente',
    labelKey: 'role.cliente.label',
    descriptionKey: 'role.cliente.description',
    icon: User,
  },
  {
    value: 'tatuador',
    labelKey: 'role.tatuador.label',
    descriptionKey: 'role.tatuador.description',
    icon: PenTool,
  },
  {
    value: 'estudio',
    labelKey: 'role.estudio.label',
    descriptionKey: 'role.estudio.description',
    icon: Building2,
  },
];

type RoleSelectorProps = {
  value: RegisterRole;
  onChange: (role: RegisterRole) => void;
  lockedRole?: RegisterRole | null;
};

export function RoleSelector({ value, onChange, lockedRole = null }: RoleSelectorProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const isLocked = Boolean(lockedRole);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('role.iAm')}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('role.selectAria')}>
        {ROLES.map((role) => {
          const selected = value === role.value;
          const disabled = isLocked && role.value !== lockedRole;
          const isLockedOption = isLocked && role.value === lockedRole;
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (disabled || selected) return;
                triggerHaptic('light');
                onChange(role.value);
              }}
              className={cn(
                'flex min-h-11 flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                selected
                  ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700',
                disabled && 'cursor-not-allowed opacity-35 grayscale'
              )}
            >
              {isLockedOption ? (
                <Lock className="h-4 w-4 text-orange-500" strokeWidth={2} />
              ) : (
                <Icon
                  className={cn('h-4 w-4', selected ? 'text-orange-500' : 'text-zinc-500')}
                  strokeWidth={2}
                />
              )}
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wide',
                  selected ? 'text-white' : 'text-zinc-400'
                )}
              >
                {t(role.labelKey)}
              </span>
              <span className="text-xs leading-tight text-zinc-500">
                {t(role.descriptionKey)}
              </span>
            </button>
          );
        })}
      </div>
      {isLocked ? (
        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-zinc-500">
          <Lock className="h-3 w-3" strokeWidth={2} />
          {t('role.lockedHint')}
        </p>
      ) : null}
    </div>
  );
}
