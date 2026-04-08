import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { CreditCard, Package, RefreshCw, Sparkles } from 'lucide-react'
import { PAGAMENTO_IMEDIATO_TPAG, categorizeByCFOP, getPagLabel } from '../notas-fiscais-utils'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

type Props = {
  model: NotasFiscaisPageModel
}

const INTERNAL_UNITS = ['UN', 'PC', 'PÇ', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'CX', 'PCT', 'PAR']

export function NotasFiscaisImportReviewStep({ model }: Props) {
  const {
    cleaningAllNames,
    cleaningNameIndices,
    confirmedCount,
    handleCleanAllNamesAI,
    handleCleanNameAI,
    matchStates,
    parsed,
    parsedPagamentos,
    reviewEditedNames,
    setManuallyEditedNames,
    setReviewEditedNames,
  } = model

  if (!parsed) return null

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col flex-1 min-h-0 gap-0 py-0"
    >
      <div className="flex-1 overflow-y-auto space-y-5 py-5 min-h-0">
        <div
          className="rounded-[20px] border p-5"
          style={{ borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'var(--card)' }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: '#8E8E93' }}
          >
            Resumo da Nota
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total de Itens', value: parsed.itens.length, color: '#007AFF' },
              { label: 'Já no Estoque', value: confirmedCount, color: '#34C759' },
              {
                label: 'Produtos Novos',
                value: parsed.itens.length - confirmedCount,
                color: '#FF9500',
              },
            ].map((summary) => (
              <div key={summary.label} className="text-center">
                <p
                  className="text-[28px] font-bold tabular-nums leading-none"
                  style={{ color: summary.color }}
                >
                  {summary.value}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-1 leading-tight">
                  {summary.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {parsed.itens.length - confirmedCount > 0 && (
          <div
            className="rounded-[20px] border p-4"
            style={{ borderColor: '#FF950030', backgroundColor: '#FF95000A' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[12px] shrink-0"
                style={{ backgroundColor: '#FF950018' }}
              >
                <Sparkles className="h-4 w-4" style={{ color: '#FF9500' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: '#FF9500' }}>
                  {parsed.itens.length - confirmedCount === 1
                    ? '1 produto novo será cadastrado'
                    : `${parsed.itens.length - confirmedCount} produtos novos serão cadastrados`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Edite os nomes antes de confirmar
                </p>
              </div>
              <button
                type="button"
                disabled={cleaningAllNames}
                onClick={handleCleanAllNamesAI}
                className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40 shrink-0"
                style={{ backgroundColor: '#007AFF15', color: '#007AFF' }}
              >
                {cleaningAllNames ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {cleaningAllNames ? 'Corrigindo...' : 'Corrigir todos'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {matchStates
                .filter((state) => state.matchStatus !== 'confirmed')
                .map((state) => {
                  const editedName = reviewEditedNames.get(state.index) ?? state.item.descricao
                  const isCleaning = cleaningNameIndices.has(state.index)

                  return (
                    <div
                      key={state.index}
                      className="rounded-[12px] px-3 py-2"
                      style={{ backgroundColor: '#FF950010' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-3.5 w-3.5 shrink-0" style={{ color: '#FF9500' }} />
                        {state.item.gtin ? (
                          <span className="text-[9px] font-mono text-muted-foreground">
                            EAN {state.item.gtin}
                          </span>
                        ) : state.item.cProd ? (
                          <span className="text-[9px] font-mono text-muted-foreground">
                            cód. {state.item.cProd}
                          </span>
                        ) : null}

                        <button
                          type="button"
                          disabled={isCleaning || cleaningAllNames}
                          onClick={() => handleCleanNameAI(state.index, editedName)}
                          className="ml-auto p-1 rounded-[8px] hover:bg-[#007AFF12] transition-colors disabled:opacity-40"
                          title="Corrigir nome com IA"
                        >
                          {isCleaning ? (
                            <RefreshCw
                              className="h-3 w-3 animate-spin"
                              style={{ color: '#007AFF' }}
                            />
                          ) : (
                            <Sparkles className="h-3 w-3" style={{ color: '#007AFF' }} />
                          )}
                        </button>
                      </div>

                      <input
                        type="text"
                        value={editedName}
                        disabled={isCleaning}
                        onChange={(e) => {
                          const value = e.target.value
                          setReviewEditedNames((prev) => {
                            const next = new Map(prev)
                            next.set(state.index, value)
                            return next
                          })
                          setManuallyEditedNames((prev) => new Set([...prev, state.index]))
                        }}
                        className="w-full text-[12px] font-medium bg-transparent border-b border-[#FF9500]/30 focus:border-[#FF9500] outline-none pb-0.5 transition-colors disabled:opacity-50"
                        placeholder="Nome do produto..."
                      />

                      {state.item.unidade &&
                        !INTERNAL_UNITS.includes(state.item.unidade.toUpperCase()) && (
                          <p className="text-[10px] mt-1" style={{ color: '#FF9500' }}>
                            Unidade: {state.item.unidade} — verifique se é a unidade de venda
                            interna
                          </p>
                        )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {parsedPagamentos.length > 0 &&
          (() => {
            const pendingPags = parsedPagamentos.filter(
              (payment) => !PAGAMENTO_IMEDIATO_TPAG.has(payment.tPag),
            )
            const immediatePags = parsedPagamentos.filter((payment) =>
              PAGAMENTO_IMEDIATO_TPAG.has(payment.tPag),
            )
            const dominantCFOP =
              Object.entries(
                parsed.itens.reduce<Record<string, number>>((acc, item) => {
                  const key = item.cfop ?? ''
                  acc[key] = (acc[key] ?? 0) + 1
                  return acc
                }, {}),
              ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
            const category = categorizeByCFOP(dominantCFOP)

            if (category === '__DEVOLUCAO__') return null

            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[20px] border overflow-hidden"
                style={{ borderColor: '#007AFF20', background: '#007AFF06' }}
              >
                <div
                  className="px-5 py-3.5 flex items-center gap-3 border-b"
                  style={{ borderColor: '#007AFF15' }}
                >
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{ background: '#007AFF15' }}
                  >
                    <CreditCard size={15} style={{ color: '#007AFF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold" style={{ color: '#007AFF' }}>
                      Contas a Pagar geradas
                    </p>
                    <p className="text-[11px]" style={{ color: '#8E8E93' }}>
                      {pendingPags.length} pendente(s) · {immediatePags.length} pago(s) ·{' '}
                      <strong>{category}</strong>
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-blue-50/50">
                  {(() => {
                    let pendingIndex = 0

                    return parsedPagamentos.map((payment, index) => {
                      const isImmediate = PAGAMENTO_IMEDIATO_TPAG.has(payment.tPag)
                      const pendingPosition = isImmediate ? 0 : ++pendingIndex
                      const dueDate =
                        payment.dVenc ||
                        (() => {
                          const date = new Date()
                          date.setDate(date.getDate() + 30 * pendingPosition)
                          return date.toLocaleDateString('en-CA')
                        })()

                      return (
                        <div
                          key={index}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={
                                isImmediate
                                  ? { background: '#34C75915', color: '#34C759' }
                                  : { background: '#FF950015', color: '#FF9500' }
                              }
                            >
                              {isImmediate ? 'Pago' : 'Pendente'}
                            </span>
                            <span className="text-[13px] truncate text-foreground">
                              {getPagLabel(payment.tPag, payment.xPag)}
                            </span>
                            {!isImmediate && (
                              <span className="text-[11px] shrink-0" style={{ color: '#8E8E93' }}>
                                {new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] font-bold shrink-0 text-foreground">
                            {formatCurrency(payment.vPag)}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>

                {parsed.nf.valor_liquido < parsed.nf.valor_total && (
                  <div
                    className="px-5 py-2.5 border-t"
                    style={{ borderColor: '#FF950020', background: '#FF950008' }}
                  >
                    <p className="text-[11px]" style={{ color: '#FF9500' }}>
                      Valor líquido a pagar:{' '}
                      <strong>{formatCurrency(parsed.nf.valor_liquido)}</strong> (−
                      {formatCurrency(parsed.nf.valor_total - parsed.nf.valor_liquido)} em impostos
                      retidos)
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })()}
      </div>
    </motion.div>
  )
}
