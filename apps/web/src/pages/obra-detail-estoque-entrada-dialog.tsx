import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  AlmoxarifadoRow,
  FinanceiroConta,
  FornecedorRow,
  MaterialRow,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatCurrency } from '@/lib/utils'
import { useRef } from 'react'
import { iosTallDialogCn } from './dialog-styles'
import {
  ESTOQUE_PAYMENT_OPTIONS,
  type EntradaDialogField,
  type EntradaDialogState,
} from './obra-detail-estoque-utils'

const triggerCn =
  'border-0 bg-transparent shadow-none h-[50px] px-4 rounded-none focus-visible:ring-0 text-[15px] sm:h-[50px] sm:px-4 sm:text-[15px] sm:rounded-none'

interface ObraDetailEstoqueEntradaDialogProps {
  open: boolean
  pending: boolean
  state: EntradaDialogState
  materiais: MaterialRow[]
  almoxarifados: AlmoxarifadoRow[]
  contasFinanceiras: FinanceiroConta[]
  fornecedores: FornecedorRow[]
  selectedMaterial?: MaterialRow
  selectedConta?: FinanceiroConta
  entradaTotal: number
  needsFinanceiro: boolean
  canSubmit: boolean
  onOpenChange: (open: boolean) => void
  onFieldChange: (field: EntradaDialogField, value: string) => void
  onSubmit: () => void
}

export function ObraDetailEstoqueEntradaDialog({
  open,
  pending,
  state,
  materiais,
  almoxarifados,
  contasFinanceiras,
  fornecedores,
  selectedConta,
  entradaTotal,
  needsFinanceiro,
  canSubmit,
  onOpenChange,
  onFieldChange,
  onSubmit,
}: ObraDetailEstoqueEntradaDialogProps) {
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const handleClose = () => {
    if (!pending) onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        if (!o) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className={iosTallDialogCn}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
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
              onClick={onSubmit}
              disabled={!canSubmit}
              className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30 min-w-[64px] text-right transition-colors"
            >
              {pending ? 'Salvando…' : 'Salvar'}
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
              <Select
                value={state.materialId}
                onValueChange={(v) => onFieldChange('materialId', v)}
              >
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

          {/* Local de Destino */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Local de Destino <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select value={state.almoxId} onValueChange={(v) => onFieldChange('almoxId', v)}>
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
                value={state.qty}
                onChange={(e) =>
                  onFieldChange('qty', e.target.value.replace(/[^\d,.]/g, ''))
                }
                className="flex-1 px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
              <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
              <input
                placeholder="UN"
                value={state.unidade}
                onChange={(e) => onFieldChange('unidade', e.target.value)}
                className="w-[72px] px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 text-center"
              />
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Financeiro
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <CurrencyInput
                placeholder="Preço unitário (opcional)"
                value={state.preco}
                onChange={(e) => onFieldChange('preco', e.target.value)}
                className="h-[50px] rounded-none border-0 shadow-none bg-transparent focus-visible:ring-0 text-[15px] px-4"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <Select
                value={state.pagamento}
                onValueChange={(v) => onFieldChange('pagamento', v)}
              >
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
              <Select value={state.contaId} onValueChange={(v) => onFieldChange('contaId', v)}>
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
              {selectedConta && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>Saldo atual</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          state.subconta === 'CAIXA'
                            ? Number(selectedConta.valor_caixa)
                            : Number(selectedConta.valor_aplicado),
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onFieldChange('subconta', 'CAIXA')}
                        className={cn(
                          'flex-1 rounded-xl border p-2 text-left text-[13px] transition-colors',
                          state.subconta === 'CAIXA'
                            ? 'border-[#007AFF] bg-[#007AFF]/10'
                            : 'border-border/40',
                        )}
                      >
                        Caixa
                      </button>
                      <button
                        type="button"
                        onClick={() => onFieldChange('subconta', 'APLICADO')}
                        className={cn(
                          'flex-1 rounded-xl border p-2 text-left text-[13px] transition-colors',
                          state.subconta === 'APLICADO'
                            ? 'border-[#007AFF] bg-[#007AFF]/10'
                            : 'border-border/40',
                        )}
                      >
                        Aplicado
                      </button>
                    </div>
                    {needsFinanceiro && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">Débito previsto</span>
                        <span className="font-semibold text-[#FF3B30]">
                          {formatCurrency(entradaTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
              {fornecedores.length > 0 && (
                <>
                  <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
                  <Select
                    value={state.fornecedorId}
                    onValueChange={(v) => onFieldChange('fornecedorId', v)}
                  >
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
          </div>

          {/* Observação */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Observação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                placeholder="Nota fiscal, lote, etc. (opcional)"
                value={state.obs}
                onChange={(e) => onFieldChange('obs', e.target.value)}
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
