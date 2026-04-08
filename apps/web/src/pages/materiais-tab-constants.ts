export const UNIDADES = [
  { value: 'UN', label: 'Unidade', abbr: 'un' },
  { value: 'KG', label: 'Quilograma', abbr: 'kg' },
  { value: 'SC', label: 'Saco', abbr: 'sc' },
  { value: 'M', label: 'Metro', abbr: 'm' },
  { value: 'M2', label: 'Metro quadrado', abbr: 'm²' },
  { value: 'M3', label: 'Metro cúbico', abbr: 'm³' },
  { value: 'L', label: 'Litro', abbr: 'L' },
  { value: 'CX', label: 'Caixa', abbr: 'cx' },
  { value: 'PC', label: 'Peça', abbr: 'pç' },
  { value: 'TB', label: 'Tubo', abbr: 'tb' },
  { value: 'GL', label: 'Galão', abbr: 'gl' },
  { value: 'FD', label: 'Fardo', abbr: 'fd' },
  { value: 'RL', label: 'Rolo', abbr: 'rl' },
  { value: 'PR', label: 'Par', abbr: 'pr' },
] as const

export function getUnidadeLabel(value: string) {
  return UNIDADES.find((unit) => unit.value === value)?.label ?? value
}

export function getUnidadeAbbr(value: string) {
  return UNIDADES.find((unit) => unit.value === value)?.abbr ?? value
}

export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
} as const

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const
