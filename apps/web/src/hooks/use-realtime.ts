import {
  invalidateAllObraQueries,
  invalidateDerivedObraQueries,
  invalidateEntradaAnalyticsQueries,
  invalidateMovimentacaoDerivedQueries,
} from '@/lib/query-invalidation'
import { supabase } from '@/lib/supabase'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

type DebouncedFn<T extends (...args: unknown[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
}

// Debounce helper — collapses rapid-fire invalidations into one
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as DebouncedFn<T>
  debounced.cancel = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }
  return debounced
}

export function useRealtimeSync() {
  const qc = useQueryClient()
  const setStatus = useRealtimeStore((s) => s.setStatus)
  const statusRef = useRef(useRealtimeStore.getState().status)

  // Keep ref in sync so the subscribe callback can read latest status
  useEffect(() => {
    return useRealtimeStore.subscribe((state) => {
      statusRef.current = state.status
    })
  }, [])

  const isFirstConnection = useRef(true)

  // Refresh all queries when user returns to the app (mobile resume).
  // This is critical on iOS where the app can be suspended for minutes.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        qc.invalidateQueries()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [qc])

  useEffect(() => {
    // Debounced invalidators — prevent UI thrashing from rapid DB changes
    const invalidateFinContas = debounce(
      () => qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
      500,
    )
    const invalidateFinMov = debounce(
      () => qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes'] }),
      500,
    )
    const invalidateFinMeta = debounce(() => {
      qc.invalidateQueries({ queryKey: ['financeiro', 'meta'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
    }, 500)
    const invalidateContasPagar = debounce(
      () => qc.invalidateQueries({ queryKey: ['contas_pagar'] }),
      500,
    )
    const invalidateContasReceber = debounce(
      () => qc.invalidateQueries({ queryKey: ['contas_receber'] }),
      500,
    )
    const invalidateEstoque = debounce(() => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['estoque', 'alertas'] })
      invalidateDerivedObraQueries(qc)
    }, 500)
    const invalidateAlmoxarifados = debounce(() => {
      qc.invalidateQueries({ queryKey: ['almoxarifados'] })
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['estoque', 'alertas'] })
      invalidateDerivedObraQueries(qc)
    }, 500)
    const invalidateMovimentacoes = debounce(() => {
      invalidateMovimentacaoDerivedQueries(qc)
      invalidateEntradaAnalyticsQueries(qc)
    }, 500)
    const invalidateObras = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obras'] })
      invalidateAllObraQueries(qc)
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    }, 500)
    const invalidateObraManutencao = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['obra_manutencao'] })
      invalidateAllObraQueries(qc)
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    }, 500)
    const invalidateObraLancamentos = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obra-lancamentos-burocracia'] })
      qc.invalidateQueries({ queryKey: ['obras'] })
      invalidateDerivedObraQueries(qc)
      qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    }, 500)
    const invalidateDocumentos = debounce(() => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
    }, 500)
    const invalidateMateriais = debounce(() => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
    }, 500)
    const invalidateCategorias = debounce(() => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['materiais'] })
    }, 500)
    const invalidateTarefas = debounce(() => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    }, 500)
    const invalidateNFs = debounce(() => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
    }, 500)
    const invalidateFornecedores = debounce(() => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] })
    }, 500)
    const invalidateUserPreferences = debounce(() => {
      qc.invalidateQueries({ queryKey: ['user-preferences'] })
    }, 500)
    const debouncedInvalidators = [
      invalidateFinContas,
      invalidateFinMov,
      invalidateFinMeta,
      invalidateContasPagar,
      invalidateContasReceber,
      invalidateEstoque,
      invalidateAlmoxarifados,
      invalidateMovimentacoes,
      invalidateObras,
      invalidateObraManutencao,
      invalidateObraLancamentos,
      invalidateDocumentos,
      invalidateMateriais,
      invalidateCategorias,
      invalidateTarefas,
      invalidateNFs,
      invalidateFornecedores,
      invalidateUserPreferences,
    ]

    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        switch (payload.table) {
          // ── financeiro ──────────────────────────────────────────────────────────
          case 'financeiro_contas':
            invalidateFinContas()
            break
          case 'financeiro_movimentacoes':
            invalidateFinMov()
            break
          case 'financeiro_meta':
            invalidateFinMeta()
            break
          // ── contas a pagar / receber ─────────────────────────────────────────────
          case 'contas_pagar':
          case 'contas_pagar_parcelas':
            invalidateContasPagar()
            break
          case 'contas_receber':
          case 'contas_receber_parcelas':
            invalidateContasReceber()
            break
          // ── estoque ──────────────────────────────────────────────────────────────
          case 'estoques':
            invalidateEstoque()
            break
          case 'almoxarifados':
            invalidateAlmoxarifados()
            break
          case 'movimentacoes':
            invalidateMovimentacoes()
            break
          // ── obras ────────────────────────────────────────────────────────────────
          case 'obras':
            invalidateObras()
            break
          case 'obra_manutencao':
          case 'obra_manutencao_item':
            invalidateObraManutencao()
            break
          case 'obra_lancamentos_burocracia':
            invalidateObraLancamentos()
            break
          // ── documentos ───────────────────────────────────────────────────────────
          case 'documentos':
          case 'documento_categorias':
            invalidateDocumentos()
            break
          // ── materiais / categorias ───────────────────────────────────────────────
          case 'materiais':
            invalidateMateriais()
            break
          case 'categorias':
            invalidateCategorias()
            break
          case 'itens_nf':
            invalidateNFs()
            break
          // ── tarefas / notas / fornecedores ───────────────────────────────────────
          case 'tarefas':
            invalidateTarefas()
            break
          case 'notas_fiscais':
            invalidateNFs()
            break
          case 'fornecedores':
            invalidateFornecedores()
            break
          // ── user preferences ────────────────────────────────────────────────────
          case 'user_preferences':
            invalidateUserPreferences()
            break
        }
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          if (isFirstConnection.current) {
            isFirstConnection.current = false
            setStatus('CONNECTED')
            return
          }
          // Just reconnected — invalidate all active queries to ensure fresh data
          if (statusRef.current === 'RECONNECTING' || statusRef.current === 'DISCONNECTED') {
            qc.invalidateQueries()
          }
          setStatus('CONNECTED')
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('RECONNECTING')
        } else if (channelStatus === 'CLOSED') {
          setStatus('DISCONNECTED')
        }
      })

    return () => {
      for (const invalidate of debouncedInvalidators) {
        invalidate.cancel()
      }
      supabase.removeChannel(channel)
    }
  }, [qc, setStatus])
}
