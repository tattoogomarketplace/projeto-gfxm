import type { AppRole } from '@/lib/utils/auth-redirect';

/**
 * Narrativa de onboarding guiada pela regra Past-Present-Future:
 * - `past`    reconhece o ponto de partida do usuário;
 * - `present` descreve o estado atual já preparado pela plataforma;
 * - `future`  projeta o próximo passo dentro do papel escolhido.
 */
export type RoleJourney = {
  past: string;
  present: string;
  future: string;
};

export type RoleOnboardingExperience = {
  badge: string;
  journey: RoleJourney;
  cta: string;
};

export type RoleDashboardExperience = {
  title: string;
  primaryTab: string;
  heading: string;
  subtitle: string;
};

export type RoleExperience = {
  role: AppRole;
  label: string;
  onboarding: RoleOnboardingExperience;
  dashboard: RoleDashboardExperience;
};

/**
 * Fonte única da personalização por papel. Consumida pelo onboarding, pelo
 * WelcomeGate, pelas abas do AppShell e pelos painéis. Substitui qualquer
 * fallback genérico por conteúdo dirigido ao papel persistido no banco.
 */
export const ROLE_EXPERIENCE: Record<AppRole, RoleExperience> = {
  cliente: {
    role: 'cliente',
    label: 'Cliente',
    onboarding: {
      badge: 'Bem-vindo ao TattooGo MK',
      journey: {
        past: 'Toda pele guarda uma história.',
        present: 'Sua primeira ou próxima arte te espera.',
        future: 'Conectamos você aos melhores artistas para encontrar o traço perfeito.',
      },
      cta: 'Minha Jornada na Pele',
    },
    dashboard: {
      title: 'Minha Jornada',
      primaryTab: 'Galeria',
      heading: 'Seus Agendamentos',
      subtitle: 'Acompanhe suas sessões, converse com artistas e descubra novas artes.',
    },
  },
  tatuador: {
    role: 'tatuador',
    label: 'Tatuador',
    onboarding: {
      badge: 'Bem-vindo ao TattooGo MK',
      journey: {
        past: 'Sua arte já fala por você.',
        present: 'Bancada montada e máquina regulada.',
        future: 'Eternize sua arte, organize o dia e gerencie seus recebimentos.',
      },
      cta: 'Entrar no Atelier Digital',
    },
    dashboard: {
      title: 'Atelier Digital',
      primaryTab: 'Portfólio',
      heading: 'Gestão de Agendamentos',
      subtitle: 'Gerencie sua agenda, portfólio e repasses em um só lugar.',
    },
  },
  estudio: {
    role: 'estudio',
    label: 'Estúdio',
    onboarding: {
      badge: 'Bem-vindo ao TattooGo MK',
      journey: {
        past: 'Seu ateliê já tem nome e história.',
        present: 'Gestão master conectada.',
        future: 'Homologue artistas e acompanhe o split do seu império.',
      },
      cta: 'Entrar no Atelier Digital',
    },
    dashboard: {
      title: 'Métricas do Estúdio',
      primaryTab: 'Portfólio',
      heading: 'Métricas do Estúdio',
      subtitle: 'Acompanhe artistas parceiros e o desempenho do ateliê.',
    },
  },
};

export function getRoleExperience(role: AppRole): RoleExperience {
  return ROLE_EXPERIENCE[role] ?? ROLE_EXPERIENCE.cliente;
}
