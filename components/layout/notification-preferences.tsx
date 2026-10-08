'use client';

import { memo, useCallback, useSyncExternalStore } from 'react';
import {
  BellRing,
  CalendarClock,
  MessageCircle,
  Megaphone,
  ScrollText,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import {
  getNotificationPrefsServerSnapshot,
  getNotificationPrefsSnapshot,
  setNotificationPref,
  subscribeNotificationPrefs,
  type NotificationPrefKey,
} from '@/lib/notification-preferences';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{
  key: NotificationPrefKey;
  title: string;
  description: string;
  icon: typeof CalendarClock;
}> = [
  {
    key: 'reminders',
    title: 'Lembretes de Agendamento',
    description: 'E-mail e app avisam antes da sessão para você não perder o horário.',
    icon: CalendarClock,
  },
  {
    key: 'chat',
    title: 'Alertas de Novas Mensagens no Chat',
    description: 'Receba um aviso assim que o artista, cliente ou estúdio responder.',
    icon: MessageCircle,
  },
  {
    key: 'proposals',
    title: 'Atualizações de Propostas e Orçamentos',
    description: 'Acompanhe mudanças de valor, aceite e status do orçamento.',
    icon: ScrollText,
  },
  {
    key: 'marketing',
    title: 'Avisos de Marketing e Novidades da Plataforma',
    description: 'Lançamentos, campanhas e novidades do TattooGo MK. Opcional.',
    icon: Megaphone,
  },
];

const PreferenceToggle = memo(function PreferenceToggle({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: () => void;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/70'
      )}
    >
      <span
        className={cn(
          'relative h-7 w-11 rounded-full transition-all duration-200',
          checked
            ? 'bg-[#F97316] shadow-[0_0_16px_rgba(249,115,22,0.45)]'
            : 'bg-neutral-300 dark:bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
            checked ? 'left-5' : 'left-1'
          )}
        />
      </span>
    </button>
  );
});

type NotificationPreferencesProps = {
  embedded?: boolean;
};

export const NotificationPreferences = memo(function NotificationPreferences({
  embedded = false,
}: NotificationPreferencesProps) {
  const prefs = useSyncExternalStore(
    subscribeNotificationPrefs,
    getNotificationPrefsSnapshot,
    getNotificationPrefsServerSnapshot
  );
  const { triggerHaptic } = useHapticFeedback();

  const handleToggle = useCallback(
    (key: NotificationPrefKey, title: string) => {
      const nextValue = !prefs[key];
      setNotificationPref(key, nextValue);
      triggerHaptic(nextValue ? 'success' : 'light');
      toast.success(nextValue ? `${title} ativado.` : `${title} desativado.`);
    },
    [prefs, triggerHaptic]
  );

  const list = (
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const checked = prefs[option.key];
          const labelId = `notif-${option.key}`;
          return (
            <div
              key={option.key}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200',
                checked
                  ? 'border-[#F97316]/30 bg-[#F97316]/5'
                  : 'border-black/[0.04] bg-neutral-50 dark:border-white/[0.05] dark:bg-white/5'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all duration-200',
                  checked
                    ? 'border-[#F97316]/50 bg-[#F97316]/15 text-[#F97316]'
                    : 'border-black/[0.04] bg-white text-neutral-500 dark:border-white/[0.05] dark:bg-white/5 dark:text-zinc-400'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  id={labelId}
                  className="block text-sm font-medium text-neutral-900 dark:text-white"
                >
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
                  {option.description}
                </span>
              </span>
              <PreferenceToggle
                checked={checked}
                labelledBy={labelId}
                onChange={() => handleToggle(option.key, option.title)}
              />
            </div>
          );
        })}
      </div>
  );

  if (embedded) return list;

  return (
    <section className="space-y-4 rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#F97316]/40 dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#F97316]/30 bg-[#F97316]/10 text-[#F97316] shadow-[0_0_18px_rgba(249,115,22,0.22)]">
          <BellRing className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#F97316]">Central de Notificações</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
            Escolha o que chega no e-mail e no app. A alteração é salva neste dispositivo na hora.
          </p>
        </div>
      </div>
      {list}
    </section>
  );
});
