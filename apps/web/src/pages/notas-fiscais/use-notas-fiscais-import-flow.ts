import { useToast } from '@/components/ui/toast'
import type {
  FinanceiroConta,
  useCreateContaPagar,
  useRegisterFinanceiroMovement,
} from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FornecedorItem,
  MaterialItem,
  NFItemParsed,
  NFePagamento,
  NFeParsed,
  UploadStep,
} from '../notas-fiscais-types'
import { PAGAMENTO_IMEDIATO_TPAG, parseNFeXML } from '../notas-fiscais-utils'
import { useNFeDistribution } from './hooks/use-nfe-distribution'
import { useNFeMatching } from './hooks/use-nfe-matching'
import { runNotasFiscaisImport } from './run-notas-fiscais-import'

type Params = {
  fornecedores: FornecedorItem[]
  materiais: MaterialItem[]
  almoxarifados: Array<{ id: string; nome: string; obra?: { id: string; nome: string } | null }>
  contas: FinanceiroConta[]
  registerFinanceiroMovement: ReturnType<typeof useRegisterFinanceiroMovement>
  createContaPagar: ReturnType<typeof useCreateContaPagar>
}

export function useNotasFiscaisImportFlow({
  fornecedores,
  materiais,
  almoxarifados,
  contas,
  registerFinanceiroMovement,
  createContaPagar,
}: Params) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parseRunIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const [uploadStep, setUploadStep] = useState<UploadStep | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rawXml, setRawXml] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsed, setParsed] = useState<{ nf: NFeParsed; itens: NFItemParsed[] } | null>(null)
  const [parsedPagamentos, setParsedPagamentos] = useState<NFePagamento[]>([])
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null)
  const [matchedFornecedorId, setMatchedFornecedorId] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      parseRunIdRef.current += 1
    }
  }, [])

  // -- Matching Hook --
  const matchingControl = useNFeMatching(
    parsed,
    materiais,
    fornecedores,
    matchedFornecedorId,
    toast,
  )

  // -- Distribution Hook --
  const distributionControl = useNFeDistribution(
    matchingControl.matchStates,
    matchingControl.reviewEditedNames,
  )

  const handleBack = () => {
    if (showReview) {
      setShowReview(false)
      return
    }
    if (uploadStep === 'preview') setUploadStep('select')
    else if (uploadStep === 'matching') setUploadStep('preview')
    else if (uploadStep === 'finalizar') setUploadStep('matching')
  }

  const handleFileSelect = useCallback(
    (f: File) => {
      if (!f.name.toLowerCase().endsWith('.xml')) {
        toast({
          title: 'Formato inválido',
          description: 'Selecione um arquivo .xml de NF-e.',
          variant: 'error',
        })
        return
      }
      const allowedXmlMime = new Set(['application/xml', 'text/xml', ''])
      if (f.type && !allowedXmlMime.has(f.type)) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `Esperado XML, recebido: ${f.type}.`,
          variant: 'error',
        })
        return
      }
      if (f.size > 1 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `NF-e XML deve ter no máximo 1 MB. Tamanho: ${(f.size / 1024).toFixed(0)} KB.`,
          variant: 'error',
        })
        return
      }
      parseRunIdRef.current += 1
      setFile(f)
      setRawXml(null)
      setParsed(null)
      setParsedPagamentos([])
      setSelectedContaId(null)
      setMatchedFornecedorId(null)
      setShowReview(false)
      matchingControl.resetMatching()
      distributionControl.resetDistributions()
    },
    [distributionControl, matchingControl, toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFileSelect(f)
    },
    [handleFileSelect],
  )

  const handleParseXML = useCallback(async () => {
    if (!file || parsing) return
    const runId = ++parseRunIdRef.current
    setParsing(true)
    try {
      const text = await file.text()
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      setRawXml(text)
      const result = parseNFeXML(text)
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      setParsed(result)
      setParsedPagamentos(result.nf.pagamentos)

      const { data: existingNf } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('chave_acesso', result.nf.chave_acesso)
        .maybeSingle()
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      if (existingNf) {
        toast({
          title: 'NF-e já importada',
          description: 'Esta nota fiscal já foi importada anteriormente.',
          variant: 'error',
        })
        resetUpload()
        return
      }

      const cnpjEmitente = result.nf.cnpj_emitente
      const { data: fornFound } = await supabase.rpc('buscar_fornecedor_por_cnpj', {
        p_cnpj: cnpjEmitente,
      })
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      if (fornFound?.[0]?.id) {
        setMatchedFornecedorId(fornFound[0].id)
      } else if (cnpjEmitente.replace(/\D/g, '')) {
        try {
          const nf = result.nf
          const { data: newForn } = await supabase
            .from('fornecedores')
            .insert({
              nome: nf.nome_emitente,
              cnpj: nf.cnpj_emitente,
              nome_fantasia: nf.nome_fantasia_emitente ?? null,
              inscricao_estadual: nf.ie_emitente ?? null,
              telefone: nf.fone_emitente ?? null,
              endereco: nf.endereco_emitente ?? null,
              ativo: true,
            })
            .select('id')
            .single()
          if (!isMountedRef.current || parseRunIdRef.current !== runId) return
          if (newForn?.id) {
            setMatchedFornecedorId(newForn.id)
            qc.invalidateQueries({ queryKey: ['fornecedores'] })
            toast({
              title: 'Fornecedor cadastrado',
              description: `${nf.nome_emitente} foi cadastrado automaticamente.`,
            })
          }
        } catch (error) {
          // Non-blocking: import continues without auto-matched supplier
          console.error('[NFe] Auto-create fornecedor failed:', error)
        }
      }
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      setUploadStep('preview')
    } catch (e) {
      if (!isMountedRef.current || parseRunIdRef.current !== runId) return
      toast({
        title: 'Erro ao processar XML',
        description: e instanceof Error ? e.message : 'Arquivo inválido.',
        variant: 'error',
      })
    } finally {
      if (isMountedRef.current && parseRunIdRef.current === runId) {
        setParsing(false)
      }
    }
  }, [file, parsing, toast, qc])

  const startMatchingDelegated = () => {
    if (!parsed || matchingControl.isRunningAI) return
    setUploadStep('matching')
    matchingControl.startMatching()
  }

  const startFinalizar = () => {
    const validItems = matchingControl.confirmedItems.filter(
      (s) => s.confirmedMaterialId !== null && s.confirmedMaterialNome !== null,
    )
    if (validItems.length !== matchingControl.confirmedItems.length) {
      toast({
        title: 'Erro de validação',
        description: 'Alguns itens perderam vinculações. Tente novamente.',
        variant: 'error',
      })
      return
    }
    distributionControl.buildDistributions()

    if ((contas?.length ?? 0) === 1) setSelectedContaId(contas[0].id)
    setUploadStep('finalizar')
  }

  const immediateDebitAmount = useMemo(() => {
    if (!parsed) return 0
    const isNormal = parsed.nf.finalidade === null || parsed.nf.finalidade === 1
    if (!isNormal) return 0
    return parsedPagamentos
      .filter((p) => PAGAMENTO_IMEDIATO_TPAG.has(p.tPag))
      .reduce((s, p) => s + p.vPag, 0)
  }, [parsed, parsedPagamentos])

  const handleImport = async () => {
    if (!parsed || !file || uploading) return
    setUploading(true)
    try {
      await runNotasFiscaisImport({
        file,
        parsed,
        parsedPagamentos,
        immediateDebitAmount,
        contas,
        selectedContaId,
        matchStates: matchingControl.matchStates,
        matchedFornecedorId,
        rawXml,
        distributions: distributionControl.distributions,
        reviewAlmoxarifadoId: distributionControl.reviewAlmoxarifadoId,
        almoxarifados,
        reviewEditedNames: matchingControl.reviewEditedNames,
        registerFinanceiroMovement,
        createContaPagar,
        qc,
        toast,
        resetUpload,
      })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    parseRunIdRef.current += 1
    setUploadStep(null)
    setFile(null)
    setRawXml(null)
    setParsed(null)
    setParsedPagamentos([])
    setSelectedContaId(null)
    setMatchedFornecedorId(null)
    setParsing(false)
    setUploading(false)
    setShowReview(false)
    setDragOver(false)

    matchingControl.resetMatching()
    distributionControl.resetDistributions()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return {
    ...matchingControl,
    ...distributionControl,
    dragOver,
    file,
    fileInputRef,
    handleBack,
    handleDrop,
    handleFileSelect,
    handleImport,
    handleParseXML,
    immediateDebitAmount,
    matchedFornecedorId,
    parsed,
    parsedPagamentos,
    parsing,
    resetUpload,
    selectedContaId,
    setDragOver,
    setSelectedContaId,
    setShowReview,
    setUploadStep,
    showReview,
    startFinalizar,
    startMatching: startMatchingDelegated,
    uploadStep,
    uploading,
  }
}
