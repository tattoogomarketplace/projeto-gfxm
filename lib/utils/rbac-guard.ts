import { createClient } from '@/lib/supabase/server';

type AccessResult = { allowed: true } | { allowed: false; redirect: string };

/**
 * RBAC GUARD - TATTOOGO MK
 * Valida a role e o status KYC de forma centralizada.
 */
export const checkAccess = async (
  requiredRole: 'cliente' | 'tatuador' | 'estudio'
): Promise<AccessResult> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, redirect: '/login' };

  const { data: perfil } = await supabase
    .from('perfis')
    .select('role, kyc_status, deleted_at')
    .eq('id', user.id)
    .single();

  if (!perfil || perfil.deleted_at) {
    return { allowed: false, redirect: '/login' };
  }

  if (perfil.role !== requiredRole) {
    return { allowed: false, redirect: '/dashboard' };
  }

  if (requiredRole === 'tatuador' && perfil.kyc_status !== 'aprovado') {
    return { allowed: false, redirect: '/dashboard/kyc-pendente' };
  }

  return { allowed: true };
};
