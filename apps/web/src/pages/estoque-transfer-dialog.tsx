import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useIsKeyboardOpen } from '@/hooks/use-keyboard-open'
import { useCreateMovimentacaoTransferencia } from '@/hooks/use-supabase'
import { cn, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, X } from 'lucide-react'
import { useState } from 'react'
import type { AlmoxSelectItem, TransferTarget } from './estoque-dialog-types'

type TransferDialogProps = {
  target: TransferTarget | null
  onClose: () => void
  almoxList: AlmoxSelectItem[]
}

export function TransferDialog({ target, onClose, almoxList }: TransferDialogProps) {
  const { toast } = useToast()
  const isKeyboardOpen = useIsKeyboardOpen()
  const createTransferencia = useCreateMovimentacaoTransferencia()

  const [transfDestinoId, setTransfDestinoId] = useState('')
  const [transfQty, setTransfQty] = useState('')
  const [transfObs, setTransfObs] = useState('')

  const resetTransferForm = () => {
    setTransfQty('')
    setTransfDestinoId('')
    setTransfObs('')
  }

  const handleClose = () => {
    if (createTransferencia.isPending) return
    resetTransferForm()
    onClose()
  }

  const handleTransfer = () => {
    if (!target || !transfDestinoId) return
    const transfQtyNum = Number.parseFloat(transfQty.replace(',', '.').replace(/[^0-9.]/g, ''))
    if (Number.isNaN(transfQtyNum) || transfQtyNum <= 0) {
      toast({ title: 'Inválido', description: 'Informe valor numérico', variant: 'error' })
      return
    }
    createTransferencia.mutate(
      {
        p_material_id: target.materialId,
        p_quantidade: transfQtyNum,
        p_almoxarifado_id: target.almoxarifadoId,
        p_almoxarifado_destino_id: transfDestinoId,
        p_observacao: transfObs.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Transferência realizada',
            description: `${transfQty} ${target.unidade} transferidos.`,
            variant: 'success',
          })
          resetTransferForm()
          onClose()
        },
        onError: () => toast({ title: 'Erro ao transferir', variant: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-md">
        <DialogTitle className="sr-only">Transferir</DialogTitle>
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <span className="text-[17px] sm:text-[15px] font-semibold">Transferir Material</span>
          <motion.button
            type="button"
            disabled={createTransferencia.isPending}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 space-y-5 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-primary/10">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] sm:text-[13px] font-semibold truncate">
                  {target?.materialNome}
                </p>
                <p className="text-[12px] text-muted-foreground">De: {target?.almoxarifadoNome}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[18px] font-bold tabular-nums text-foreground">
                  {formatNumber(target?.quantidadeDisponivel ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">{target?.unidade} disp.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={transfDestinoId} onValueChange={setTransfDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {almoxList
                    .filter((item) => item.id !== target?.almoxarifadoId)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} {item.obra?.nome ? ` — ${item.obra.nome}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade a transferir</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={transfQty}
                onChange={(event) => {
                  const value = event.target.value
                  if (/^[\d.,]*$/.test(value)) setTransfQty(value)
                }}
                placeholder="0"
                className={cn(
                  Number.parseFloat(transfQty.replace(',', '.')) >
                    (target?.quantidadeDisponivel ?? 0) && 'border-destructive',
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Observação <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                value={transfObs}
                onChange={(event) => setTransfObs(event.target.value)}
                placeholder="Opcional..."
              />
            </div>
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
                  onClick={handleTransfer}
                  disabled={
                    !transfDestinoId ||
                    !transfQty ||
                    Number.parseFloat(transfQty.replace(',', '.')) <= 0 ||
                    Number.isNaN(Number.parseFloat(transfQty.replace(',', '.'))) ||
                    Number.parseFloat(transfQty.replace(',', '.')) >
                      (target?.quantidadeDisponivel ?? 0)
                  }
                  loading={createTransferencia.isPending}
                  className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  Transferir
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
