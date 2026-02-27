import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date))
  } catch {
    return '—'
  }
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
    }).format(new Date(date))
  } catch {
    return '—'
  }
}

export function formatNumber(value: number): string {
  if (value == null || Number.isNaN(value)) return '0'
  return new Intl.NumberFormat('pt-BR').format(value)
}
