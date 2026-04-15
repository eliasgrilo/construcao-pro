import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatNumber } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { iosSheetDialogCn } from './dialog-styles'
import type { DeleteEstoqueTarget } from './obra-detail-types'

export function ObraDetailEstoqueDeleteDialog({
  target,
  setTarget,
  isPending,
  onConfirm,
}: {
  target: DeleteEstoqueTarget | null
  setTarget: (value: DeleteEstoqueTarget | null) => void
  isPending: boolean
  onConfirm: (target: DeleteEstoqueTarget) => void
}) {
  const cachedTarget = useRef(target)
  if (target) cachedTarget.current = target
  const activeTarget = target || cachedTarget.current

  const handleClose = () => {
    if (!isPending) setTarget(null)
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o && !isPending) setTarget(null)
      }}
    >
      <DialogContent className={iosSheetDialogCn}>
        <div className="px-5 pt-6 pb-safe flex flex-col items-center gap-5 text-center">
          {/* Icon */}
          <div className="w-[60px] h-[60px] rounded-full bg-[#FF3B30]/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-7 h-7 text-[#FF3B30]" />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <DialogTitle className="text-[17px] font-semibold">Zerar Estoque</DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground leading-snug px-2">
              Isso registrará uma saída para consumir o saldo restante de{' '}
              <strong className="text-foreground font-semibold">
                {formatNumber(activeTarget?.quantidade ?? 0)}
              </strong>{' '}
              em{' '}
              <strong className="text-foreground font-semibold">
                {activeTarget?.almoxarifadoNome}
              </strong>
              . Esta ação não pode ser desfeita.
            </DialogDescription>
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-2 pb-2">
            <Button
              type="button"
              variant="destructive"
              className="h-[50px] rounded-[14px] text-[16px] font-semibold"
              loading={isPending}
              onClick={() => activeTarget && onConfirm(activeTarget)}
            >
              Zerar Estoque
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-[50px] rounded-[14px] text-[16px] text-[#007AFF] hover:text-[#007AFF] hover:bg-[#007AFF]/8"
              disabled={isPending}
              onClick={handleClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
