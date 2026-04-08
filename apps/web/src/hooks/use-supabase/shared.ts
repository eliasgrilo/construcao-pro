export function getRelationCount(rows: Array<{ count: number | null }> | null | undefined): number {
  return rows?.[0]?.count ?? 0
}
