'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/neon-button';
import { assignAppPath, type AppRole } from '@/lib/utils/auth-redirect';
import { getRoleExperience } from '@/lib/content/role-experience';

interface WelcomeGateProps {
  role: AppRole;
}

export function WelcomeGate({ role }: WelcomeGateProps) {
  const content = getRoleExperience(role).onboarding;
  const [leaving, setLeaving] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-9999 bg-[#121212] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-32 h-32 bg-zinc-900 rounded-full mb-8 flex items-center justify-center border border-zinc-800 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
        <span className="text-4xl">✨</span>
      </div>
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-orange-500">{content.badge}</p>
      <p className="mb-1 text-sm text-zinc-500">{content.journey.past}</p>
      <h1 className="text-3xl font-bold text-white mb-2">{content.journey.present}</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">{content.journey.future}</p>
      <NeonButton
        type="button"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          assignAppPath('/dashboard');
        }}
      >
        {content.cta}
      </NeonButton>
    </motion.div>
  );
}
