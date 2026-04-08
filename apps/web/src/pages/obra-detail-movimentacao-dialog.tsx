import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/ui/button'
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
import {
  useAlmoxarifados,
  useCreateMovimentacaoEntrada,
  useCreateMovimentacaoSaida,
  useCreateMovimentacaoTransferencia,
  useMateriais,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type MovTipo = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

interface ObraDetailMovimentacaoDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  obraId: string
  preAlmoxId?: string
  preMaterialId?: string
  preTipo?: string
}

const tipoOptions = [
  { value: 'ENTRADA' as MovTipo, label: 'Entrada', icon: ArrowDownRight, color: '#34C759' },
  { value: 'SAIDA' as MovTipo, label: 'Saída', icon: ArrowUpRight, color: '#FF3B30' },
  {
    value: 'TRANSFERENCIA' as MovTipo,
    label: 'Transferência',
    icon: ArrowLeftRight,
    color: '#007AFF',
  },
]

export function ObraDetailMovimentacaoDialog({
  open,
  onOpenChange,
  obraId,
  preAlmoxId,
  preMaterialId,
  preTipo,
}: ObraDetailMovimentacaoDialogProps) {
  const { toast } = useToast()
  const createEntrada = useCreateMovimentacaoEntrada()
  const createSaida = useCreateMovimentacaoSaida()
  const createTransferencia = useCreateMovimentacaoTransferencia()
  const { data: materiais = [] } = useMateriais()
  const { data: allAlmox = [] } = useAlmoxarifados()

  const almoxarifados = allAlmox.filter((a) => a.obra_id === obraId)

  const [tipo, setTipo] = useState<MovTipo>((preTipo as MovTipo) ?? 'ENTRADA')
  const [materialId, setMaterialId] = useState(preMaterialId ?? '')
  const [almoxId, setAlmoxId] = useState(preAlmoxId ?? '')
  const [almoxDestinoId, setAlmoxDestinoId] = useState('')
  const [qty, setQty] = useState('')

  const isPending =
    createEntrada.isPending || createSaida.isPending || createTransferencia.isPending
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  useEffect(() => {
    if (open) {
      setTipo((preTipo as MovTipo) ?? 'ENTRADA')
      setMaterialId(preMaterialId ?? '')
      setAlmoxId(preAlmoxId ?? '')
      setAlmoxDestinoId('')
      setQty('')
    }
  }, [open, preAlmoxId, preMaterialId, preTipo])

  // Clear destination when switching away from TRANSFERENCIA so ghost state
  // (a previously selected destination) can't leak into ENTRADA/SAIDA payloads.
  useEffect(() => {
    if (tipo !== 'TRANSFERENCIA') {
      setAlmoxDestinoId('')
    }
  }, [tipo])

  const canSubmit =
    !!materialId &&
    !!almoxId &&
    !!qty &&
    Number(qty.replace(',', '.')) > 0 &&
    (tipo !== 'TRANSFERENCIA' || !!almoxDestinoId) &&
    !isPending

  function reset() {
    setTipo('ENTRADA')
    setMaterialId('')
    setAlmoxId('')
    setAlmoxDestinoId('')
    setQty('')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    const selectedMat = materiais.find((m) => m.id === materialId)
    const materialPrice = selectedMat?.preco_unitario ?? 0
    const quantidade = Number(qty.replace(',', '.'))
    const labels: Record<MovTipo, string> = {
      ENTRADA: 'Entrada registrada',
      SAIDA: 'Saída registrada',
      TRANSFERENCIA: 'Transferência realizada',
    }

    try {
      if (tipo === 'ENTRADA') {
        await createEntrada.mutateAsync({
          p_material_id: materialId,
          p_quantidade: quantidade,
          p_preco_unitario: materialPrice,
          p_almoxarifado_id: almoxId,
        })
      } else if (tipo === 'SAIDA') {
        await createSaida.mutateAsync({
          p_material_id: materialId,
          p_quantidade: quantidade,
          p_preco_unitario: materialPrice,
          p_almoxarifado_id: almoxId,
        })
      } else {
        await createTransferencia.mutateAsync({
          p_material_id: materialId,
          p_quantidade: quantidade,
          p_almoxarifado_id: almoxId,
          p_almoxarifado_destino_id: almoxDestinoId,
        })
      }
      toast({ title: labels[tipo], variant: 'success' })
      reset()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar movimentação',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const tipoOpt = tipoOptions.find((t) => t.value === tipo) ?? tipoOptions[0]
  const TipoIcon = tipoOpt.icon

  const handleClose = () => {
    if (!isPending) {
      reset()
      onOpenChange(false)
    }
  }

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2 w-full">
      <Button
        type="button"
        loading={isPending}
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-2 sm:order-2"
      >
        Confirmar
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={handleClose}
        className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-1 sm:order-1"
      >
        Cancelar
      </Button>
    </div>
  )

  return (
    <Modal isOpen={open} onClose={handleClose} title="Nova Movimentação" footer={footer}>
      <div ref={formRef} className="space-y-4 pb-4">
        <p className="mt-[-12px] mb-4 text-[13px] text-muted-foreground">
          Registre uma entrada, saída ou transferência de materiais.
        </p>

        {/* Tipo selector */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Tipo</Label>
          <div className="flex gap-2" role="radiogroup" aria-label="Tipo de movimentação">
            {tipoOptions.map((opt) => {
              const Ic = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={tipo === opt.value}
                  onClick={() => setTipo(opt.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-medium transition-all',
                    tipo === opt.value
                      ? 'text-white shadow-sm'
                      : 'bg-accent/60 text-muted-foreground hover:bg-accent',
                  )}
                  style={tipo === opt.value ? { background: opt.color } : undefined}
                >
                  <Ic className="h-3.5 w-3.5" aria-hidden="true" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Material */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Material *</Label>
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o material…" />
            </SelectTrigger>
            <SelectContent>
              {materiais.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Almoxarifado origem */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">{tipo === 'TRANSFERENCIA' ? 'Origem *' : 'Local *'}</Label>
          <Select value={almoxId} onValueChange={setAlmoxId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o local…" />
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

        {/* Destino — only for TRANSFERENCIA */}
        {tipo === 'TRANSFERENCIA' && (
          <div className="space-y-1.5">
            <Label className="text-[13px]">Destino *</Label>
            <Select value={almoxDestinoId} onValueChange={setAlmoxDestinoId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o destino…" />
              </SelectTrigger>
              <SelectContent>
                {almoxarifados
                  .filter((a) => a.id !== almoxId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantidade */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Quantidade *</Label>
          <Input
            placeholder="0"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d,\.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            className="h-11"
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
