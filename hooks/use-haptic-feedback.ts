/**
 * TATTOOGO MK - HOOK DE HAPTIC FEEDBACK (APPLE-TIER)
 * Centraliza a resposta tátil para garantir consistência entre Android/iOS
 * e evitar chamadas órfãs ao navigator.vibrate.
 */

export const useHapticFeedback = () => {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    // Verificação de segurança para execução apenas em ambiente de browser/mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const patterns = {
        light: 50,
        medium: 50,
        heavy: [200, 100, 200],
        success: [30, 50, 30],
      };

      navigator.vibrate(patterns[type]);
    }
  };

  return { triggerHaptic };
};
