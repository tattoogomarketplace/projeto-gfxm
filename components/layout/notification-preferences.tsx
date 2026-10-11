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
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import type { MessageKey } from '@/lib/i18n/types';

const OPTIONS: Array<{
  key: NotificationPrefKey;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  icon: typeof CalendarClock;
}> = [
  {
    key: 'reminders',
    titleKey: 'notif.remindersTitle',
    descriptionKey: 'notif.remindersDesc',
    icon: CalendarClock,
  },
  {
    key: 'chat',
    titleKey: 'notif.chatTitle',
    descriptionKey: 'notif.chatDesc',
    icon: MessageCircle,
  },
  {
    key: 'proposals',
    titleKey: 'notif.proposalsTitle',
    descriptionKey: 'notif.proposalsDesc',
    icon: ScrollText,
  },
  {
    key: 'marketing',
    titleKey: 'notif.marketingTitle',
    descriptionKey: 'notif.marketingDesc',
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
  const { t } = useI18n();
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
      toast.success(nextValue ? t('toast.notifOn', { title }) : t('toast.notifOff', { title }));
    },
    [prefs, triggerHaptic, t]
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
                  className="block text-sm font-medium text-gray-900 dark:text-white"
                >
                  {t(option.titleKey)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
                  {t(option.descriptionKey, { brand: BRAND_NAME })}
                </span>
              </span>
              <PreferenceToggle
                checked={checked}
                labelledBy={labelId}
                onChange={() => handleToggle(option.key, t(option.titleKey))}
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
          <h2 className="text-lg font-bold text-[#F97316]">{t('notif.hubTitle')}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
            {t('notif.hubSubtitle')}
          </p>
        </div>
      </div>
      {list}
    </section>
  );
});
