import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskPII(value: string): string {
  if (!value) return '';
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, '');

  // Exemplo para CPF: ***.123.456-**
  if (digits.length === 11) {
    return `***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**`;
  }

  // Fallback genérico se não for CPF
  return '***' + value.slice(-4);
}

