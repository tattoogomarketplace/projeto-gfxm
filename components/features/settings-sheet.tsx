'use client';

import { useTheme } from 'next-themes';
import { NativeSheet } from '@/components/ui/native-sheet';
import { ThemeSegmentedControl, type ThemePreference } from '@/components/ui/segmented-control';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useUiStore } from '@/hooks/use-ui-store';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { theme, setTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const hapticsEnabled = useUiStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useUiStore((s) => s.setHapticsEnabled);

  const preference = (theme as ThemePreference | undefined) || 'dark';

  return (
    <NativeSheet open={open} onClose={onClose} title="Ajustes">
      <div className="space-y-6 pb-[env(safe-area-inset-bottom)]">
        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">Aparência</h3>
          <ThemeSegmentedControl
            value={preference}
            onChange={(next) => {
              setTheme(next);
              triggerHaptic('medium');
            }}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">Resposta tátil</h3>
          <button
            type="button"
            onClick={() => {
              const next = !hapticsEnabled;
              setHapticsEnabled(next);
              if (next && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(18);
              }
            }}
            className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4"
          >
            <span className="text-sm font-medium text-white">Haptic Feedback</span>
            <span className={`text-sm font-semibold ${hapticsEnabled ? 'text-[#F97316]' : 'text-zinc-500'}`}>
              {hapticsEnabled ? 'Ligado' : 'Desligado'}
            </span>
          </button>
        </section>
      </div>
    </NativeSheet>
  );
}
