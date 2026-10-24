'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  SavedInspirationError,
  toggleSavedInspiration,
} from '@/lib/services/saved-inspiration';

export type ToggleSaveResult =
  | { success: true; isSaved: boolean; message: string }
  | { success: false; isSaved?: boolean; error: string };

export async function toggleSave(postId: string): Promise<ToggleSaveResult> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return { success: false, error: 'Não autenticado.' };
  }

  try {
    const result = await toggleSavedInspiration(userId, postId);
    revalidatePath('/');
    revalidatePath('/dashboard/inspiracoes');
    revalidatePath('/dashboard/salvos');
    revalidatePath('/dashboard/cliente');
    revalidatePath('/dashboard/galeria');
    return { success: true, isSaved: result.isSaved, message: result.message };
  } catch (error) {
    if (error instanceof SavedInspirationError) {
      return { success: false, error: error.message };
    }
    console.error('[saved-actions] falha ao alternar salvo', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Falha ao salvar a inspiração.' };
  }
}
