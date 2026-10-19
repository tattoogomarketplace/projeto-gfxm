import { notFound } from 'next/navigation';
import { ReviewDetail } from '@/components/features/review-detail';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { getReviewById, ReviewError } from '@/lib/services/reviews';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewPageProps) {
  let authenticated = false;
  try {
    const session = await requireDashboardPerfil();
    authenticated = Boolean(session);
  } catch (error) {
    rethrowNextControlFlow(error);
    authenticated = false;
  }
  if (!authenticated) return <SessionHydrating />;

  const { id } = await params;
  let review = null;
  try {
    review = await getReviewById(id);
  } catch (error) {
    if (error instanceof ReviewError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    rethrowNextControlFlow(error);
    console.error('[dashboard/avaliacoes/:id] falha ao carregar avaliação', error);
    notFound();
  }

  return <ReviewDetail review={review} />;
}
