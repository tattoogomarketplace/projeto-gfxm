/**
 * Utilidades de CNPJ (espelha lib/utils/cpf.ts), usadas para sanitizar e
 * validar o formato ANTES de qualquer consulta externa à ReceitaWS.
 */

const CNPJ_LENGTH = 14;

export function onlyCnpjDigits(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, CNPJ_LENGTH);
}

export function maskCnpj(value: string | null | undefined): string | null {
  const digits = onlyCnpjDigits(String(value || ''));
  if (digits.length !== 14) return null;
  return `**.***.***/${digits.slice(8, 12)}-**`;
}

export function formatCnpj(value: string): string {
  const digits = onlyCnpjDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function checkDigit(base: string): number {
  let weight = base.length - 7;
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * weight;
    weight -= 1;
    if (weight < 2) weight = 9;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyCnpjDigits(value);
  if (cnpj.length !== CNPJ_LENGTH) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const first = checkDigit(cnpj.slice(0, 12));
  if (first !== Number(cnpj[12])) return false;

  const second = checkDigit(cnpj.slice(0, 13));
  return second === Number(cnpj[13]);
}
