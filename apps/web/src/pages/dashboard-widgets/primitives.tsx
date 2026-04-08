import { useToast } from '@/components/ui/toast'
import {
  type ObraManutencao,
  type ObraRow,
  type Tarefa,
  useConcluirManutencao,
  useCreateManutencaoItem,
  useUpdateManutencaoItem,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  MapPin,
  Package,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, memo, useMemo, useRef, useState } from 'react'
import {
  type ClrColors,
  type CustoPorObraRow,
  type EstoqueAlertaRow,
  type NavigateFn,
  cardItemVariants,
  cardListVariants,
  clr,
  greeting,
  obraColors,
} from '../dashboard-shared'
export function Ring({
  percent,
  size = 80,
  stroke = 6,
  color,
  glow = false,
}: { percent: number; size?: number; stroke?: number; color: string; glow?: boolean }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(percent, 100) / 100) * circ
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    >
      <title>Progresso do orçamento</title>
      <defs>
        <linearGradient id="budget-ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-muted/8"
        strokeWidth={stroke}
      />
      {/* Progress arc — gradient stroke */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#budget-ring-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={glow ? { filter: `drop-shadow(0 0 8px ${color}40)` } : undefined}
      />
    </svg>
  )
}

export function ringColor(p: number) {
  return p > 90 ? clr.red : p > 70 ? clr.orange : clr.green
}
