import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn, formatNumber, todayISO } from '@/lib/utils'
import { AlertTriangle, Minus } from 'lucide-react'
import { useRef, useState } from 'react'
import type { BaixaTarget } from './obra-detail'

interface CreateSaidaMutation {
  isPending: boolean
  mutateAsync: (params: {
    almoxarifado_id: string
    material_id: string
    tipo: string
    quantidade: number
    custo_unitario?: number
    data: string
    observacao: string | null
    obra_id: string
  }) => Promise<unknown>
}

export function ObraDetailDarBaixaDialog({
  baixaTarget,
  setBaixaTarget,
  createSaida,
  obraId,
}: {
  baixaTarget: BaixaTarget | null
  setBaixaTarget: (val: BaixaTarget | null) => void
  createSaida: CreateSaidaMutation
  obraId: string
}) {
  const { toast } = useToast()
  const [baixaQty, setBaixaQty] = useState('')
  const [baixaObs, setBaixaObs] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const handleDarBaixa = async () => {
    if (!baixaTarget) return
    const qty = Number.parseFloat(baixaQty.replace(',', '.'))
    if (!qty || Number.isNaN(qty) || qty <= 0 || qty > baixaTarget.quantidadeDisponivel) return

    try {
      await createSaida.mutateAsync({
        almoxarifado_id: baixaTarget.almoxarifadoId,
        material_id: baixaTarget.materialId,
        tipo: 'SAIDA',
        quantidade: qty,
        custo_unitario: baixaTarget.precoUnitario,
        data: todayISO(),
        observacao: baixaObs.trim() || null,
        obra_id: obraId,
      })
      setBaixaTarget(null)
      setBaixaQty('')
      setBaixaObs('')
      toast({ title: 'Baixa registrada', variant: 'success' })
    } catch (e) {
      toast({
        title: 'Erro ao registrar baixa',
        description: e instanceof Error ? e.message : '',
        variant: 'error',
      })
    }
  }

  const handleClose = () => {
    setBaixaTarget(null)
    setBaixaQty('')
    setBaixaObs('')
  }

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2 w-full">
      <Button
        type="button"
        onClick={handleDarBaixa}
        disabled={
          !baixaQty ||
          Number.isNaN(Number.parseFloat(baixaQty.replace(',', '.'))) ||
          Number.parseFloat(baixaQty.replace(',', '.')) <= 0 ||
          Number.parseFloat(baixaQty.replace(',', '.')) > (baixaTarget?.quantidadeDisponivel ?? 0)
        }
        loading={createSaida.isPending}
        className="w-full h-12 text-[15px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-2 sm:order-2"
      >
        <Minus className="h-4 w-4 mr-1.5" />
        Confirmar Baixa
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-1 sm:order-1"
      >
        Cancelar
      </Button>
    </div>
  )

  return (
    <Modal isOpen={!!baixaTarget} onClose={handleClose} title="Dar Baixa" footer={footer}>
      <div ref={formRef} className="space-y-5 pb-4">
        <p className="mt-[-12px] mb-4 text-[13px] text-muted-foreground">
          Registre o uso/consumo de material nesta obra.
        </p>

        {/* Material + Almoxarifado info card */}
        <div className="flex items-center gap-3.5 rounded-xl bg-accent/50 px-4 py-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-orange-500/10">
            <Minus className="h-5 w-5 text-orange-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] sm:text-[13px] font-semibold truncate">
              {baixaTarget?.materialNome}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {baixaTarget?.almoxarifadoNome}
              {baixaTarget?.materialCodigo && (
                <span>
                  {' '}
                  · <span className="font-mono">{baixaTarget.materialCodigo}</span>
                </span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[18px] font-bold tabular-nums text-foreground">
              {formatNumber(baixaTarget?.quantidadeDisponivel ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">{baixaTarget?.unidade} disponível</p>
          </div>
        </div>

        {/* Quantity input — prominent */}
        <div className="space-y-2">
          <Label>Quantidade a retirar</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={baixaQty}
            onChange={(e) => {
              const v = e.target.value
              // allow digits, comma and period only
              if (/^[\d.,]*$/.test(v)) setBaixaQty(v)
            }}
            placeholder="0"
            className={cn(
              Number.parseFloat(baixaQty.replace(',', '.')) >
                (baixaTarget?.quantidadeDisponivel ?? 0) &&
                'border-destructive focus-visible:ring-destructive',
            )}
          />
          {Number.parseFloat(baixaQty.replace(',', '.')) >
            (baixaTarget?.quantidadeDisponivel ?? 0) && (
            <p className="text-[12px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Quantidade excede o disponível ({formatNumber(baixaTarget?.quantidadeDisponivel ?? 0)}{' '}
              {baixaTarget?.unidade})
            </p>
          )}
          {Number.parseFloat(baixaQty.replace(',', '.')) > 0 &&
            Number.parseFloat(baixaQty.replace(',', '.')) <=
              (baixaTarget?.quantidadeDisponivel ?? 0) && (
              <p className="text-[12px] text-muted-foreground">
                Restará:{' '}
                <span className="font-semibold tabular-nums">
                  {formatNumber(
                    (baixaTarget?.quantidadeDisponivel ?? 0) -
                      Number.parseFloat(baixaQty.replace(',', '.')),
                  )}
                </span>{' '}
                {baixaTarget?.unidade}
              </p>
            )}
        </div>

        {/* Observation — optional */}
        <div className="space-y-2">
          <Label>
            Motivo / Observação{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            value={baixaObs}
            onChange={(e) => setBaixaObs(e.target.value)}
            placeholder="Ex: Fundação Bloco C, Instalação elétrica..."
          />
        </div>
      </div>
      <KeyboardToolbar
        onNext={focusNext}
        onPrev={focusPrev}
        onDone={dismiss}
        hasPrev={canGoPrev}
        hasNext={canGoNext}
      />
    </Modal>
  )
}
