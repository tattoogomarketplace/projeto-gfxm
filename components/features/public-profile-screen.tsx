'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Images, MessageCircle, PenTool, Route, ShieldCheck } from 'lucide-react';
import {
  PublicProfile,
  type ProfileHighlight,
  type ProfileMedia,
  type ProfileMetric,
} from '@/components/features/public-profile';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { toast } from '@/lib/toast';
import { BRAND_NAME, BRAND_PASS } from '@/lib/i18n/brands';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import type { PublicProfileData } from '@/lib/services/public-profile';

type PublicProfileScreenProps = {
  data: PublicProfileData;
  viewerUsername: string | null;
};

/**
 * TATTOOGO MK — TELA DE PERFIL PÚBLICO (APPLE-TIER)
 *
 * Orquestra o `PublicProfile` reutilizável para o perfil de TERCEIROS. O modo
 * `owner` (Editar/Compartilhar) é preservado quando o visitante é o próprio
 * dono do handle; caso contrário, expõe ações sociais nativas (Compartilhar,
 * Mensagem para tatuadores) sem jamais cruzar dados entre os papéis.
 */
export function PublicProfileScreen({ data, viewerUsername }: PublicProfileScreenProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);

  const owner = Boolean(
    viewerUsername && data.username && viewerUsername.toLowerCase() === data.username.toLowerCase()
  );

  const metrics = useMemo<ProfileMetric[]>(
    () => [
      { key: 'posts', label: t('profile.posts'), value: data.metrics.posts },
      { key: 'followers', label: t('profile.followers'), value: data.metrics.followers },
      { key: 'following', label: t('profile.following'), value: data.metrics.following },
    ],
    [data.metrics, t]
  );

  const highlights = useMemo<ProfileHighlight[]>(
    () => [
      {
        id: 'atelier',
        label: 'Monte seu ateliê digital',
        href: '/dashboard/seja-tatuador',
        Icon: PenTool,
      },
      {
        id: 'journey',
        label: 'Minha jornada na pele',
        href: `${dashboardPathForRole(data.role)}?tab=agendar`,
        Icon: Route,
      },
      {
        id: 'inspirations',
        label: t('gallery.title'),
        href: '/dashboard/galeria',
        Icon: Images,
      },
      {
        id: 'pass',
        label: BRAND_PASS,
        href: '/dashboard/pagamentos',
        Icon: ShieldCheck,
      },
    ],
    [data.role, t]
  );

  const media = useMemo<ProfileMedia>(
    () => ({
      posts: data.media.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        alt: item.alt,
      })),
      tagged: [],
      saved: [],
    }),
    [data.media]
  );

  const location = useMemo(() => {
    if (data.cidade && data.estado) return `${data.cidade}/${data.estado}`;
    return data.cidade || data.estado || null;
  }, [data.cidade, data.estado]);

  const share = useCallback(async () => {
    triggerHaptic('light');
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/profile/${data.username}`
        : '';
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: BRAND_NAME, text: data.name || `@${data.username}`, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t('profile.copied'));
      }
    } catch {
      // Compartilhamento cancelado pelo usuário: nenhum feedback necessário.
    }
  }, [data.name, data.username, t, triggerHaptic]);

  const openChat = useCallback(() => {
    triggerHaptic('medium');
    setPendingChatPeer(data.id);
    setActiveTab('chat');
    router.push(`/dashboard/chat?artistId=${encodeURIComponent(data.id)}`);
  }, [data.id, router, setActiveTab, setPendingChatPeer, triggerHaptic]);

  const actions = owner ? undefined : (
    <>
      <button
        type="button"
        onClick={share}
        className="apple-press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 text-sm font-semibold text-orange-600 dark:text-orange-300"
      >
        {t('profile.share')}
      </button>
      {data.role === 'tatuador' ? (
        <button
          type="button"
          onClick={openChat}
          className="apple-press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-black/[0.03] text-sm font-semibold text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          {t('vitrine.chat')}
        </button>
      ) : null}
    </>
  );

  return (
    <PublicProfile
      owner={owner}
      role={data.role}
      name={data.name}
      username={data.username}
      avatarUrl={data.avatarUrl}
      bio={null}
      location={location}
      verified={data.verified}
      metrics={metrics}
      highlights={highlights}
      media={media}
      onBack={() => router.back()}
      onShare={share}
      actions={actions}
      onEdit={() => {
        triggerHaptic('light');
        router.push('/dashboard/perfil/configuracoes');
      }}
    />
  );
}
