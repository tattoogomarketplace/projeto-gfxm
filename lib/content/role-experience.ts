import { normalizeAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import { t } from '@/lib/i18n/store';
import type { MessageKey } from '@/lib/i18n/types';

/**
 * Narrativa de onboarding guiada pela regra Past-Present-Future:
 * - `past`    reconhece o ponto de partida do usuário;
 * - `present` descreve o estado atual já preparado pela plataforma;
 * - `future`  projeta o próximo passo dentro do papel escolhido.
 *
 * Cada campo expõe uma chave de i18n (`MessageKey`); a tradução é resolvida
 * pelos consumidores via `t()` para acompanhar o locale ativo.
 */
export type RoleJourney = {
  past: MessageKey;
  present: MessageKey;
  future: MessageKey;
};

export type RoleOnboardingExperience = {
  badge: MessageKey;
  journey: RoleJourney;
  cta: MessageKey;
  /**
   * Chave exibida durante a ativação da conta / carregamento do perfil. É
   * dirigida ao papel persistido para manter a narrativa coerente do primeiro
   * contato até a entrada no painel.
   */
  activating: MessageKey;
};

export type RoleDashboardExperience = {
  title: MessageKey;
  primaryTab: MessageKey;
  heading: MessageKey;
  subtitle: MessageKey;
};

export type RoleExperience = {
  role: AppRole;
  label: MessageKey;
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
    label: 'role.cliente.label',
    onboarding: {
      badge: 'role.welcomeBadge',
      journey: {
        past: 'role.cliente.past',
        present: 'role.cliente.present',
        future: 'role.cliente.future',
      },
      cta: 'role.cliente.cta',
      activating: 'role.cliente.activating',
    },
    dashboard: {
      title: 'role.cliente.title',
      primaryTab: 'nav.gallery',
      heading: 'home.appointments',
      subtitle: 'role.cliente.subtitle',
    },
  },
  tatuador: {
    role: 'tatuador',
    label: 'role.tatuador.label',
    onboarding: {
      badge: 'role.welcomeBadge',
      journey: {
        past: 'role.tatuador.past',
        present: 'role.tatuador.present',
        future: 'role.tatuador.future',
      },
      cta: 'role.tatuador.cta',
      activating: 'role.tatuador.activating',
    },
    dashboard: {
      title: 'role.tatuador.title',
      primaryTab: 'role.tatuador.primaryTab',
      heading: 'role.tatuador.heading',
      subtitle: 'role.tatuador.subtitle',
    },
  },
  estudio: {
    role: 'estudio',
    label: 'role.estudio.label',
    onboarding: {
      badge: 'role.welcomeBadge',
      journey: {
        past: 'role.estudio.past',
        present: 'role.estudio.present',
        future: 'role.estudio.future',
      },
      cta: 'role.estudio.cta',
      activating: 'role.estudio.activating',
    },
    dashboard: {
      title: 'role.estudio.title',
      primaryTab: 'role.estudio.primaryTab',
      heading: 'role.estudio.heading',
      subtitle: 'role.estudio.subtitle',
    },
  },
};

export function getRoleExperience(role: AppRole): RoleExperience {
  return ROLE_EXPERIENCE[role] ?? ROLE_EXPERIENCE.cliente;
}

export function getOnboardingLoadingMessage(role?: string | null): string {
  return t(getRoleExperience(normalizeAppRole(role)).onboarding.activating);
}
