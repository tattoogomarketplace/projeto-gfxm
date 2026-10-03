import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskPII(value?: string | null): string {
  if (value == null || value === '') return '';
  const raw = String(value);
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 11) {
    return `***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**`;
  }

  return '***' + raw.slice(-4);
}

