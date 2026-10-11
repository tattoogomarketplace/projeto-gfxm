export type AgeErrorKey = 'invalid_date' | 'future_date';

export interface ExactAgeResult {
  age: number;
  isValid: boolean;
  errorKey?: AgeErrorKey;
}

export const MINIMUM_REGISTRATION_AGE = 14;

const MAX_REASONABLE_AGE = 120;

function parseLocalBirthDate(value?: string): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    const isRealCalendarDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
    if (!isRealCalendarDate) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function calculateExactAge(birthDateString?: string): ExactAgeResult {
  const birthDate = parseLocalBirthDate(birthDateString);
  if (!birthDate) return { age: 0, isValid: false, errorKey: 'invalid_date' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (birthDate.getTime() > today.getTime()) {
    return { age: 0, isValid: false, errorKey: 'future_date' };
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 0 || age > MAX_REASONABLE_AGE) {
    return { age: 0, isValid: false, errorKey: 'invalid_date' };
  }

  return { age, isValid: true };
}

export function meetsMinimumAge(
  birthDateString?: string,
  minimumAge: number = MINIMUM_REGISTRATION_AGE
): boolean {
  const { age, isValid } = calculateExactAge(birthDateString);
  return isValid && age >= minimumAge;
}
