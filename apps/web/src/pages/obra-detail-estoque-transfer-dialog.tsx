import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AlmoxarifadoRow } from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { formatNumber } from '@/lib/utils'
import { useRef } from 'react'
import { iosMediumDialogCn } from './dialog-styles'
import type { TransferDialogField, TransferDialogState } from './obra-detail-estoque-utils'
import type { EstoqueItem } from './obra-detail-types'

const triggerCn =
  'border-0 bg-transparent shadow-none h-[50px] px-4 rounded-none focus-visible:ring-0 text-[15px] sm:h-[50px] sm:px-4 sm:text-[15px] sm:rounded-none'

interface ObraDetailEstoqueTransferDialogProps {
  open: boolean
  pending: boolean
  obraId: string
  almoxarifados: AlmoxarifadoRow[]
  allAlmoxarifados: AlmoxarifadoRow[]
  estoqueItems: EstoqueItem[]
  availableQuantity: number
  state: TransferDialogState
  onOpenChange: (open: boolean) => void
  onFieldChange: (field: TransferDialogField, value: string) => void
  onSubmit: () => void
}

export function ObraDetailEstoqueTransferDialog({
  open,
  pending,
  obraId,
  almoxarifados,
  allAlmoxarifados,
  estoqueItems,
  availableQuantity,
  state,
  onOpenChange,
  onFieldChange,
  onSubmit,
}: ObraDetailEstoqueTransferDialogProps) {
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const destinos = allAlmoxarifados.filter(
    (a) => a.id !== state.almoxId && a.obra_id === obraId,
  )

  const qtyNumber = Number(state.qty.replace(',', '.'))
  const canSubmit =
    !!state.materialId &&
    !!state.almoxId &&
    !!state.almoxDestinoId &&
    qtyNumber > 0 &&
    qtyNumber <= availableQuantity &&
    !pending

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
      <DialogContent className={iosMediumDialogCn}>
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
            <DialogTitle className="text-[16px] font-semibold">Transferir</DialogTitle>
            <DialogDescription className="sr-only">
              Mova materiais entre almoxarifados
            </DialogDescription>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30 min-w-[64px] text-right transition-colors"
            >
              {pending ? 'Movendo…' : 'Confirmar'}
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 space-y-4 pb-6">
          {/* Origem */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Origem <span className="text-[#FF3B30]">*</span>
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

          {/* Material */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Material <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select
                value={state.materialId}
                onValueChange={(v) => onFieldChange('materialId', v)}
                disabled={!state.almoxId}
              >
                <SelectTrigger className={triggerCn}>
                  <SelectValue
                    placeholder={
                      state.almoxId
                        ? 'Selecione o material…'
                        : 'Selecione a origem primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {estoqueItems.map((item) => (
                    <SelectItem key={item.material.id} value={item.material.id}>
                      {item.material.nome}{' '}
                      <span className="text-muted-foreground">
                        ({formatNumber(item.quantidade)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.materialId && state.almoxId && (
              <div className="mt-2 rounded-[14px] bg-[#007AFF]/8 dark:bg-[#007AFF]/12 px-4 py-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#007AFF]">
                  Disponível
                </span>
                <span className="text-[15px] font-bold text-[#007AFF] tabular-nums">
                  {formatNumber(availableQuantity)}
                </span>
              </div>
            )}
          </div>

          {/* Destino */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Destino <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <Select
                value={state.almoxDestinoId}
                onValueChange={(v) => onFieldChange('almoxDestinoId', v)}
              >
                <SelectTrigger className={triggerCn}>
                  <SelectValue placeholder="Selecione o destino…" />
                </SelectTrigger>
                <SelectContent>
                  {destinos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Quantidade a mover <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                placeholder="0"
                inputMode="decimal"
                value={state.qty}
                onChange={(e) =>
                  onFieldChange('qty', e.target.value.replace(/[^\d,.]/g, ''))
                }
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
            {qtyNumber > availableQuantity && availableQuantity > 0 && (
              <p className="px-4 pt-1.5 text-[12px] text-[#FF3B30]">
                Máximo disponível: {formatNumber(availableQuantity)}
              </p>
            )}
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
