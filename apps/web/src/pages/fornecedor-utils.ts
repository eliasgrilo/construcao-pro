const AVATAR_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#00C7BE',
  '#30B0C7',
  '#FF6482',
]

export function getFornecedorAvatarColor(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) & 0xffffffff
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getFornecedorInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function normalizeDateForMonthParsing(date: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date.replace(' ', 'T')
  return normalized.replace(/([+-]\d{2})$/, '$1:00')
}

export function getMonthKey(date: string): string {
  const parsed = new Date(normalizeDateForMonthParsing(date))
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const parsed = new Date(Number(year), Number(month) - 1, 1)
  const label = parsed.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
export const clr = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  gray: '#8E8E93',
  purple: '#AF52DE',
  indigo: '#5856D6',
} as const
