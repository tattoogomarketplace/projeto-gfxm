'use client';

import { User, PenTool, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export type RegisterRole = 'cliente' | 'tatuador' | 'estudio';

const ROLES: Array<{
  value: RegisterRole;
  label: string;
  description: string;
  icon: typeof User;
}> = [
  {
    value: 'cliente',
    label: 'Cliente',
    description: 'Encontre artistas e agende sessões',
    icon: User,
  },
  {
    value: 'tatuador',
    label: 'Tatuador',
    description: 'Mostre sua arte e gerencie a agenda',
    icon: PenTool,
  },
  {
    value: 'estudio',
    label: 'Estúdio',
    description: 'Homologue artistas e o ateliê',
    icon: Building2,
  },
];

type RoleSelectorProps = {
  value: RegisterRole;
  onChange: (role: RegisterRole) => void;
};

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const { triggerHaptic } = useHapticFeedback();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Eu sou</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Seleção de perfil">
        {ROLES.map((role) => {
          const selected = value === role.value;
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                if (selected) return;
                triggerHaptic('light');
                onChange(role.value);
              }}
              className={cn(
                'flex min-h-11 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all duration-200',
                'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70',
                selected
                  ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
              )}
            >
              <Icon
                className={cn('h-4 w-4', selected ? 'text-orange-500' : 'text-zinc-500')}
                strokeWidth={2}
              />
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wide',
                  selected ? 'text-white' : 'text-zinc-400'
                )}
              >
                {role.label}
              </span>
              <span className="hidden text-[9px] leading-tight text-zinc-500 sm:block">
                {role.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
