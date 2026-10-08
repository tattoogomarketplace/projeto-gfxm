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
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-y-auto overscroll-contain bg-[#121212] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center [-webkit-overflow-scrolling:touch]"
    >
      <div className="my-auto flex w-full flex-col items-center">
      <div className="w-32 h-32 bg-zinc-900 rounded-full mb-8 flex items-center justify-center border border-zinc-800 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
        <span className="text-4xl">✨</span>
      </div>
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-orange-500">{t(content.badge, { brand: BRAND_NAME })}</p>
      <p className="mb-1 text-sm text-zinc-500">{t(content.journey.past)}</p>
      <h1 className="text-3xl font-bold text-white mb-2">{t(content.journey.present)}</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">{t(content.journey.future)}</p>
      <NeonButton
        type="button"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          assignAppPath('/dashboard');
        }}
      >
        {t(content.cta)}
      </NeonButton>
      </div>
    </motion.div>
  );
}
