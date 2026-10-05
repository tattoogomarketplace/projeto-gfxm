'use client';

import { useSyncExternalStore } from 'react';
import {
  BellRing,
  CalendarClock,
  MessageCircle,
  Megaphone,
  ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
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

function PreferenceToggle({
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
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]/70'
      )}
    >
      <span
        className={cn(
          'relative h-7 w-11 rounded-full transition-all duration-200',
          checked
            ? 'bg-[#FF5722] shadow-[0_0_16px_rgba(255,87,34,0.45)]'
            : 'bg-zinc-700 light:bg-zinc-300'
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
}

export function NotificationPreferences() {
  const prefs = useSyncExternalStore(
    subscribeNotificationPrefs,
    getNotificationPrefsSnapshot,
    getNotificationPrefsServerSnapshot
  );
  const { triggerHaptic } = useHapticFeedback();

  const handleToggle = (key: NotificationPrefKey, title: string) => {
    const nextValue = !prefs[key];
    setNotificationPref(key, nextValue);
    triggerHaptic(nextValue ? 'success' : 'light');
    toast.success(nextValue ? `${title} ativado.` : `${title} desativado.`);
  };

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all duration-300 hover:border-[#FF5722]/40 light:border-black/10 light:bg-white/80">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#FF5722]/30 bg-[#FF5722]/10 text-[#FF5722] shadow-[0_0_18px_rgba(255,87,34,0.22)]">
          <BellRing className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#FF5722]">Central de Notificações</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
            Escolha o que chega no e-mail e no app. A alteração é salva neste dispositivo na hora.
          </p>
        </div>
      </div>
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
                  ? 'border-[#FF5722]/30 bg-[#FF5722]/5'
                  : 'border-white/10 bg-white/5 light:border-black/10 light:bg-black/[0.03]'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all duration-200',
                  checked
                    ? 'border-[#FF5722]/50 bg-[#FF5722]/15 text-[#FF5722]'
                    : 'border-white/10 bg-white/5 text-zinc-400 light:border-black/10 light:bg-black/5'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  id={labelId}
                  className="block text-sm font-medium text-white light:text-zinc-900"
                >
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 light:text-zinc-600">
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
    </section>
  );
}
