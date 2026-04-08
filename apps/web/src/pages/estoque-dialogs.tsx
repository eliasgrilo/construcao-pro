import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useIsKeyboardOpen } from '@/hooks/use-keyboard-open'
import { useCreateMovimentacaoSaida } from '@/hooks/use-supabase'
import { cn, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Minus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { BaixaTarget, DeleteTarget } from './estoque-dialog-types'
export { NovaEntradaDialog } from './estoque-nova-entrada-dialog'
export { TransferDialog } from './estoque-transfer-dialog'
export type {
  AlmoxByObraGroup,
  AlmoxSelectItem,
  BaixaTarget,
  DeleteTarget,
  TransferTarget,
} from './estoque-dialog-types'

// ═══════ DAR BAIXA DIALOG ═══════
export function BaixaDialog({
  target,
  onClose,
}: { target: BaixaTarget | null; onClose: () => void }) {
  const { toast } = useToast()
  const isKeyboardOpen = useIsKeyboardOpen()
  const createSaida = useCreateMovimentacaoSaida()

  const [baixaQty, setBaixaQty] = useState('')
  const [baixaObs, setBaixaObs] = useState('')

  const resetBaixaForm = () => {
    setBaixaQty('')
    setBaixaObs('')
  }

  const handleClose = () => {
    if (createSaida.isPending) return
    resetBaixaForm()
    onClose()
  }

  const handleDarBaixa = () => {
    if (!target || createSaida.isPending) return
    const baixaQtyNum = Number.parseFloat(baixaQty.replace(',', '.').replace(/[^0-9.]/g, ''))
    if (Number.isNaN(baixaQtyNum) || baixaQtyNum <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe valor positivo.',
        variant: 'error',
      })
      return
    }
    createSaida.mutate(
      {
        p_material_id: target.materialId,
        p_quantidade: baixaQtyNum,
        p_preco_unitario: target.precoUnitario,
        p_almoxarifado_id: target.almoxarifadoId,
        p_observacao: baixaObs.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Baixa registrada',
            description: `${baixaQty} ${target.unidade} de ${target.materialNome} retirados`,
            variant: 'success',
          })
          resetBaixaForm()
          onClose()
        },
        onError: () =>
          toast({
            title: 'Erro ao registrar baixa',
            description: 'Verifique a quantidade.',
            variant: 'error',
          }),
      },
    )
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-md">
        <DialogTitle className="sr-only">Dar Baixa</DialogTitle>
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <span className="text-[17px] sm:text-[15px] font-semibold">Dar Baixa</span>
          <motion.button
            type="button"
            disabled={createSaida.isPending}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 space-y-5 py-6">
          <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-orange-500/10">
              <Minus className="h-5 w-5 text-orange-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] sm:text-[13px] font-semibold truncate">
                {target?.materialNome}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {target?.almoxarifadoNome} · {target?.obraNome}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[18px] font-bold tabular-nums text-foreground">
                {formatNumber(target?.quantidadeDisponivel ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">{target?.unidade} disponível</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Quantidade a retirar</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={baixaQty}
              onChange={(e) => {
                const v = e.target.value
                if (/^[\d.,]*$/.test(v)) setBaixaQty(v)
              }}
              placeholder="0"
              className={cn(
                Number.parseFloat(baixaQty.replace(',', '.')) >
                  (target?.quantidadeDisponivel ?? 0) && 'border-destructive',
              )}
            />
            {Number.parseFloat(baixaQty.replace(',', '.')) >
              (target?.quantidadeDisponivel ?? 0) && (
              <p className="text-[12px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Excede o disponível
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>
              Motivo / Observação{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              value={baixaObs}
              onChange={(e) => setBaixaObs(e.target.value)}
              placeholder="Ex: Uso em obra..."
            />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {!isKeyboardOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="shrink-0 overflow-hidden"
              variants={{
                visible: { height: 'auto', opacity: 1 },
                hidden: { height: 0, opacity: 0 },
              }}
            >
              <div className="flex flex-col gap-3 px-5 pt-4 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/50 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleDarBaixa}
                  disabled={
                    !baixaQty ||
                    Number.parseFloat(baixaQty.replace(',', '.')) <= 0 ||
                    Number.isNaN(Number.parseFloat(baixaQty.replace(',', '.'))) ||
                    Number.parseFloat(baixaQty.replace(',', '.')) >
                      (target?.quantidadeDisponivel ?? 0)
                  }
                  loading={createSaida.isPending}
                  className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Minus className="h-4 w-4 mr-1.5" />
                  Confirmar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// ═══════ ZERAR ESTOQUE DIALOG ═══════
export function DeleteEstoqueDialog({
  target,
  onClose,
}: { target: DeleteTarget | null; onClose: () => void }) {
  const { toast } = useToast()
  const createSaida = useCreateMovimentacaoSaida()

  const handleDelete = () => {
    if (!target) return
    createSaida.mutate(
      {
        p_material_id: target.materialId,
        p_quantidade: target.quantidade,
        p_preco_unitario: target.precoUnitario,
        p_almoxarifado_id: target.almoxarifadoId,
        p_observacao: 'Estoque zerado manualmente',
      },
      {
        onSuccess: () => {
          toast({ title: 'Estoque zerado', variant: 'success' })
          onClose()
        },
        onError: () => toast({ title: 'Erro', variant: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Zerar Estoque</DialogTitle>
          <DialogDescription>
            Será registrada saída de{' '}
            <strong>
              {formatNumber(target?.quantidade ?? 0)} {target?.unidade}
            </strong>{' '}
            de <strong>{target?.materialNome}</strong>. Ação irreversível.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            loading={createSaida.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Zerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
