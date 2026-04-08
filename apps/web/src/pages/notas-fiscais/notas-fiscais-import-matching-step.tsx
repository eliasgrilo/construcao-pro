import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { ItemMatchCard } from '../notas-fiscais-item-match'
import type { MaterialItem } from '../notas-fiscais-types'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

type Props = {
  model: NotasFiscaisPageModel
}

export function NotasFiscaisImportMatchingStep({ model }: Props) {
  const {
    confirmAllHighConfidence,
    confirmMatch,
    confirmedCount,
    hasAutoConfirmable,
    isRunningAI,
    matchStates,
    matchSummary,
    materiais,
    rejectMatch,
    resolvedCount,
    selectAlternative,
    skipMatch,
  } = model

  return (
    <motion.div
      key="matching"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col flex-1 min-h-0 gap-4 py-4"
    >
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-muted-foreground">
            {isRunningAI
              ? 'Gemini AI está analisando os itens…'
              : `${confirmedCount} de ${matchStates.length} itens confirmados`}
          </p>
          {matchStates.length > 0 && (
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: confirmedCount === matchStates.length ? '#34C759' : '#007AFF' }}
            >
              {resolvedCount}/{matchStates.length}
            </span>
          )}
        </div>

        {matchStates.length > 0 && (
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: '#34C759' }}
              animate={{ width: `${(resolvedCount / matchStates.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        )}

        {!isRunningAI && hasAutoConfirmable && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-3 rounded-[16px] px-4 py-3 border"
            style={{ backgroundColor: '#34C75906', borderColor: '#34C75930' }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: '#34C75918' }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: '#34C759' }} />
            </div>
            <p
              className="text-[12px] flex-1 font-semibold leading-tight"
              style={{ color: '#34C759' }}
            >
              Alta confiança detectada
              <br />
              <span className="font-normal opacity-75">Aceite todos os vínculos sugeridos</span>
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={confirmAllHighConfidence}
              className="text-[12px] font-bold px-3.5 py-1.5 rounded-[10px] transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: '#34C759', color: 'white' }}
            >
              Confirmar todos
            </motion.button>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
        <AnimatePresence>
          {matchSummary?.allResolved && (
            <motion.div
              key="review-banner"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-[20px] border p-5 mb-4"
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
                  { label: 'Total de Itens', value: matchSummary.total, color: '#007AFF' },
                  { label: 'Já no Estoque', value: matchSummary.confirmed, color: '#34C759' },
                  {
                    label: 'Produtos Novos',
                    value: matchSummary.skipped + matchSummary.pending,
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
              {matchSummary.skipped + matchSummary.pending > 0 && (
                <div
                  className="mt-3.5 pt-3.5 border-t flex items-start gap-2"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#FF9500' }} />
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {matchSummary.skipped + matchSummary.pending === 1
                      ? '1 produto inédito será cadastrado automaticamente no seu catálogo.'
                      : `${matchSummary.skipped + matchSummary.pending} produtos inéditos serão cadastrados automaticamente no seu catálogo.`}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {matchStates.map((state) => (
          <ItemMatchCard
            key={state.index}
            state={state}
            catalog={materiais as MaterialItem[]}
            onConfirm={() => confirmMatch(state.index)}
            onReject={() => rejectMatch(state.index)}
            onSkip={() => skipMatch(state.index)}
            onSelectAlternative={(material) => selectAlternative(state.index, material)}
          />
        ))}
      </div>
    </motion.div>
  )
}
