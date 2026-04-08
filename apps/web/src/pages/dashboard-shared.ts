/* ─── Shared dashboard constants, types and utilities ─── */
/* Extracted to break circular imports between dashboard.tsx, dashboard-widgets.tsx and dashboard-tarefas.tsx */

/* Apple System Colors */
export const clr = { blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500' }

/* Apple system colors for distinct obra differentiation */
export const obraColors = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5AC8FA',
  '#FF2D55',
  '#FFCC00',
]

/* ─── Shared dashboard prop types ─── */
export type ClrColors = { blue: string; green: string; red: string; orange: string }

export type NavigateFn = (opts: {
  to: string
  params?: Record<string, string>
  search?: Record<string, string>
}) => void

export type CustoPorObraRow = {
  id: string
  obra: string
  endereco: string
  status: string
  custo: number
  orcamento: number
  valor_terreno: number
  valor_burocracia: number
  valor_construcao: number
  valor_venda: number
  percentual: number
}

export type EstoqueAlertaRow = {
  id: string
  material?: { nome: string; id: string }
  quantidade?: number
  estoque_minimo?: number
  material_nome?: string
  almoxarifado_nome?: string
  obra_nome?: string
}

/* Framer Motion variants — module-level so references are stable across renders */
export const cardListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const
export const cardItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
