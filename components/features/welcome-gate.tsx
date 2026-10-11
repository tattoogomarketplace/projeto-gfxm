'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/neon-button';
import { assignAppPath, type AppRole } from '@/lib/utils/auth-redirect';
import { getRoleExperience } from '@/lib/content/role-experience';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';

interface WelcomeGateProps {
  role: AppRole;
}

export function WelcomeGate({ role }: WelcomeGateProps) {
  const content = getRoleExperience(role).onboarding;
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-9999 flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-[#0a0a0a] text-center"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-32 h-32 bg-zinc-900 rounded-full mb-8 flex items-center justify-center border border-zinc-800 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
        <span className="text-4xl">✨</span>
      </div>
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-orange-500">{t(content.badge, { brand: BRAND_NAME })}</p>
      <p className="mb-1 text-sm text-zinc-500">{t(content.journey.past)}</p>
      <h1 className="text-3xl font-bold text-white mb-2">{t(content.journey.present)}</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">{t(content.journey.future)}</p>
      </div>

      <div className="w-full px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <NeonButton
          type="button"
          disabled={leaving}
          className="mx-auto flex h-14 w-full max-w-md items-center justify-center text-base"
          onClick={() => {
            setLeaving(true);
            // Fluxo do cliente: a identidade (@username) é o passo imediato após
            // a promessa "Minha Jornada na Pele", antes de entrar no painel.
            assignAppPath(
              role === 'cliente'
                ? '/dashboard/onboarding/username?flow=cliente'
                : '/dashboard'
            );
          }}
        >
          {t(content.cta)}
        </NeonButton>
      </div>
    </motion.div>
  );
}
