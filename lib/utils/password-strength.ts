import { z } from 'zod';
import { t as translate } from '@/lib/i18n/store';
import type { MessageKey, TranslateVars } from '@/lib/i18n/types';

export type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type PasswordRuleId = 'length' | 'upper' | 'lower' | 'number' | 'special';

export type PasswordRule = {
  id: PasswordRuleId;
  labelKey: MessageKey;
  shortKey: MessageKey;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    labelKey: 'password.rule.length',
    shortKey: 'password.rule.lengthShort',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'upper',
    labelKey: 'password.rule.upper',
    shortKey: 'password.rule.upperShort',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'lower',
    labelKey: 'password.rule.lower',
    shortKey: 'password.rule.lowerShort',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    labelKey: 'password.rule.number',
    shortKey: 'password.rule.numberShort',
    test: (value: string) => /\d/.test(value),
  },
  {
    id: 'special',
    labelKey: 'password.rule.special',
    shortKey: 'password.rule.specialShort',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export function createPasswordSchema(t: TranslateFn = translate) {
  return z
    .string()
    .min(8, t('password.zod.min'))
    .regex(/[A-Z]/, t('password.zod.upper'))
    .regex(/[a-z]/, t('password.zod.lower'))
    .regex(/\d/, t('password.zod.number'))
    .regex(/[^A-Za-z0-9]/, t('password.zod.special'));
}

export const passwordSchema = createPasswordSchema();

export type PasswordCheck = {
  id: PasswordRuleId;
  label: string;
  short: string;
  passed: boolean;
};

export function getPasswordStrength(password: string, t: TranslateFn = translate) {
  const checks: PasswordCheck[] = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: t(rule.labelKey),
    short: t(rule.shortKey),
    passed: rule.test(password),
  }));
  const score = checks.filter((check) => check.passed).length;
  const missing = checks.filter((check) => !check.passed);
  const percent = (score / PASSWORD_RULES.length) * 100;

  let label = t('password.strength.empty');
  let tone: 'muted' | 'red' | 'yellow' | 'orange' | 'green' = 'muted';
  if (password) {
    if (score <= 1) {
      label = t('password.strength.veryWeak');
      tone = 'red';
    } else if (score === 2) {
      label = t('password.strength.weak');
      tone = 'red';
    } else if (score === 3) {
      label = t('password.strength.missing', { item: missing[0]?.short ?? '' });
      tone = 'yellow';
    } else if (score === 4) {
      const miss = missing[0];
      label =
        miss?.id === 'special'
          ? t('password.strength.missingSymbol')
          : t('password.strength.missing', { item: miss?.short ?? '' });
      tone = 'yellow';
    } else {
      label = t('password.strength.armored');
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
