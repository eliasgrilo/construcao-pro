import { todayISO } from './utils'

/**
 * Escapes a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ]
  // UTF-8 BOM for Excel compatibility on Windows
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a short delay — revoking synchronously can prevent Firefox from reading the blob
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export type MovimentacaoExportRow = {
  data: string
  motivo: string
  tipo: string
  valor: number
  banco: string
  subconta: string
}

export function exportMovimentacoesCsv(rows: MovimentacaoExportRow[]): void {
  const headers = ['Data', 'Descrição', 'Tipo', 'Valor (R$)', 'Conta', 'Subconta']
  const data = rows.map((r) => [
    r.data,
    r.motivo,
    r.tipo === 'ENTRADA' ? 'Entrada' : r.tipo === 'SAIDA' ? 'Saída' : 'Transferência',
    r.valor,
    r.banco,
    r.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações',
  ])
  const filename = `movimentacoes-${todayISO()}.csv`
  downloadCsv(buildCsv(headers, data), filename)
}
