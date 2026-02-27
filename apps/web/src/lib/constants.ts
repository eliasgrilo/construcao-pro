// ─── Apple System Colors ────────────────────────────────
export const SYSTEM_COLORS = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  teal: '#5AC8FA',
  gray: '#8E8E93',
  pink: '#FF2D55',
  indigo: '#5856D6',
} as const

// ─── Chart Palette ──────────────────────────────────────
export const CHART_COLORS = [
  SYSTEM_COLORS.blue,
  SYSTEM_COLORS.purple,
  SYSTEM_COLORS.teal,
  SYSTEM_COLORS.orange,
  SYSTEM_COLORS.green,
  SYSTEM_COLORS.pink,
] as const

// ─── Budget Thresholds (percent) ────────────────────────
export const BUDGET_WARNING_THRESHOLD = 70
export const BUDGET_DANGER_THRESHOLD = 90

// ─── Obra Accent Palette (for cards) ────────────────────
export const OBRA_ACCENT_PALETTE = [
  {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hex: SYSTEM_COLORS.blue,
  },
  {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hex: SYSTEM_COLORS.purple,
  },
  {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hex: SYSTEM_COLORS.orange,
  },
  {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    border: 'border-green-200',
    hex: SYSTEM_COLORS.green,
  },
  {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600',
    border: 'border-pink-200',
    hex: SYSTEM_COLORS.pink,
  },
  {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    hex: SYSTEM_COLORS.teal,
  },
] as const

// ─── Status Config ──────────────────────────────────────
export const STATUS_OBRA_CONFIG = {
  ATIVA: {
    label: 'Ativa',
    color: SYSTEM_COLORS.green,
    className: 'bg-green-500/10 text-green-600',
  },
  PAUSADA: {
    label: 'Pausada',
    color: SYSTEM_COLORS.orange,
    className: 'bg-orange-500/10 text-orange-600',
  },
  FINALIZADA: {
    label: 'Finalizada',
    color: SYSTEM_COLORS.gray,
    className: 'bg-gray-500/10 text-gray-600',
  },
} as const

export const TIPO_MOVIMENTACAO_CONFIG = {
  ENTRADA: {
    label: 'Entrada',
    color: SYSTEM_COLORS.green,
    className: 'bg-green-500/10 text-green-600',
  },
  SAIDA: { label: 'Saída', color: SYSTEM_COLORS.red, className: 'bg-red-500/10 text-red-600' },
  TRANSFERENCIA: {
    label: 'Transferência',
    color: SYSTEM_COLORS.blue,
    className: 'bg-blue-500/10 text-blue-600',
  },
} as const

export const STATUS_NF_CONFIG = {
  PENDENTE: { label: 'Pendente', className: 'bg-orange-500/10 text-orange-600' },
  PROCESSADA: { label: 'Processada', className: 'bg-blue-500/10 text-blue-600' },
  VINCULADA: { label: 'Vinculada', className: 'bg-green-500/10 text-green-600' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-500/10 text-red-600' },
} as const

export const STATUS_TRANSFERENCIA_CONFIG = {
  PENDENTE: { label: 'Pendente', className: 'bg-orange-500/10 text-orange-600' },
  APROVADA_NIVEL_1: { label: 'Aprovada N1', className: 'bg-blue-500/10 text-blue-600' },
  APROVADA: { label: 'Aprovada', className: 'bg-green-500/10 text-green-600' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-500/10 text-red-600' },
} as const
