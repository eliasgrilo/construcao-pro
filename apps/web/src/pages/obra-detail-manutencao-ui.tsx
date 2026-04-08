import { usePermissions } from '@/hooks/use-permissions'
import type { ObraManutencao } from '@/hooks/use-supabase'
import { cn, formatDateShort } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, ChevronDown, Clock, Plus, Wrench } from 'lucide-react'
import { useState } from 'react'

export { ManutencaoActiveCard } from './obra-detail-manutencao-active'

// ─── helpers ────────────────────────────────────────────────────────────────

function durationLabel(start: string, end: string | null): string {
  if (!end) return 'em andamento'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'menos de 1 dia'
  return days === 1 ? '1 dia' : `${days} dias`
}

// ─── HistoricoCard ────────────────────────────────────────────────────────────

export function HistoricoCard({ sessao }: { sessao: ObraManutencao }) {
  const [expanded, setExpanded] = useState(false)
  const itens = sessao.itens ?? []
  const resolvidos = itens.filter((i) => i.resolvido).length
  const allResolved = itens.length > 0 && resolvidos === itens.length

  return (
    <div className="overflow-hidden rounded-2xl bg-card border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted"
      >
        <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-[rgba(52,199,89,0.12)]">
          <CheckCircle2 size={17} className="text-[#34C759]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground leading-snug">
            {formatDateShort(sessao.data_inicio)}
            {sessao.data_conclusao && (
              <span className="font-normal text-muted-foreground">
                {' → '}
                {formatDateShort(sessao.data_conclusao)}
              </span>
            )}
          </p>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-[12px] text-muted-foreground">
              {itens.length} {itens.length === 1 ? 'problema' : 'problemas'}
            </span>
            <span className="text-[12px] text-muted-foreground/40">·</span>
            <span
              className={cn(
                'text-[12px]',
                allResolved ? 'text-[#34C759]' : 'text-muted-foreground',
              )}
            >
              {resolvidos} resolvido{resolvidos !== 1 ? 's' : ''}
            </span>
            {sessao.data_conclusao && (
              <>
                <span className="text-[12px] text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Clock size={10} />
                  {durationLabel(sessao.data_inicio, sessao.data_conclusao)}
                </span>
              </>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={15} className="text-muted-foreground/40" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && itens.length > 0 && (
          <motion.div
            key="content"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2.5 border-t">
              {itens.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      'flex-shrink-0 mt-0.5 flex items-center justify-center rounded-full',
                      item.resolvido ? 'bg-[#34C759]' : 'border-2 border-border',
                    )}
                    style={{ width: 16, height: 16, minWidth: 16 }}
                  >
                    {item.resolvido && <Check size={8} strokeWidth={3} className="text-white" />}
                  </div>
                  <span
                    className={cn(
                      'text-[13px] leading-snug',
                      item.resolvido ? 'text-muted-foreground line-through' : 'text-foreground',
                    )}
                  >
                    {item.descricao}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ManutencaoEmptyState ────────────────────────────────────────────────────

export function ManutencaoEmptyState({ onIniciarManutencao }: { onIniciarManutencao: () => void }) {
  const { canManageObras } = usePermissions()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center gap-5 px-4 py-14 text-center"
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-3xl opacity-40"
          style={{
            background: 'rgba(255,149,0,0.5)',
            filter: 'blur(20px)',
            transform: 'scale(1.4)',
          }}
        />
        <div
          className="relative h-20 w-20 flex items-center justify-center rounded-3xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,149,0,0.18) 0%, rgba(255,149,0,0.08) 100%)',
            border: '1.5px solid rgba(255,149,0,0.25)',
          }}
        >
          <Wrench size={32} style={{ color: '#FF9500' }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[19px] font-bold text-foreground tracking-tight">
          Nenhuma manutenção ativa
        </p>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[260px]">
          Inicie uma sessão para registrar e acompanhar os problemas desta obra.
        </p>
      </div>

      {canManageObras && (
        <motion.button
          type="button"
          onClick={onIniciarManutencao}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-semibold text-white mt-1"
          style={{
            background: 'linear-gradient(135deg, #FF9500 0%, #FF8000 100%)',
            boxShadow: '0 4px 18px rgba(255,149,0,0.38), 0 1px 4px rgba(255,149,0,0.25)',
          }}
        >
          <Plus size={17} strokeWidth={2.5} />
          Iniciar Manutenção
        </motion.button>
      )}
    </motion.div>
  )
}
