const REPEATED_DIGITS = new Set([
  '00000000000',
  '11111111111',
  '22222222222',
  '33333333333',
  '44444444444',
  '55555555555',
  '66666666666',
  '77777777777',
  '88888888888',
  '99999999999',
]);

export function onlyCpfDigits(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

export function formatCpf(value: string): string {
  const digits = onlyCpfDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function mod11Digit(base: string, initialFactor: number): number {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (initialFactor - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyCpfDigits(value);
  if (cpf.length !== 11) return false;
  if (REPEATED_DIGITS.has(cpf)) return false;
  const d1 = mod11Digit(cpf.slice(0, 9), 10);
  if (d1 !== Number(cpf[9])) return false;
  const d2 = mod11Digit(cpf.slice(0, 10), 11);
  return d2 === Number(cpf[10]);
}
