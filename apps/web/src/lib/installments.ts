export type InstallmentScheduleItem = {
  numero_parcela: number
  total_parcelas: number
  valor: number
  vencimento: string
}

export type InstallmentPreviewItem = {
  label: string
  valor: number
  data: string
}

export type MonthGroupedItems<T> = Record<
  string,
  {
    mesLabel: string
    total: number
    items: T[]
  }
>

type BuildInstallmentScheduleInput = {
  total: number
  firstDueDate: string
  installmentCount: number
}

function parseIsoDateParts(date: string): [number, number, number] | null {
  const parts = date.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return parts as [number, number, number]
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateAtLocalNoon(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

export function buildInstallmentSchedule({
  total,
  firstDueDate,
  installmentCount,
}: BuildInstallmentScheduleInput): InstallmentScheduleItem[] {
  if (!firstDueDate || total <= 0 || installmentCount <= 0) return []

  const dateParts = parseIsoDateParts(firstDueDate)
  if (!dateParts) return []

  const [year, month, day] = dateParts
  const baseValue = installmentCount > 1 ? roundCurrency(total / installmentCount) : total

  return Array.from({ length: installmentCount }, (_, index) => {
    const targetMonth = month - 1 + index
    const lastDayOfMonth = new Date(year, targetMonth + 1, 0).getDate()
    const clampedDay = Math.min(day, lastDayOfMonth)
    const dueDate = new Date(year, targetMonth, clampedDay)

    if (Number.isNaN(dueDate.getTime())) return null

    const value =
      index < installmentCount - 1
        ? baseValue
        : roundCurrency(total - baseValue * (installmentCount - 1))

    return {
      numero_parcela: index + 1,
      total_parcelas: installmentCount,
      valor: value,
      vencimento: formatLocalDateISO(dueDate),
    }
  }).filter((item): item is InstallmentScheduleItem => item !== null)
}

export function buildInstallmentPreview(
  schedule: InstallmentScheduleItem[],
  options?: {
    limit?: number
    locale?: string
  },
): InstallmentPreviewItem[] {
  const limit = options?.limit ?? 3
  const locale = options?.locale ?? 'pt-BR'

  return schedule.slice(0, limit).map((item) => ({
    label: `${item.numero_parcela}/${item.total_parcelas}`,
    valor: item.valor,
    data: parseDateAtLocalNoon(item.vencimento).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    }),
  }))
}

export function groupItemsByMonth<T extends { vencimento: string; valor: number | string }>(
  items: T[],
  locale = 'pt-BR',
): MonthGroupedItems<T> {
  return items.reduce<MonthGroupedItems<T>>((groups, item) => {
    const [year, month] = item.vencimento.split('-')
    const key = `${year}-${month}`
    const monthDate = new Date(Number(year), Number(month) - 1, 1)
    const mesLabel = monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

    if (!groups[key]) groups[key] = { mesLabel, total: 0, items: [] }

    groups[key].total = roundCurrency(groups[key].total + Number(item.valor))
    groups[key].items.push(item)
    return groups
  }, {})
}

export function getRelativeDueLabel(targetDate: string, referenceDate: string): string {
  const target = parseDateAtLocalNoon(targetDate)
  const reference = parseDateAtLocalNoon(referenceDate)
  const diff = Math.round((target.getTime() - reference.getTime()) / 864e5)

  if (diff < 0) return `${Math.abs(diff)}d atraso`
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff < 7) return `${diff}d`
  if (diff < 30) return `${Math.ceil(diff / 7)}sem`
  return `${Math.ceil(diff / 30)}m`
}
