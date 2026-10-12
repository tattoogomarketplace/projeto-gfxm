'use client';

import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';

type TattooMachineMenuTriggerProps = {
  open?: boolean;
  onClick: () => void;
};

export function TattooMachineMenuTrigger({ open = false, onClick }: TattooMachineMenuTriggerProps) {
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      aria-label={t('profile.settingsAndActivity')}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        'flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl',
        'text-zinc-400 transition-all duration-200 ease-out',
        'hover:bg-white/[0.05] hover:text-zinc-100',
        'active:scale-[0.96] active:bg-orange-500/10 active:text-orange-400',
        open && 'bg-orange-500/15 text-orange-400'
      )}
    >
      <Settings className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}
