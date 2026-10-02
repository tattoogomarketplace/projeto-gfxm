'use client';
import { motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/neon-button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { postSignupPathForRole, type AppRole } from '@/lib/utils/auth-redirect';

export type WelcomeContent = {
  title: string;
  subtitle: string;
  cta: string;
};

export function getWelcomeContent(role: AppRole): WelcomeContent {
  if (role === 'cliente') {
    return {
      title: 'Sua primeira ou próxima arte te espera',
      subtitle: 'Conectando você aos melhores artistas. Inspire-se, encontre o traço perfeito.',
      cta: 'Minha Jornada na Pele',
    };
  }
  if (role === 'estudio') {
    return {
      title: 'Gestão master conectada.',
      subtitle: 'A agenda do seu império está online. Homologue artistas e acompanhe o split.',
      cta: 'Entrar no Atelier Digital',
    };
  }
  return {
    title: 'Bancada montada e máquina regulada!',
    subtitle: 'Hora de eternizar sua arte e organizar seu dia. Veja agendamentos e gerencie pagamentos.',
    cta: 'Entrar no Atelier Digital',
  };
}

interface WelcomeGateProps {
  role: AppRole;
}

export function WelcomeGate({ role }: WelcomeGateProps) {
  const router = useRouter();
  const destination = postSignupPathForRole(role);
  const content = getWelcomeContent(role);

  useEffect(() => {
    router.push(destination);
    router.refresh();
  }, [destination, router]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-9999 bg-[#121212] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-32 h-32 bg-zinc-900 rounded-full mb-8 flex items-center justify-center border border-zinc-800 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
        <span className="text-4xl">✨</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">{content.title}</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">{content.subtitle}</p>
      <NeonButton
        type="button"
        onClick={() => {
          router.push(destination);
          router.refresh();
        }}
      >
        {content.cta}
      </NeonButton>
    </motion.div>
  );
}
