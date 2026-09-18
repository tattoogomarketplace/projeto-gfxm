import { z } from 'zod';

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    short: '8 caracteres',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'upper',
    label: '1 letra maiúscula',
    short: 'maiúscula',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'lower',
    label: '1 letra minúscula',
    short: 'minúscula',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: '1 número',
    short: 'número',
    test: (value: string) => /\d/.test(value),
  },
  {
    id: 'special',
    label: '1 caractere especial',
    short: 'símbolo',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
  .regex(/[a-z]/, 'Precisa de 1 letra minúscula')
  .regex(/\d/, 'Precisa de 1 número')
  .regex(/[^A-Za-z0-9]/, 'Precisa de 1 caractere especial');

export type PasswordCheck = {
  id: string;
  label: string;
  short: string;
  passed: boolean;
};

export function getPasswordStrength(password: string) {
  const checks: PasswordCheck[] = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    short: rule.short,
    passed: rule.test(password),
  }));
  const score = checks.filter((check) => check.passed).length;
  const missing = checks.filter((check) => !check.passed);
  const percent = (score / PASSWORD_RULES.length) * 100;

  let label = 'Digite sua senha';
  let tone: 'muted' | 'red' | 'yellow' | 'orange' | 'green' = 'muted';
  if (password) {
    if (score <= 1) {
      label = 'Muito fraca';
      tone = 'red';
    } else if (score === 2) {
      label = 'Fraca';
      tone = 'red';
    } else if (score === 3) {
      label = `Falta ${missing[0]?.short}`;
      tone = 'yellow';
    } else if (score === 4) {
      const miss = missing[0];
      label = miss?.id === 'special' ? 'Falta um símbolo' : `Falta ${miss?.short}`;
      tone = 'yellow';
    } else {
      label = 'Blindada';
      tone = 'green';
    }
  }

  return {
    score,
    percent,
    label,
    tone,
    checks,
    isComplete: score === PASSWORD_RULES.length,
  };
}
