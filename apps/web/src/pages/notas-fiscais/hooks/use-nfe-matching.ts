import type { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FornecedorItem,
  ItemMatchState,
  MatchStatus,
  MaterialItem,
  NFItemParsed,
} from '../../notas-fiscais-types'
import {
  GeminiFatalKeyError,
  _memoryCache,
  callGemini,
  cleanProductName,
  item_key,
  loadMemoryCloud,
  localMatch,
  saveMemoryCloud,
} from '../../notas-fiscais-utils'

export function useNFeMatching(
  parsed: { itens: NFItemParsed[] } | null,
  materiais: MaterialItem[],
  fornecedores: FornecedorItem[],
  matchedFornecedorId: string | null,
  toast: ReturnType<typeof useToast>['toast'],
) {
  const [matchStates, setMatchStates] = useState<ItemMatchState[]>([])
  const [isRunningAI, setIsRunningAI] = useState(false)
  const [reviewEditedNames, setReviewEditedNames] = useState<Map<number, string>>(new Map())
  const [manuallyEditedNames, setManuallyEditedNames] = useState<Set<number>>(new Set())
  const [cleaningNameIndices, setCleaningNameIndices] = useState<Set<number>>(new Set())
  const [cleaningAllNames, setCleaningAllNames] = useState(false)
  const activeRunIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      activeRunIdRef.current += 1
    }
  }, [])

  const isRunActive = useCallback(
    (runId: number) => isMountedRef.current && activeRunIdRef.current === runId,
    [],
  )

  const startMatching = useCallback(() => {
    if (!parsed || isRunningAI) return
    const runId = activeRunIdRef.current + 1
    activeRunIdRef.current = runId
    const initial: ItemMatchState[] = parsed.itens.map((item, index) => ({
      item,
      index,
      matchStatus: 'pending',
      geminiResult: null,
      isLocalMatch: false,
      confirmedMaterialId: null,
      confirmedMaterialNome: null,
      showAlternatives: false,
      error: null,
    }))
    setMatchStates(initial)
    runAIMatching(parsed.itens, initial, runId)
  }, [isRunningAI, parsed])

  const runAIMatching = async (items: NFItemParsed[], initial: ItemMatchState[], runId: number) => {
    setIsRunningAI(true)
    try {
      const memory = await loadMemoryCloud()
      if (!isRunActive(runId)) return
      const catalog = materiais

      const ctx = { geminiOk: true, errorShown: false }

      const processItem = async (i: number): Promise<void> => {
        if (!isRunActive(runId)) return
        const item = items[i]
        const memHit = memory[item_key(item)]

        if (memHit) {
          const stillInCatalog = catalog.some((m) => m.id === memHit.id_interno)
          if (stillInCatalog) {
            setMatchStates((prev) =>
              prev.map((s) =>
                s.index === i
                  ? {
                      ...s,
                      matchStatus: 'confirmed',
                      confirmedMaterialId: memHit.id_interno,
                      confirmedMaterialNome: memHit.nome_interno,
                    }
                  : s,
              ),
            )
            return
          }
          if (_memoryCache) delete _memoryCache[item_key(item)]
        }

        if (item.gtin || item.cProd) {
          try {
            let pfQuery = supabase
              .from('produto_fornecedor')
              .select('material_id, materiais(id, nome)')
            if (item.gtin) pfQuery = pfQuery.eq('gtin', item.gtin)
            else {
              pfQuery = pfQuery.eq('cprod', item.cProd ?? '')
              if (matchedFornecedorId) pfQuery = pfQuery.eq('fornecedor_id', matchedFornecedorId)
            }
            const { data: pfHit } = await pfQuery.maybeSingle()
            if (pfHit?.material_id) {
              const mat = pfHit.materiais as { id: string; nome: string } | null
              const inCatalog = catalog.some((m) => m.id === pfHit.material_id)
              if (inCatalog) {
                setMatchStates((prev) =>
                  prev.map((s) =>
                    s.index === i
                      ? {
                          ...s,
                          matchStatus: 'confirmed',
                          confirmedMaterialId: pfHit.material_id,
                          confirmedMaterialNome: mat?.nome ?? item.descricao,
                          isLocalMatch: true,
                        }
                      : s,
                  ),
                )
                saveMemoryCloud(item_key(item), {
                  id_interno: pfHit.material_id,
                  nome_interno: mat?.nome ?? item.descricao,
                })
                return
              }
            }
          } catch (error) {
            // Non-blocking: item falls through to Gemini AI matching
            console.error('[NFe Matching] Supplier lookup failed:', error)
          }
        }
        if (!isRunActive(runId)) return

        if (ctx.geminiOk) {
          setMatchStates((prev) =>
            prev.map((s) => (s.index === i ? { ...s, matchStatus: 'analyzing' } : s)),
          )
          try {
            const g = await callGemini(item, catalog, memory)
            if (!isRunActive(runId)) return
            if (g.vinculo_sugerido) {
              setMatchStates((prev) =>
                prev.map((s) =>
                  s.index === i
                    ? { ...s, matchStatus: 'pending', geminiResult: g, isLocalMatch: false }
                    : s,
                ),
              )
              return
            }
          } catch (err) {
            ctx.geminiOk = false
            if (err instanceof GeminiFatalKeyError) {
              if (!ctx.errorShown) {
                ctx.errorShown = true
                toast({
                  title: 'IA indisponível',
                  description: (err as Error).message,
                  variant: 'error',
                })
              }
            }
          }
        }
        if (!isRunActive(runId)) return

        const local = localMatch(item, catalog)
        setMatchStates((prev) =>
          prev.map((s) =>
            s.index === i
              ? {
                  ...s,
                  matchStatus: 'pending',
                  geminiResult: local,
                  isLocalMatch: true,
                  error: local ? null : 'Nenhum material similar encontrado.',
                }
              : s,
          ),
        )
      }

      const BATCH = 5
      for (let start = 0; start < items.length; start += BATCH) {
        await Promise.allSettled(
          Array.from({ length: Math.min(BATCH, items.length - start) }, (_, j) =>
            processItem(start + j),
          ),
        )
        if (!isRunActive(runId)) return
      }
    } finally {
      if (isRunActive(runId)) {
        setIsRunningAI(false)
      }
    }
  }

  const handleCleanNameAI = useCallback(async (itemIndex: number, rawName: string) => {
    setCleaningNameIndices((prev) => new Set([...prev, itemIndex]))
    try {
      const cleaned = await cleanProductName(rawName)
      setReviewEditedNames((prev) => {
        const next = new Map(prev)
        next.set(itemIndex, cleaned)
        return next
      })
    } finally {
      setCleaningNameIndices((prev) => {
        const next = new Set(prev)
        next.delete(itemIndex)
        return next
      })
    }
  }, [])

  const handleCleanAllNamesAI = useCallback(async () => {
    if (!parsed) return
    const itemsToClean = matchStates.filter(
      (s) => s.matchStatus !== 'confirmed' && !manuallyEditedNames.has(s.index),
    )
    if (itemsToClean.length === 0) return
    setCleaningAllNames(true)
    try {
      await Promise.all(
        itemsToClean.map((s) =>
          handleCleanNameAI(s.index, reviewEditedNames.get(s.index) ?? s.item.descricao),
        ),
      )
    } finally {
      setCleaningAllNames(false)
    }
  }, [parsed, matchStates, reviewEditedNames, manuallyEditedNames, handleCleanNameAI])

  const confirmMatch = useCallback(
    (index: number) => {
      const state = matchStates.find((s) => s.index === index)
      if (!state?.geminiResult?.vinculo_sugerido) {
        rejectMatch(index)
        return
      }
      const { id_interno: materialId, nome_interno: materialNome } =
        state.geminiResult.vinculo_sugerido
      saveMemoryCloud(item_key(state.item), { id_interno: materialId, nome_interno: materialNome })
      setMatchStates((prev) =>
        prev.map((s) =>
          s.index !== index
            ? s
            : {
                ...s,
                matchStatus: 'confirmed',
                confirmedMaterialId: materialId,
                confirmedMaterialNome: materialNome,
              },
        ),
      )
    },
    [matchStates],
  )

  const rejectMatch = useCallback((index: number) => {
    setMatchStates((prev) =>
      prev.map((s) => (s.index !== index ? s : { ...s, showAlternatives: true })),
    )
  }, [])

  const selectAlternative = useCallback(
    (index: number, material: MaterialItem) => {
      const state = matchStates.find((s) => s.index === index)
      if (state)
        saveMemoryCloud(item_key(state.item), {
          id_interno: material.id,
          nome_interno: material.nome,
        })
      setMatchStates((prev) =>
        prev.map((s) =>
          s.index !== index
            ? s
            : {
                ...s,
                matchStatus: 'confirmed',
                confirmedMaterialId: material.id,
                confirmedMaterialNome: material.nome,
                showAlternatives: false,
              },
        ),
      )
    },
    [matchStates],
  )

  const skipMatch = useCallback((index: number) => {
    setMatchStates((prev) =>
      prev.map((s) =>
        s.index !== index ? s : { ...s, matchStatus: 'skipped', showAlternatives: false },
      ),
    )
  }, [])

  const confirmAllHighConfidence = useCallback(() => {
    for (const s of matchStates) {
      if (
        s.matchStatus === 'pending' &&
        s.geminiResult?.status === 'sucesso' &&
        (s.geminiResult?.vinculo_sugerido?.confianca ?? 0) >= 0.8
      ) {
        confirmMatch(s.index)
      }
    }
  }, [matchStates, confirmMatch])

  const allResolved = useMemo(
    () =>
      matchStates.length > 0 &&
      matchStates.every((s) => s.matchStatus === 'confirmed' || s.matchStatus === 'skipped'),
    [matchStates],
  )
  const confirmedItems = useMemo(
    () => matchStates.filter((s) => s.matchStatus === 'confirmed'),
    [matchStates],
  )
  const confirmedCount = confirmedItems.length
  const resolvedCount = useMemo(
    () =>
      matchStates.filter((s) => s.matchStatus === 'confirmed' || s.matchStatus === 'skipped')
        .length,
    [matchStates],
  )
  const hasAutoConfirmable = useMemo(
    () =>
      matchStates.some(
        (s) =>
          s.matchStatus === 'pending' &&
          s.geminiResult?.status === 'sucesso' &&
          (s.geminiResult?.vinculo_sugerido?.confianca ?? 0) >= 0.8,
      ),
    [matchStates],
  )
  const matchSummary = useMemo(
    () => ({
      total: matchStates.length,
      confirmed: confirmedCount,
      skipped: matchStates.filter((s) => s.matchStatus === 'skipped').length,
      pending: matchStates.filter(
        (s) => s.matchStatus === 'pending' || s.matchStatus === 'analyzing',
      ).length,
      allResolved,
    }),
    [allResolved, confirmedCount, matchStates],
  )

  const resetMatching = useCallback(() => {
    activeRunIdRef.current += 1
    setMatchStates([])
    setIsRunningAI(false)
    setReviewEditedNames(new Map())
    setManuallyEditedNames(new Set())
    setCleaningNameIndices(new Set())
    setCleaningAllNames(false)
  }, [])

  return {
    matchStates,
    setMatchStates,
    isRunningAI,
    reviewEditedNames,
    setReviewEditedNames,
    manuallyEditedNames,
    setManuallyEditedNames,
    cleaningNameIndices,
    cleaningAllNames,
    startMatching,
    handleCleanNameAI,
    handleCleanAllNamesAI,
    confirmMatch,
    rejectMatch,
    selectAlternative,
    skipMatch,
    confirmAllHighConfidence,
    allResolved,
    confirmedCount,
    confirmedItems,
    matchSummary,
    resolvedCount,
    hasAutoConfirmable,
    resetMatching,
  }
}
