import { z } from 'zod';

const LINK_REGEX = /(https?:\/\/[^\s]+)/gi;
const FORBIDDEN_PLATFORMS = [/mercadopago/i, /picpay/i, /pagseguro/i];
const TOXIC_WORDS = ['palavra1', 'palavra2', 'xingamento1']; // Adicione conforme necessário

export const validateChatMessage = (message: string): { isValid: boolean; error?: string } => {
  if (LINK_REGEX.test(message)) {
    return { isValid: false, error: 'Links externos não são permitidos por segurança.' };
  }

  for (const platform of FORBIDDEN_PLATFORMS) {
    if (platform.test(message)) {
      return { isValid: false, error: 'Envio de dados de pagamento externos bloqueado.' };
    }
  }

  const containsToxic = TOXIC_WORDS.some(word => message.toLowerCase().includes(word));
  if (containsToxic) {
    return { isValid: false, error: 'Mensagem contém conteúdo impróprio.' };
  }

  return { isValid: true };
};
