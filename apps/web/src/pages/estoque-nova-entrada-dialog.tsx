import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput, formatBRL } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import {
  type FinanceiroConta,
  type FornecedorRow,
  type MaterialRow,
  useCreateEntradaEstoqueFinanceiro,
  useCreateMovimentacaoEntrada,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatCurrency, todayISO } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { iosTallDialogCn } from './dialog-styles'
import type { AlmoxByObraGroup } from './estoque-dialog-types'
import { ESTOQUE_PAYMENT_OPTIONS, parseCurrency } from './obra-detail-estoque-utils'

const triggerCn =
  'border-0 bg-transparent shadow-none h-[50px] px-4 rounded-none focus-visible:ring-0 text-[15px] sm:h-[50px] sm:px-4 sm:text-[15px] sm:rounded-none'

type NovaEntradaDialogProps = {
  open: boolean
  onClose: () => void
  materiaisList: MaterialRow[]
  almoxByObra: AlmoxByObraGroup[]
  contasList: FinanceiroConta[]
  fornecedoresList: FornecedorRow[]
}

export function NovaEntradaDialog({
  open,
  onClose,
  materiaisList,
  almoxByObra,
  contasList,
  fornecedoresList,
}: NovaEntradaDialogProps) {
  const { toast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)
  const autofilledMaterialIdRef = useRef<string | null>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const createEntrada = useCreateMovimentacaoEntrada()
  const createEntradaFinanceiro = useCreateEntradaEstoqueFinanceiro()

  const [materialId, setMaterialId] = useState('')
  const [qty, setQty] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [almoxId, setAlmoxId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [obs, setObs] = useState('')
  const [contaId, setContaId] = useState('')
  const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')

  const selectedMaterial = useMemo(
    () => materiaisList.find((m) => m.id === materialId),
    [materiaisList, materialId],
  )
  const selectedConta = useMemo(
    () => contasList.find((c) => c.id === contaId),
    [contasList, contaId],
  )

  // Auto-fill price and unit when material changes
  useEffect(() => {
    if (!selectedMaterial) {
      autofilledMaterialIdRef.current = null
      return
    }
    if (autofilledMaterialIdRef.current === selectedMaterial.id) return
    autofilledMaterialIdRef.current = selectedMaterial.id
    const raw = selectedMaterial.preco_unitario ?? 0
    setPreco(raw > 0 ? formatBRL(String(raw).replace('.', ',')) : '')
    setUnidade(selectedMaterial.unidade ?? selectedMaterial.categoria?.unidade ?? 'UN')
  }, [selectedMaterial])

  const entQtyNumber = Number(qty.replace(',', '.'))
  const entPrecoNumber = parseCurrency(preco)
  const entradaTotal =
    entQtyNumber > 0 ? entQtyNumber * (entPrecoNumber || selectedMaterial?.preco_unitario || 0) : 0
  const needsFinanceiro = entradaTotal > 0
  const isSubmitting = createEntrada.isPending || createEntradaFinanceiro.isPending

  const canSubmit =
    !!materialId &&
    !!qty &&
    entQtyNumber > 0 &&
    !!almoxId &&
    (!needsFinanceiro || (!!contaId && !!pagamento)) &&
    !isSubmitting

  const reset = useCallback(() => {
    autofilledMaterialIdRef.current = null
    setMaterialId('')
    setQty('')
    setPreco('')
    setUnidade('')
    setPagamento('')
    setAlmoxId('')
    setFornecedorId('')
    setObs('')
    setContaId('')
    setSubconta('CAIXA')
  }, [])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    reset()
    onClose()
  }, [isSubmitting, onClose, reset])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return

    const precoUnitario = entPrecoNumber || selectedMaterial?.preco_unitario || 0

    const onSuccess = () => {
      toast({ title: 'Entrada registrada com sucesso!', variant: 'success' })
      reset()
      onClose()
    }
    const onError = (error: Error) => {
      toast({ title: 'Erro ao registrar entrada', description: error?.message, variant: 'error' })
    }

    if (needsFinanceiro) {
      createEntradaFinanceiro.mutate(
        {
          p_material_id: materialId,
          p_almoxarifado_id: almoxId,
          p_quantidade: entQtyNumber,
          p_preco_unitario: precoUnitario,
          p_conta_id: contaId,
          p_subconta: subconta,
          p_motivo: `Compra: ${selectedMaterial?.nome ?? 'Material'}${obs ? ` — ${obs}` : ''}`,
          p_data: todayISO(),
          p_unidade: unidade || undefined,
          p_observacao: obs.trim() || undefined,
          p_fornecedor_id: fornecedorId || undefined,
          p_forma_pagamento: pagamento,
        },
        { onSuccess, onError },
      )
      return
    }

    createEntrada.mutate(
      {
        p_material_id: materialId,
        p_almoxarifado_id: almoxId,
        p_quantidade: entQtyNumber,
        p_preco_unitario: precoUnitario,
        p_unidade: unidade || undefined,
        p_observacao: obs.trim() || undefined,
        p_fornecedor_id: fornecedorId || undefined,
        p_forma_pagamento: pagamento || undefined,
      },
      { onSuccess, onError },
    )
  }, [
    canSubmit,
    entPrecoNumber,
    selectedMaterial,
    needsFinanceiro,
    createEntradaFinanceiro,
    materialId,
    almoxId,
    entQtyNumber,
    contaId,
    subconta,
    obs,
    unidade,
    fornecedorId,
    pagamento,
    createEntrada,
    reset,
    onClose,
    toast,
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent className={iosTallDialogCn}>
        {/* iOS sticky header */}
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-[16px] text-[#007AFF] min-w-[64px] text-left disabled:opacity-30 transition-opacity"
            >
              Cancelar
            </button>
            <DialogTitle className="text-[16px] font-semibold">Nova Entrada</DialogTitle>
            <DialogDescription className="sr-only">
              Registre uma nova entrada de material no estoque
            </DialogDescription>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30 min-w-[64px] text-right transition-colors"
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 space-y-4 pb-6">
          {/* ── Material ── */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Material <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger className={triggerCn}>
                  <SelectValue placeholder="Selecione o material…" />
                </SelectTrigger>
                <SelectContent>
                  {materiaisList.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                      {m.codigo ? ` · ${m.codigo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
                    {selectedMaterial.categoria?.nome && (
                      <Badge variant="secondary" className="text-[11px]">
                        {selectedMaterial.categoria.nome}
                      </Badge>
                    )}
                    <span className="text-[12px] text-muted-foreground">
                      Unid:{' '}
                      <strong>
                        {selectedMaterial.unidade ?? selectedMaterial.categoria?.unidade ?? '—'}
                      </strong>
                    </span>
                    {(selectedMaterial.preco_unitario ?? 0) > 0 && (
                      <span className="text-[12px] ml-auto text-muted-foreground">
                        Último: <strong>{formatCurrency(selectedMaterial.preco_unitario)}</strong>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Almoxarifado de Destino ── */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Almoxarifado de Destino <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select value={almoxId} onValueChange={setAlmoxId}>
                <SelectTrigger className={triggerCn}>
                  <SelectValue placeholder="Selecione o almoxarifado…" />
                </SelectTrigger>
                <SelectContent>
                  {almoxByObra.map(([obraId, { obraNome, almoxs }]) => (
                    <div key={obraId}>
                      <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {obraNome}
                      </div>
                      {almoxs.map((almox) => (
                        <SelectItem key={almox.id} value={almox.id}>
                          {almox.nome}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Quantidade + Unidade ── */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Quantidade <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden flex items-center">
              <input
                placeholder="0"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^\d,.]/g, ''))}
                className="flex-1 px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
              <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
              <input
                placeholder="UN"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value.toUpperCase())}
                className="w-[72px] px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 text-center"
              />
            </div>
          </div>

          {/* ── Financeiro ── */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Financeiro
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              {/* Preço unitário */}
              <CurrencyInput
                placeholder="Preço unitário (opcional)"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="h-[50px] rounded-none border-0 shadow-none bg-transparent focus-visible:ring-0 text-[15px] px-4"
              />

              {/* Subtotal inline preview */}
              {entradaTotal > 0 && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground">Subtotal</span>
                    <span className="text-[15px] font-semibold tabular-nums">
                      {formatCurrency(entradaTotal)}
                    </span>
                  </div>
                </>
              )}

              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />

              {/* Forma de pagamento */}
              <Select value={pagamento} onValueChange={setPagamento}>
                <SelectTrigger className={triggerCn}>
                  <SelectValue
                    placeholder={
                      needsFinanceiro
                        ? 'Forma de pagamento (obrigatória)'
                        : 'Forma de pagamento (opcional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {ESTOQUE_PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />

              {/* Conta para débito */}
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className={triggerCn}>
                  <SelectValue
                    placeholder={
                      needsFinanceiro
                        ? 'Conta para débito (obrigatória)'
                        : 'Conta para débito (opcional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contasList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Subconta toggle + balance + debit preview */}
              {selectedConta && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSubconta('CAIXA')}
                        className={cn(
                          'flex-1 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                          subconta === 'CAIXA'
                            ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF] font-medium'
                            : 'border-border/40 text-muted-foreground',
                        )}
                      >
                        Caixa
                        <span className="block text-[11px] mt-0.5 font-normal opacity-70">
                          {formatCurrency(Number(selectedConta.valor_caixa))}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubconta('APLICADO')}
                        className={cn(
                          'flex-1 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                          subconta === 'APLICADO'
                            ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF] font-medium'
                            : 'border-border/40 text-muted-foreground',
                        )}
                      >
                        Aplicado
                        <span className="block text-[11px] mt-0.5 font-normal opacity-70">
                          {formatCurrency(Number(selectedConta.valor_aplicado))}
                        </span>
                      </button>
                    </div>
                    {needsFinanceiro && (
                      <div className="flex items-center justify-between text-[12px] border-t border-border/10 dark:border-white/[0.06] mt-1 pt-2.5">
                        <span className="text-muted-foreground">Débito previsto</span>
                        <span className="font-semibold text-[#FF3B30]">
                          −{formatCurrency(entradaTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Fornecedor */}
              {fornecedoresList.length > 0 && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <Select value={fornecedorId} onValueChange={setFornecedorId}>
                    <SelectTrigger className={triggerCn}>
                      <SelectValue placeholder="Fornecedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedoresList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia || f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          {/* ── Observação ── */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Observação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                placeholder="Nota fiscal, lote, etc. (opcional)"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>
        </div>

        <KeyboardToolbar
          onNext={focusNext}
          onPrev={focusPrev}
          onDone={dismiss}
          hasPrev={canGoPrev}
          hasNext={canGoNext}
        />
      </DialogContent>
    </Dialog>
  )
}
