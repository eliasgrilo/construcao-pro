import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { CurrencyInput, formatBRL, parseCurrency } from '@/components/ui/currency-input'
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
  useAlmoxarifados,
  useCreateEntradaEstoqueFinanceiro,
  useCreateMovimentacaoEntrada,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { iosMediumDialogCn } from './dialog-styles'

const modalCn = iosMediumDialogCn

const triggerCn =
  'border-0 bg-transparent shadow-none h-[50px] px-4 rounded-none focus-visible:ring-0 text-[15px] sm:h-[50px] sm:px-4 sm:text-[15px] sm:rounded-none'

interface ObraDetailEntradaDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  obraId: string
  preAlmoxId?: string
}

export function ObraDetailEntradaDialog({
  open,
  onOpenChange,
  obraId,
  preAlmoxId,
}: ObraDetailEntradaDialogProps) {
  const { toast } = useToast()
  const createEntrada = useCreateMovimentacaoEntrada()
  const createEntradaFinanceiro = useCreateEntradaEstoqueFinanceiro()
  const { data: materiais = [] } = useMateriais()
  const { data: allAlmox = [] } = useAlmoxarifados()
  const { data: fornecedores = [] } = useFornecedores()
  const { data: contasFinanceiras = [] } = useFinanceiroContas()

  const almoxarifados = allAlmox.filter((a) => a.obra_id === obraId)

  const [materialId, setMaterialId] = useState('')
  const [almoxId, setAlmoxId] = useState(preAlmoxId ?? '')
  const [qty, setQty] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [contaId, setContaId] = useState('')
  const [subconta, setSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
  const [pagamento, setPagamento] = useState('')
  const [obs, setObs] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const autofilledMaterialIdRef = useRef<string | null>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)
  const isSubmitting = createEntrada.isPending || createEntradaFinanceiro.isPending

  useEffect(() => {
    if (open) {
      autofilledMaterialIdRef.current = null
      setAlmoxId(preAlmoxId ?? '')
      setMaterialId('')
      setQty('')
      setPreco('')
      setUnidade('')
      setFornecedorId('')
      setContaId('')
      setSubconta('CAIXA')
      setPagamento('')
      setObs('')
    }
  }, [open, preAlmoxId])

  const selectedMat = materiais.find((m) => m.id === materialId)

  useEffect(() => {
    if (!selectedMat) {
      autofilledMaterialIdRef.current = null
      return
    }

    if (autofilledMaterialIdRef.current === selectedMat.id) return

    const raw = selectedMat.preco_unitario ?? 0
    autofilledMaterialIdRef.current = selectedMat.id
    setPreco(raw > 0 ? formatBRL(String(raw).replace('.', ',')) : '')
    setUnidade(selectedMat.unidade ?? selectedMat.categoria?.unidade ?? 'UN')
  }, [selectedMat])

  const qtyNumber = Number(qty.replace(',', '.'))
  const precoNumber = parseCurrency(preco) || (selectedMat?.preco_unitario ?? 0)
  const entradaTotal = qtyNumber > 0 ? qtyNumber * precoNumber : 0
  const needsFinanceiro = entradaTotal > 0
  const selectedConta = contasFinanceiras.find((conta) => conta.id === contaId)

  const canSubmit =
    !!materialId &&
    !!almoxId &&
    !!qty &&
    qtyNumber > 0 &&
    !!unidade &&
    (!needsFinanceiro || (!!contaId && !!pagamento)) &&
    !isSubmitting

  function reset() {
    autofilledMaterialIdRef.current = null
    setMaterialId('')
    setAlmoxId(preAlmoxId ?? '')
    setQty('')
    setPreco('')
    setUnidade('')
    setFornecedorId('')
    setContaId('')
    setSubconta('CAIXA')
    setPagamento('')
    setObs('')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    try {
      if (needsFinanceiro) {
        if (!contaId || !pagamento) {
          toast({
            title: 'Dados financeiros pendentes',
            description: 'Selecione a conta e a forma de pagamento para atualizar o saldo.',
            variant: 'error',
          })
          return
        }

        await createEntradaFinanceiro.mutateAsync({
          p_material_id: materialId,
          p_quantidade: qtyNumber,
          p_preco_unitario: precoNumber,
          p_almoxarifado_id: almoxId,
          p_conta_id: contaId,
          p_subconta: subconta,
          p_motivo: `Compra: ${selectedMat?.nome ?? 'Material'}${obs ? ` — ${obs}` : ''}`,
          p_fornecedor_id: fornecedorId || undefined,
          p_observacao: obs.trim() || undefined,
          p_unidade: unidade || undefined,
          p_forma_pagamento: pagamento,
        })
      } else {
        await createEntrada.mutateAsync({
          p_material_id: materialId,
          p_quantidade: qtyNumber,
          p_preco_unitario: precoNumber,
          p_almoxarifado_id: almoxId,
          p_unidade: unidade || undefined,
          p_fornecedor_id: fornecedorId || undefined,
          p_observacao: obs.trim() || undefined,
          p_forma_pagamento: pagamento || undefined,
        })
      }

      toast({ title: 'Entrada registrada com sucesso!', variant: 'success' })
      reset()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar entrada',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSubmitting) return
        if (!o) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className={modalCn}>
        {/* Sticky header */}
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
          {/* Material */}
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
                  {materiais.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                      {m.codigo ? ` · ${m.codigo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Destino */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Local de Destino <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select value={almoxId} onValueChange={setAlmoxId}>
                <SelectTrigger className={triggerCn}>
                  <SelectValue placeholder="Selecione o almoxarifado…" />
                </SelectTrigger>
                <SelectContent>
                  {almoxarifados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantidade + Unidade */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                className="flex-1 px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
              <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
              <input
                placeholder="UN"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-[72px] px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 text-center"
              />
            </div>
          </div>

          {/* Financeiro: Preço + Fornecedor */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Financeiro
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <CurrencyInput
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="h-[50px] rounded-none border-0 shadow-none bg-transparent focus-visible:ring-0 text-[15px] px-4"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
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
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                  <SelectItem value="credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
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
                  {contasFinanceiras.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedConta && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>Saldo atual</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          subconta === 'CAIXA'
                            ? Number(selectedConta.valor_caixa)
                            : Number(selectedConta.valor_aplicado),
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSubconta('CAIXA')}
                        className={cn(
                          'flex-1 rounded-xl border p-2 text-left text-[13px]',
                          subconta === 'CAIXA' && 'border-[#007AFF] bg-[#007AFF]/10',
                        )}
                      >
                        Caixa
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubconta('APLICADO')}
                        className={cn(
                          'flex-1 rounded-xl border p-2 text-left text-[13px]',
                          subconta === 'APLICADO' && 'border-[#007AFF] bg-[#007AFF]/10',
                        )}
                      >
                        Aplicado
                      </button>
                    </div>
                  </div>
                </>
              )}
              {fornecedores.length > 0 && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <Select value={fornecedorId} onValueChange={setFornecedorId}>
                    <SelectTrigger className={triggerCn}>
                      <SelectValue placeholder="Fornecedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia || f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            {needsFinanceiro && (
              <p className="px-4 pt-2 text-[12px] text-muted-foreground">
                Total da entrada: {formatCurrency(entradaTotal)}. O saldo da conta selecionada sera
                atualizado junto com o estoque.
              </p>
            )}
          </div>

          {/* Observação */}
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
