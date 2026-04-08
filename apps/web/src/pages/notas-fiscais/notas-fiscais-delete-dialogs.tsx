import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { NFRow } from '../notas-fiscais-types'

type LinkedContaRow = {
  id: string
  valor_total: number
}

type DeleteWarningProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deleteTarget: NFRow | null
  linkedContasPagar: LinkedContaRow[]
  canManageNotasFiscais: boolean
  onCancel: () => void
  onDeleteOnlyNF: () => void
  onDeleteWithFinanceiro: () => void
  loading: boolean
}

export function NotasFiscaisDeleteFinanceiroDialog({
  open,
  onOpenChange,
  deleteTarget,
  linkedContasPagar,
  canManageNotasFiscais,
  onCancel,
  onDeleteOnlyNF,
  onDeleteWithFinanceiro,
  loading,
}: DeleteWarningProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {deleteTarget && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: '#FF950015' }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: '#FF9500' }} />
              </div>
              NF-e com financeiro vinculado
            </DialogTitle>
            <DialogDescription className="sr-only">
              Atenção: esta nota fiscal possui contas a pagar vinculadas
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex items-start gap-3.5 rounded-[18px] p-4"
            style={{ backgroundColor: '#FF950008' }}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#FF9500' }} />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Existem{' '}
              <strong className="text-foreground">
                {linkedContasPagar.length} conta(s) a pagar
              </strong>{' '}
              atreladas à NF-e <strong className="text-foreground">nº {deleteTarget.numero}</strong>{' '}
              ({formatCurrency(linkedContasPagar.reduce((s, c) => s + Number(c.valor_total), 0))}).
              Deseja cancelar o financeiro também?
            </p>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            {canManageNotasFiscais && (
              <>
                <Button
                  variant="outline"
                  onClick={onDeleteOnlyNF}
                  loading={loading}
                  className="border-destructive/20 hover:bg-destructive/5"
                >
                  Só remover a NF-e
                </Button>
                <Button
                  onClick={onDeleteWithFinanceiro}
                  loading={loading}
                  style={{ backgroundColor: '#FF3B30' }}
                  className="text-white hover:opacity-90"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remover NF + Financeiro
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

type DeleteConfirmProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deleteTarget: NFRow | null
  canManageNotasFiscais: boolean
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}

export function NotasFiscaisDeleteConfirmDialog({
  open,
  onOpenChange,
  deleteTarget,
  canManageNotasFiscais,
  onCancel,
  onConfirm,
  loading,
}: DeleteConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {deleteTarget && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: '#FF3B3015' }}
              >
                <Trash2 className="h-5 w-5" style={{ color: '#FF3B30' }} />
              </div>
              Remover NF-e
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a remoção desta nota fiscal
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex items-start gap-3.5 rounded-[18px] p-4"
            style={{ backgroundColor: '#FF3B3008' }}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#FF3B30' }} />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              A NF-e <strong className="text-foreground">nº {deleteTarget.numero}</strong> e todos
              os seus itens serão removidos permanentemente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            {canManageNotasFiscais && (
              <Button
                onClick={onConfirm}
                loading={loading}
                style={{ backgroundColor: '#FF3B30' }}
                className="text-white hover:opacity-90"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remover
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
