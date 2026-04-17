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
import type { FornecedorRow } from '@/hooks/use-supabase'
import {
  useAlmoxarifados,
  useCreateEntradaEstoqueFinanceiro,
  useCreateMovimentacaoEntrada,
  useCreateObraLancamentoMaoDeObra,
  useFinanceiroContas,
  useFornecedores,
  useMateriais,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { iosMediumDialogCn } from './dialog-styles'

const triggerCn =
  'border-0 bg-transparent shadow-none h-[50px] px-4 rounded-none focus-visible:ring-0 text-[15px] sm:h-[50px] sm:px-4 sm:text-[15px] sm:rounded-none'

const sectionLabelCn =
  'text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5'

const cardCn = 'rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden'

const dividerCn = 'h-px bg-border/10 dark:bg-white/[0.06] ml-4'

const plainInputCn =
  'w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25'

type Mode = 'material' | 'mao-de-obra'

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── iOS-style segmented control ────────────────────────────────────────────────
function SegmentedControl({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) {
  return (
    <div className="flex bg-black/[0.06] dark:bg-white/[0.08] rounded-[10px] p-0.5">
      {(['material', 'mao-de-obra'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150',
            value === m
              ? 'bg-white dark:bg-white/[0.15] text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          {m === 'material' ? 'Material' : 'Mão de Obra'}
        </button>
      ))}
    </div>
  )
}

// ── Shared subconta selector (appears when a conta is chosen) ──────────────────
interface SubcontaProps {
  conta: { valor_caixa: number | string; valor_aplicado: number | string } | undefined
  value: 'CAIXA' | 'APLICADO'
  onChange: (v: 'CAIXA' | 'APLICADO') => void
}

function SubcontaToggle({ conta, value, onChange }: SubcontaProps) {
  if (!conta) return null
  const saldo = value === 'CAIXA' ? Number(conta.valor_caixa) : Number(conta.valor_aplicado)
  return (
    <>
      <div className={dividerCn} />
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Saldo atual</span>
          <span className="font-medium text-foreground">{formatCurrency(saldo)}</span>
        </div>
        <div className="flex gap-2">
          {(['CAIXA', 'APLICADO'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'flex-1 rounded-xl border p-2 text-left text-[13px] transition-colors',
                value === opt
                  ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                  : 'border-border/40 text-muted-foreground',
              )}
            >
              {opt === 'CAIXA' ? 'Caixa' : 'Aplicado'}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const createMaoDeObra = useCreateObraLancamentoMaoDeObra()
  const { data: materiais = [] } = useMateriais()
  const { data: allAlmox = [] } = useAlmoxarifados()
  const { data: fornecedoresData } = useFornecedores()
  const fornecedores: FornecedorRow[] = fornecedoresData ?? []
  const { data: contasFinanceiras = [] } = useFinanceiroContas()
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const almoxarifados = allAlmox.filter((a) => a.obra_id === obraId)

  // ── Mode ──────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('material')

  // ── Material state ────────────────────────────────────
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
  const autofilledRef = useRef<string | null>(null)

  // ── Mão de Obra state ─────────────────────────────────
  const [mdoDescricao, setMdoDescricao] = useState('')
  const [mdoValor, setMdoValor] = useState('')
  const [mdoData, setMdoData] = useState(getTodayStr)
  const [mdoPrestador, setMdoPrestador] = useState('')
  const [mdoPagamento, setMdoPagamento] = useState('')
  const [mdoContaId, setMdoContaId] = useState('')
  const [mdoSubconta, setMdoSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')
  const [mdoObs, setMdoObs] = useState('')

  const isSubmitting =
    createEntrada.isPending || createEntradaFinanceiro.isPending || createMaoDeObra.isPending

  // ── Reset on open ─────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setMode('material')
    autofilledRef.current = null
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
    setMdoDescricao('')
    setMdoValor('')
    setMdoData(getTodayStr())
    setMdoPrestador('')
    setMdoPagamento('')
    setMdoContaId('')
    setMdoSubconta('CAIXA')
    setMdoObs('')
  }, [open, preAlmoxId])

  // ── Material: autofill price from catalog ─────────────
  const selectedMat = materiais.find((m) => m.id === materialId)
  useEffect(() => {
    if (!selectedMat) {
      autofilledRef.current = null
      return
    }
    if (autofilledRef.current === selectedMat.id) return
    const raw = selectedMat.preco_unitario ?? 0
    autofilledRef.current = selectedMat.id
    setPreco(raw > 0 ? formatBRL(String(raw).replace('.', ',')) : '')
    setUnidade(selectedMat.unidade ?? selectedMat.categoria?.unidade ?? 'UN')
  }, [selectedMat])

  // ── Derived: Material ─────────────────────────────────
  const qtyNumber = Number(qty.replace(',', '.'))
  const precoNumber = parseCurrency(preco) || (selectedMat?.preco_unitario ?? 0)
  const entradaTotal = qtyNumber > 0 ? qtyNumber * precoNumber : 0
  const needsFinanceiro = entradaTotal > 0
  const selectedConta = contasFinanceiras.find((c) => c.id === contaId)

  const canSubmitMaterial =
    !!materialId &&
    !!almoxId &&
    !!qty &&
    qtyNumber > 0 &&
    !!unidade &&
    (!needsFinanceiro || (!!contaId && !!pagamento)) &&
    !isSubmitting

  // ── Derived: Mão de Obra ──────────────────────────────
  const mdoValorNumber = parseCurrency(mdoValor) || 0
  const mdoSelectedConta = contasFinanceiras.find((c) => c.id === mdoContaId)
  const canSubmitMdo =
    !!mdoDescricao.trim() && mdoValorNumber > 0 && (!mdoContaId || !!mdoPagamento) && !isSubmitting

  const canSubmit = mode === 'material' ? canSubmitMaterial : canSubmitMdo

  // ── Helpers ───────────────────────────────────────────
  function resetMaterial() {
    autofilledRef.current = null
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

  function resetMdo() {
    setMdoDescricao('')
    setMdoValor('')
    setMdoData(getTodayStr())
    setMdoPrestador('')
    setMdoPagamento('')
    setMdoContaId('')
    setMdoSubconta('CAIXA')
    setMdoObs('')
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetMaterial()
    resetMdo()
    onOpenChange(false)
  }

  // ── Submit ────────────────────────────────────────────
  async function handleSubmit() {
    if (!canSubmit) return
    try {
      if (mode === 'material') {
        if (needsFinanceiro) {
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
        toast({ title: 'Entrada registrada!', variant: 'success' })
        resetMaterial()
      } else {
        await createMaoDeObra.mutateAsync({
          obra_id: obraId,
          almoxarifado_id: preAlmoxId ?? null,
          descricao: mdoDescricao.trim(),
          valor: mdoValorNumber,
          data: mdoData,
          forma_pagamento: mdoPagamento || null,
          conta_id: mdoContaId || null,
          prestador: mdoPrestador.trim() || null,
          observacao: mdoObs.trim() || null,
        })
        toast({ title: 'Mão de obra registrada!', variant: 'success' })
        resetMdo()
      }
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: mode === 'material' ? 'Erro ao registrar entrada' : 'Erro ao registrar mão de obra',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSubmitting) return
        if (!o) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className={iosMediumDialogCn}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3 space-y-4">
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
              Registre material ou mão de obra na obra
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
          <SegmentedControl value={mode} onChange={setMode} />
        </div>

        {/* Scrollable form */}
        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 space-y-4 pb-6">
          {mode === 'material' ? (
            <>
              {/* Material */}
              <div>
                <p className={sectionLabelCn}>
                  Material <span className="text-[#FF3B30]">*</span>
                </p>
                <div className={cardCn}>
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
                <p className={sectionLabelCn}>
                  Local de Destino <span className="text-[#FF3B30]">*</span>
                </p>
                <div className={cardCn}>
                  {preAlmoxId ? (
                    <div className="h-[50px] px-4 flex items-center">
                      <span className="text-[15px]">
                        {almoxarifados.find((a) => a.id === preAlmoxId)?.nome ??
                          'Local selecionado'}
                      </span>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Quantidade + Unidade */}
              <div>
                <p className={sectionLabelCn}>
                  Quantidade <span className="text-[#FF3B30]">*</span>
                </p>
                <div className={cn(cardCn, 'flex items-center')}>
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

              {/* Financeiro */}
              <div>
                <p className={sectionLabelCn}>Financeiro</p>
                <div className={cardCn}>
                  <CurrencyInput
                    placeholder="Preço unitário (opcional)"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="h-[50px] rounded-none border-0 shadow-none bg-transparent focus-visible:ring-0 text-[15px] px-4"
                  />
                  <div className={dividerCn} />
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
                  <div className={dividerCn} />
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
                      {contasFinanceiras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SubcontaToggle conta={selectedConta} value={subconta} onChange={setSubconta} />
                  {fornecedores.length > 0 && (
                    <>
                      <div className={dividerCn} />
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
                    Total: {formatCurrency(entradaTotal)} — saldo da conta será atualizado com o
                    estoque.
                  </p>
                )}
              </div>

              {/* Observação */}
              <div>
                <p className={sectionLabelCn}>Observação</p>
                <div className={cardCn}>
                  <input
                    placeholder="Nota fiscal, lote, etc. (opcional)"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    className={plainInputCn}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Serviço / Descrição */}
              <div>
                <p className={sectionLabelCn}>
                  Serviço / Descrição <span className="text-[#FF3B30]">*</span>
                </p>
                <div className={cardCn}>
                  <input
                    placeholder="Ex: Assentamento de cerâmica, instalação elétrica…"
                    value={mdoDescricao}
                    onChange={(e) => setMdoDescricao(e.target.value)}
                    className={plainInputCn}
                  />
                </div>
              </div>

              {/* Valor + Data */}
              <div>
                <p className={sectionLabelCn}>
                  Valor e Data <span className="text-[#FF3B30]">*</span>
                </p>
                <div className={cn(cardCn, 'flex items-center')}>
                  <CurrencyInput
                    placeholder="0,00"
                    value={mdoValor}
                    onChange={(e) => setMdoValor(e.target.value)}
                    className="flex-1 h-[50px] rounded-none border-0 shadow-none bg-transparent focus-visible:ring-0 text-[15px] px-4"
                  />
                  <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
                  <input
                    type="date"
                    value={mdoData}
                    onChange={(e) => setMdoData(e.target.value)}
                    className="w-[148px] px-4 py-3.5 bg-transparent text-[14px] border-0 focus:outline-none text-center"
                  />
                </div>
              </div>

              {/* Prestador */}
              <div>
                <p className={sectionLabelCn}>Prestador</p>
                <div className={cardCn}>
                  <input
                    placeholder="Nome do prestador (opcional)"
                    value={mdoPrestador}
                    onChange={(e) => setMdoPrestador(e.target.value)}
                    className={plainInputCn}
                  />
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <p className={sectionLabelCn}>Pagamento</p>
                <div className={cardCn}>
                  <Select value={mdoPagamento} onValueChange={setMdoPagamento}>
                    <SelectTrigger className={triggerCn}>
                      <SelectValue
                        placeholder={
                          mdoContaId
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
                  <div className={dividerCn} />
                  <Select value={mdoContaId} onValueChange={setMdoContaId}>
                    <SelectTrigger className={triggerCn}>
                      <SelectValue placeholder="Débitar conta (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasFinanceiras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SubcontaToggle
                    conta={mdoSelectedConta}
                    value={mdoSubconta}
                    onChange={setMdoSubconta}
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <p className={sectionLabelCn}>Observação</p>
                <div className={cardCn}>
                  <input
                    placeholder="Recibo, contrato, etapa (opcional)"
                    value={mdoObs}
                    onChange={(e) => setMdoObs(e.target.value)}
                    className={plainInputCn}
                  />
                </div>
              </div>
            </>
          )}
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
