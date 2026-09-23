import { auth } from '@clerk/nextjs/server';

type AccessResult = { allowed: true } | { allowed: false; redirect: string };

export const checkAccess = async (
  _requiredRole: 'cliente' | 'tatuador' | 'estudio'
): Promise<AccessResult> => {
  const { userId } = await auth();
  if (!userId) return { allowed: false, redirect: '/login' };
  return { allowed: true };
};
