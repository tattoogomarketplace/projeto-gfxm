/**
 * MOTOR FINANCEIRO BLINDADO - TATTOOGO MK
 * Centraliza o cálculo de taxas para garantir consistência entre UI e Backend.
 * Regra: O valor líquido é sempre o base, taxas de cartão são calculadas server-side
 * e espelhadas aqui para transparência na interface (UI).
 */
export const calculatePaymentDetails = (baseAmount: number, method: 'pix' | 'credit') => {
  if (method === 'pix') {
    return { finalAmount: baseAmount, fee: 0 };
  }
  
  // Taxa repassada (exemplo de gateway + juros)
  const fee = baseAmount * 0.05; 
  return { finalAmount: baseAmount + fee, fee };
};
