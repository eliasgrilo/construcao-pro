/**
 * notas-fiscais-item-match.tsx
 * ConfidenceBar + ItemMatchCard extracted from notas-fiscais-import-components.tsx
 */
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Package,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import type { ItemMatchState, MaterialItem } from './notas-fiscais-types'

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 0.8 ? '#34C759' : value >= 0.5 ? '#FF9500' : '#FF3B30'
  const pct = Math.round(value * 100)
  const label = value >= 0.8 ? 'Alta' : value >= 0.5 ? 'Média' : 'Baixa'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Confiança {label}
        </span>
        <motion.span
          className="text-[12px] font-bold tabular-nums"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          {pct}%
        </motion.span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.02, 0.64, 1] }}
        />
      </div>
    </div>
  )
}

// ─── ItemMatchCard — redesigned two-panel layout (XML → AI Suggestion) ─────────

export function ItemMatchCard({
  state,
  catalog,
  onConfirm,
  onReject,
  onSkip,
  onSelectAlternative,
}: {
  state: ItemMatchState
  catalog: MaterialItem[]
  onConfirm: () => void
  onReject: () => void
  onSkip: () => void
  onSelectAlternative: (material: MaterialItem) => void
}) {
  const {
    item,
    matchStatus,
    geminiResult,
    isLocalMatch,
    confirmedMaterialId,
    showAlternatives,
    error,
  } = state

  const topAlternatives = useMemo(() => {
    if (!showAlternatives) return []
    const query = item.descricao.toLowerCase()
    const tokens = query.split(/\s+/).filter((t) => t.length > 2)
    const scored = catalog.map((m) => {
      const name = m.nome.toLowerCase()
      const score = tokens.reduce((acc, t) => acc + (name.includes(t) ? 1 : 0), 0)
      return { m, score }
    })
    const geminiId = geminiResult?.vinculo_sugerido?.id_interno
    scored.sort((a, b) => {
      if (a.m.id === geminiId) return -1
      if (b.m.id === geminiId) return 1
      return b.score - a.score
    })
    return scored.slice(0, 7).map((s) => s.m)
  }, [showAlternatives, catalog, item.descricao, geminiResult?.vinculo_sugerido?.id_interno])

  const isConfirmed = matchStatus === 'confirmed'
  const isSkipped = matchStatus === 'skipped'
  const isAnalyzing = matchStatus === 'analyzing'

  const cardBorderColor = isConfirmed ? '#34C75940' : isAnalyzing ? '#007AFF25' : 'rgba(0,0,0,0.08)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'rounded-[20px] border overflow-hidden transition-colors duration-300',
        isSkipped && 'opacity-50',
      )}
      style={{
        borderColor: cardBorderColor,
        backgroundColor: isConfirmed ? '#34C75906' : 'var(--card)',
      }}
    >
      {/* ── Section 1: XML Item ──────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3.5 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] mt-0.5"
          style={{ backgroundColor: '#007AFF0F' }}
        >
          <Package className="h-[18px] w-[18px]" style={{ color: '#007AFF' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.08em] mb-1"
            style={{ color: '#007AFF70' }}
          >
            Item XML
          </p>
          <p className="text-[13px] font-semibold leading-snug">{item.descricao}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center flex-wrap gap-x-1">
            <span className="font-medium tabular-nums">
              {item.quantidade} {item.unidade}
            </span>
            <span className="opacity-30">·</span>
            <span className="tabular-nums">{formatCurrency(item.valor_total)}</span>
            {item.ncm && (
              <>
                <span className="opacity-30">·</span>
                <span className="font-mono text-[10px]">NCM {item.ncm}</span>
              </>
            )}
          </p>
        </div>
        {isConfirmed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: '#34C759' }}
          >
            <CheckCheck className="h-3.5 w-3.5 text-white" />
          </motion.div>
        )}
        {isSkipped && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: '#8E8E9320' }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* ── Analyzing state ────────────────────────────────────────────── */}
      {isAnalyzing && (
        <div className="px-4 pb-4">
          {/* Bridge divider */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ backgroundColor: '#007AFF10' }}
            >
              <div
                className="h-3 w-3 rounded-full border-[2px] border-t-transparent animate-spin shrink-0"
                style={{ borderColor: '#007AFF30', borderTopColor: '#007AFF' }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{ color: '#007AFF' }}
              >
                Gemini AI
              </span>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>
          <div className="rounded-[12px] px-3.5 py-3" style={{ backgroundColor: '#007AFF08' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#007AFF' }}>
              Buscando correspondência no catálogo…
            </p>
          </div>
        </div>
      )}

      {/* ── Pending with no result ──────────────────────────────────────── */}
      {matchStatus === 'pending' && !geminiResult && !error && (
        <div className="px-4 pb-4">
          <div
            className="rounded-[12px] px-3 py-2.5 text-[12px] text-muted-foreground"
            style={{ backgroundColor: '#8E8E9310' }}
          >
            Aguardando análise…
          </div>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && !isAnalyzing && !geminiResult && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <div className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#FF3B3012' }}>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{ color: '#FF3B30' }}
              >
                Erro
              </span>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>
          <div
            className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3"
            style={{ backgroundColor: '#FF3B3010' }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#FF3B30' }} />
            <p className="text-[12px]" style={{ color: '#FF3B30' }}>
              {error}
            </p>
          </div>
          <button
            type="button"
            className="text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#007AFF' }}
            onClick={onReject}
          >
            Selecionar manualmente →
          </button>
        </div>
      )}

      {/* ── Gemini result (pending confirmation) ──────────────────────── */}
      {geminiResult?.vinculo_sugerido && !isConfirmed && !isSkipped && !showAlternatives && (
        <div className="px-4 pb-4">
          {/* AI Bridge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ backgroundColor: isLocalMatch ? '#FF950012' : '#007AFF10' }}
            >
              <Bot className="h-3 w-3" style={{ color: isLocalMatch ? '#FF9500' : '#007AFF' }} />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{ color: isLocalMatch ? '#FF9500' : '#007AFF' }}
              >
                {isLocalMatch ? 'Fallback local' : 'Gemini AI'}
              </span>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>

          {/* Catalog suggestion */}
          <div
            className="rounded-[16px] p-3.5 mb-3 space-y-2.5"
            style={{
              backgroundColor: isLocalMatch
                ? '#FF950006'
                : geminiResult.status === 'sucesso'
                  ? '#34C75906'
                  : '#FF950006',
              border: '1px solid',
              borderColor: isLocalMatch
                ? '#FF950022'
                : geminiResult.status === 'sucesso'
                  ? '#34C75922'
                  : '#FF950022',
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Catálogo Interno
              </p>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isLocalMatch
                    ? '#FF950018'
                    : geminiResult.status === 'sucesso'
                      ? '#34C75918'
                      : '#FF950018',
                  color: isLocalMatch
                    ? '#FF9500'
                    : geminiResult.status === 'sucesso'
                      ? '#34C759'
                      : '#FF9500',
                }}
              >
                {isLocalMatch
                  ? 'IA indisponível'
                  : geminiResult.status === 'sucesso'
                    ? 'Alta confiança'
                    : 'Verificar'}
              </span>
            </div>
            <p className="text-[14px] font-semibold leading-snug">
              {geminiResult.vinculo_sugerido.nome_interno}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {geminiResult.vinculo_sugerido.justificativa_logica}
            </p>
            <ConfidenceBar value={geminiResult.vinculo_sugerido.confianca} />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center justify-center gap-1.5 rounded-[13px] py-2.5 text-[13px] font-semibold transition-all active:scale-[0.97]"
              style={{ backgroundColor: '#34C759', color: 'white' }}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Confirmar
            </button>
            <button
              type="button"
              onClick={onReject}
              className="flex items-center justify-center gap-1.5 rounded-[13px] py-2.5 text-[13px] font-semibold border transition-all active:scale-[0.97]"
              style={{
                borderColor: 'rgba(0,0,0,0.10)',
                color: '#FF3B30',
                backgroundColor: 'transparent',
              }}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Rejeitar
            </button>
          </div>
        </div>
      )}

      {/* ── Manual alternatives picker ─────────────────────────────────── */}
      {showAlternatives && !isConfirmed && !isSkipped && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1">
              Selecionar manualmente
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>
          <div
            className="rounded-[16px] border divide-y overflow-hidden"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          >
            {topAlternatives.map((mat) => (
              <button
                type="button"
                key={mat.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => onSelectAlternative(mat)}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: '#007AFF12' }}
                >
                  <Package className="h-4 w-4" style={{ color: '#007AFF' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium line-clamp-2">{mat.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {mat.codigo} · {mat.unidade}
                    {mat.categoria && ` · ${mat.categoria.nome}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              </button>
            ))}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
              onClick={onSkip}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: '#8E8E9318' }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground">Pular — sem vínculo</p>
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmed state ────────────────────────────────────────────── */}
      {isConfirmed && confirmedMaterialId && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px" style={{ backgroundColor: '#34C75930' }} />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.08em] px-1"
              style={{ color: '#34C75990' }}
            >
              Vinculado
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#34C75930' }} />
          </div>
          <div
            className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5"
            style={{ backgroundColor: '#34C75910' }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#34C759' }} />
            <p className="text-[12px] font-semibold truncate" style={{ color: '#34C759' }}>
              {state.confirmedMaterialNome}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
