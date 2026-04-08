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
export function DashboardManutencaoWidget({
  manutencoes,
  navigate,
}: {
  manutencoes: ObraManutencao[]
  navigate: NavigateFn
}) {
  const { toast } = useToast()

  // Only count sessions where the obra is actually in MANUTENCAO status (prevents orphaned sessions)
  const uniqueManutencoes = manutencoes.reduce<ObraManutencao[]>((acc, m) => {
    if ((m.obra as { status?: string } | undefined)?.status !== 'MANUTENCAO') return acc
    const exists = acc.find((x) => x.obra_id === m.obra_id)
    if (!exists) acc.push(m)
    return acc
  }, [])

  const [expandedObra, setExpandedObra] = useState<string | null>(null)
  // Track which specific item is being resolved for per-item loading feedback
  const [resolvingItemId, setResolvingItemId] = useState<string | null>(null)
  const [addingProblemFor, setAddingProblemFor] = useState<string | null>(null)
  const [newProblemText, setNewProblemText] = useState('')

  const updateItem = useUpdateManutencaoItem()
  const concluir = useConcluirManutencao()
  const createItem = useCreateManutencaoItem()

  if (uniqueManutencoes.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22 }}
      className="px-4 md:px-6 mt-4"
    >
      <motion.div
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, rgba(255,149,0,0.08) 0%, rgba(255,149,0,0.03) 100%)',
          border: '1.5px solid rgba(255,149,0,0.2)',
          boxShadow: '0 4px 20px rgba(255,149,0,0.08)',
        }}
        animate={{
          scale: [1, 1.015, 1],
          boxShadow: [
            '0 4px 20px rgba(255,149,0,0.08)',
            '0 6px 28px rgba(255,149,0,0.18)',
            '0 4px 20px rgba(255,149,0,0.08)',
          ],
        }}
        transition={{
          delay: 1.2,
          duration: 1.5,
          ease: 'easeInOut',
          times: [0, 0.5, 1],
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="relative flex-shrink-0">
            <div
              className="h-9 w-9 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,149,0,0.15)' }}
            >
              <Wrench style={{ color: '#FF9500', width: 18, height: 18 }} />
            </div>
            {/* Pulse indicator */}
            <motion.div
              className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
              style={{ background: '#FF9500' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            />
          </div>
          <p className="flex-1 text-[15px] font-bold" style={{ color: '#FF9500' }}>
            {uniqueManutencoes.length === 1
              ? '1 obra em manutenção'
              : `${uniqueManutencoes.length} obras em manutenção`}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,149,0,0.12)', margin: '0 16px' }} />

        {/* Per-obra rows */}
        <div className="py-1">
          {uniqueManutencoes.map((m) => {
            const itens = m.itens ?? []
            const pendentes = itens.filter((it) => !it.resolvido)
            const resolvidos = itens.length - pendentes.length
            const pct = itens.length === 0 ? 0 : resolvidos / itens.length
            const allResolved = itens.length === 0 || pendentes.length === 0
            const dias = Math.floor((Date.now() - new Date(m.data_inicio).getTime()) / 86_400_000)
            const diaLabel = dias === 0 ? 'Hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
            const diaColor = dias <= 2 ? clr.green : dias <= 7 ? clr.orange : clr.red
            const isExpanded = expandedObra === m.id

            return (
              <div key={m.id}>
                {/* Obra header row */}
                <button
                  type="button"
                  onClick={() => setExpandedObra(isExpanded ? null : m.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[rgba(255,149,0,0.06)]"
                >
                  <div
                    className="flex-shrink-0 h-2 w-2 rounded-full mt-0.5"
                    style={{ background: diaColor }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                      {m.obra?.nome ?? '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-medium" style={{ color: diaColor }}>
                        {diaLabel}
                      </span>
                      {itens.length > 0 && (
                        <>
                          <span className="text-[11px]" style={{ color: 'rgba(60,60,67,0.3)' }}>
                            ·
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: pendentes.length > 0 ? clr.orange : clr.green }}
                          >
                            {pendentes.length > 0
                              ? `${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''}`
                              : 'Tudo resolvido'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  {itens.length > 0 && (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div
                        className="w-14 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(120,120,128,0.12)' }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: allResolved ? clr.green : clr.orange }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <span
                        className="text-[11px] tabular-nums text-muted-foreground/60"
                        style={{ minWidth: 22 }}
                      >
                        {resolvidos}/{itens.length}
                      </span>
                    </div>
                  )}

                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <ChevronDown
                      className="text-muted-foreground/40"
                      style={{ width: 14, height: 14 }}
                    />
                  </motion.div>
                </button>

                {/* Expanded: pending items + quick actions */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`expanded-${m.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
                        opacity: { duration: 0.2, delay: 0.04 },
                      }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-3"
                        style={{ borderTop: '1px solid rgba(255,149,0,0.08)' }}
                      >
                        {/* No items registered */}
                        {itens.length === 0 && (
                          <p className="py-2.5 text-[13px] text-muted-foreground/60">
                            Nenhum problema registrado.
                          </p>
                        )}

                        {/* All items (resolved and pending) with toggle support */}
                        {itens.length > 0 && (
                          <div className="py-2 space-y-2">
                            {itens.map((item) => {
                              const isThisResolving = resolvingItemId === item.id
                              return (
                                <div key={item.id} className="flex items-center gap-2.5">
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.85 }}
                                    onClick={async () => {
                                      if (resolvingItemId) return
                                      setResolvingItemId(item.id)
                                      try {
                                        await updateItem.mutateAsync({
                                          id: item.id,
                                          resolvido: !item.resolvido,
                                        })
                                      } catch {
                                        toast({ title: 'Erro ao atualizar item', variant: 'error' })
                                      } finally {
                                        setResolvingItemId(null)
                                      }
                                    }}
                                    disabled={!!resolvingItemId}
                                    className="flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all"
                                    style={{
                                      borderColor: item.resolvido
                                        ? clr.green
                                        : isThisResolving
                                          ? clr.green
                                          : 'rgba(255,149,0,0.45)',
                                      background: item.resolvido
                                        ? 'rgba(52,199,89,0.15)'
                                        : isThisResolving
                                          ? 'rgba(52,199,89,0.12)'
                                          : 'transparent',
                                    }}
                                    aria-label={
                                      item.resolvido
                                        ? 'Marcar como pendente'
                                        : 'Marcar como resolvido'
                                    }
                                  >
                                    {item.resolvido && !isThisResolving && (
                                      <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: clr.green }}
                                      />
                                    )}
                                    {isThisResolving && (
                                      <motion.div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: clr.green }}
                                        animate={{ scale: [0.6, 1, 0.6] }}
                                        transition={{
                                          duration: 0.8,
                                          repeat: Number.POSITIVE_INFINITY,
                                          ease: 'easeInOut',
                                        }}
                                      />
                                    )}
                                  </motion.button>
                                  <span
                                    className="text-[13px] leading-snug flex-1 transition-opacity"
                                    style={{
                                      color: item.resolvido
                                        ? 'var(--muted-foreground)'
                                        : isThisResolving
                                          ? 'var(--muted-foreground)'
                                          : 'var(--foreground)',
                                      opacity: item.resolvido || isThisResolving ? 0.5 : 1,
                                      textDecoration: item.resolvido ? 'line-through' : 'none',
                                    }}
                                  >
                                    {item.descricao}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Inline add problem */}
                        <div className="pt-2">
                          {addingProblemFor === m.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newProblemText}
                                onChange={(e) => setNewProblemText(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const trimmed = newProblemText.trim()
                                    if (!trimmed || createItem.isPending) return
                                    try {
                                      await createItem.mutateAsync({
                                        manutencao_id: m.id,
                                        obra_id: m.obra_id,
                                        descricao: trimmed,
                                      })
                                      setNewProblemText('')
                                      setAddingProblemFor(null)
                                    } catch {
                                      toast({
                                        title: 'Erro ao adicionar problema',
                                        variant: 'error',
                                      })
                                    }
                                  } else if (e.key === 'Escape') {
                                    setNewProblemText('')
                                    setAddingProblemFor(null)
                                  }
                                }}
                                placeholder="Descreva o problema... (Enter para salvar)"
                                className="flex-1 text-[13px] bg-transparent border-b border-orange-400/40 outline-none py-1 placeholder:text-muted-foreground/40"
                              />
                              <button
                                type="button"
                                disabled={createItem.isPending}
                                onClick={async () => {
                                  const trimmed = newProblemText.trim()
                                  if (!trimmed) {
                                    setAddingProblemFor(null)
                                    return
                                  }
                                  try {
                                    await createItem.mutateAsync({
                                      manutencao_id: m.id,
                                      obra_id: m.obra_id,
                                      descricao: trimmed,
                                    })
                                    setNewProblemText('')
                                    setAddingProblemFor(null)
                                  } catch {
                                    toast({ title: 'Erro ao adicionar problema', variant: 'error' })
                                  }
                                }}
                                className="text-[11px] font-medium px-2 py-1 rounded-lg disabled:opacity-50 disabled:pointer-events-none"
                                style={{ color: '#FF9500', background: 'rgba(255,149,0,0.1)' }}
                              >
                                {createItem.isPending ? '…' : 'Salvar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProblemText('')
                                  setAddingProblemFor(null)
                                }}
                                className="text-[11px] text-muted-foreground/60 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewProblemText('')
                                setAddingProblemFor(m.id)
                              }}
                              className="flex items-center gap-1.5 text-[12px] font-medium py-1"
                              style={{ color: '#FF9500' }}
                            >
                              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
                              Adicionar problema
                            </button>
                          )}
                        </div>

                        {/* Actions row */}
                        <div
                          className="flex items-center gap-2 pt-2.5"
                          style={{ borderTop: '1px solid rgba(255,149,0,0.08)' }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              // Pre-select the maintenance tab so obra-detail opens directly on it
                              try {
                                sessionStorage.setItem(`obra-tab-${m.obra_id}`, 'manutencao')
                              } catch {
                                // sessionStorage may be unavailable (private browsing / quota exceeded)
                              }
                              navigate({ to: '/obras/$obraId', params: { obraId: m.obra_id } })
                            }}
                            className="flex items-center gap-1 h-8 rounded-xl px-3 text-[12px] font-medium transition-colors bg-muted text-muted-foreground"
                          >
                            Ver obra
                            <ChevronRight style={{ width: 12, height: 12 }} />
                          </button>

                          <div className="flex-1" />

                          <button
                            type="button"
                            disabled={!allResolved || concluir.isPending}
                            title={
                              !allResolved ? 'Resolva todos os itens antes de concluir' : undefined
                            }
                            onClick={async () => {
                              try {
                                await concluir.mutateAsync({ id: m.id, obra_id: m.obra_id })
                                toast({ title: 'Manutenção concluída!' })
                              } catch {
                                toast({ title: 'Erro ao concluir manutenção', variant: 'error' })
                              }
                            }}
                            className="flex items-center gap-1.5 h-8 rounded-xl px-3 text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              background: allResolved
                                ? 'linear-gradient(135deg, #34C759 0%, #28A745 100%)'
                                : 'rgba(255,149,0,0.12)',
                              color: allResolved ? 'white' : clr.orange,
                              boxShadow: allResolved ? '0 2px 8px rgba(52,199,89,0.25)' : 'none',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Concluir manutenção
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
