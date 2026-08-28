import { createClient } from '@/lib/supabase';

/**
 * RBAC GUARD - TATTOOGO MK
 * Valida a role e o status KYC de forma centralizada.
 */
export const checkAccess = async (requiredRole: 'cliente' | 'tatuador' | 'estudio') => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, redirect: '/login' };

  const { data: perfil } = await supabase
    .from('perfis')
    .select('role, kyc_status')
    .eq('id', user.id)
    .single();

  if (!perfil || perfil.role !== requiredRole) {
    return { allowed: false, redirect: '/dashboard' };
  }

  if (requiredRole === 'tatuador' && perfil.kyc_status !== 'aprovado') {
    return { allowed: false, redirect: '/dashboard/kyc-pendente' };
  }

  return { allowed: true };
};

