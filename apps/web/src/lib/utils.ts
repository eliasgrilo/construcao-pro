import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let fallbackIdCounter = 0

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint32Array(2)
      crypto.getRandomValues(bytes)
      return `${prefix}-${bytes[0].toString(16)}${bytes[1].toString(16)}`
    }
  }

  fallbackIdCounter += 1
  return `${prefix}-${Date.now()}-${fallbackIdCounter}`
}

export function formatCurrency(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value))
    return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Supabase returns timestamptz as "YYYY-MM-DD HH:MM:SS±HH" (space separator,
// no colon in timezone offset). iOS Safari only accepts ISO 8601 with 'T'
// separator and coloned offset (e.g. "+00:00"). Normalize before parsing.
export function normalizeTimestamp(date: string): string {
  const withT = date.replace(' ', 'T')
  // Already fully normalized (has Z or coloned offset)
  if (withT.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(withT)) return withT
  // Has bare ±HH offset at the end — add the colon
  if (/[+-]\d{2}$/.test(withT)) return withT.replace(/([+-])(\d{2})$/, '$1$2:00')
  // No timezone indicator at all — Supabase stores in UTC, so append Z
  return `${withT}Z`
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(normalizeTimestamp(date)) : new Date(date)
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return '—'
  }
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    // ISO date-only strings (YYYY-MM-DD) are parsed as UTC midnight by spec,
    // which shifts the displayed date by one day in UTC-N timezones (e.g. Brazil).
    // Appending T12:00:00 forces local-noon parsing so the date never shifts.
    const str = typeof date === 'string' ? normalizeTimestamp(date) : date
    const d =
      typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str)
        ? new Date(`${str}T12:00:00`)
        : new Date(str)
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
  } catch {
    return '—'
  }
}

export function formatNumber(value: number): string {
  if (value == null || Number.isNaN(value)) return '0'
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(normalizeTimestamp(isoDate)).getTime()
  if (diff <= 0) return 'agora'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return mins === 1 ? 'há 1 minuto' : `há ${mins} minutos`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? 'há 1 hora' : `há ${hrs} horas`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}

/**
 * Returns today's date as YYYY-MM-DD in the **local** timezone.
 * `new Date().toISOString()` returns UTC, which in Brazil (UTC-3) rolls over to
 * the next day after 21:00 local time — always use this helper for "today" dates.
 */
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA')
}

/** Strip diacritics from a string (e.g. "ção" → "cao") */
export function removeAccents(str: string): string {
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: intentional — matches Unicode combining diacritical marks range
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Normalize a string for search: lowercase + strip diacritics */
export function normalizeSearch(str: string): string {
  return removeAccents(str.toLowerCase())
}

/** Apple HIG accent palette for cards/badges */
export const accents = [
  { bg: '#007AFF12', fg: '#007AFF' },
  { bg: '#34C75912', fg: '#34C759' },
  { bg: '#FF9F0A12', fg: '#FF9F0A' },
  { bg: '#AF52DE12', fg: '#AF52DE' },
  { bg: '#FF375F12', fg: '#FF375F' },
  { bg: '#5AC8FA12', fg: '#5AC8FA' },
  { bg: '#30B0C712', fg: '#30B0C7' },
  { bg: '#FF634712', fg: '#FF6347' },
] as const
