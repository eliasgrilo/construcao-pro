export const obraFilterStatuses = [
  'ATIVA',
  'PAUSADA',
  'FINALIZADA',
  'VENDIDO',
  'TERRENO',
  'MANUTENCAO',
] as const

export type ObraFilterStatus = (typeof obraFilterStatuses)[number]
export type RouteOrigin = 'dashboard'

export interface ObrasRouteSearch {
  from?: RouteOrigin
  tab?: ObraFilterStatus
}

export interface ObraDetailRouteSearch {
  from?: RouteOrigin
}

export function isObraFilterStatus(value: unknown): value is ObraFilterStatus {
  return typeof value === 'string' && obraFilterStatuses.includes(value as ObraFilterStatus)
}

export function isRouteOrigin(value: unknown): value is RouteOrigin {
  return value === 'dashboard'
}

export function validateObrasRouteSearch(search: Record<string, unknown>): ObrasRouteSearch {
  return {
    from: isRouteOrigin(search.from) ? search.from : undefined,
    tab: isObraFilterStatus(search.tab) ? search.tab : undefined,
  }
}

export function validateObraDetailRouteSearch(
  search: Record<string, unknown>,
): ObraDetailRouteSearch {
  return {
    from: isRouteOrigin(search.from) ? search.from : undefined,
  }
}
