import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput, parseCurrency } from '@/components/ui/currency-input'
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
import {
  type FinanceiroConta,
  type FornecedorRow,
  type MaterialRow,
  useCreateEntradaEstoqueFinanceiro,
} from '@/hooks/use-supabase'
import { cn, formatCurrency, todayISO } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { AlmoxByObraGroup } from './estoque-dialog-types'

type NovaEntradaDialogProps = {
  open: boolean
  onClose: () => void
  materiaisList: MaterialRow[]
  almoxByObra: AlmoxByObraGroup[]
  contasList: FinanceiroConta[]
  fornecedoresList: FornecedorRow[]
}

export function NovaEntradaDialog({
  open,
  onClose,
  materiaisList,
  almoxByObra,
  contasList,
  fornecedoresList,
}: NovaEntradaDialogProps) {
  const { toast } = useToast()
  const isKeyboardOpen = useIsKeyboardOpen()

  const createEntradaFinanceiro = useCreateEntradaEstoqueFinanceiro()

  const [entMaterialId, setEntMaterialId] = useState('')
  const [entQty, setEntQty] = useState('')
  const [entPreco, setEntPreco] = useState('')
  const [entUnidade, setEntUnidade] = useState('')
  const [entPagamento, setEntPagamento] = useState('')
  const [entAlmoxId, setEntAlmoxId] = useState('')
  const [entFornecedorId, setEntFornecedorId] = useState('')
  const [entObs, setEntObs] = useState('')
  const [entContaId, setEntContaId] = useState('')
  const [entSubconta, setEntSubconta] = useState<'CAIXA' | 'APLICADO'>('CAIXA')

  const resetForm = () => {
    setEntMaterialId('')
    setEntQty('')
    setEntPreco('')
    setEntUnidade('')
    setEntPagamento('')
    setEntAlmoxId('')
    setEntFornecedorId('')
    setEntObs('')
    setEntContaId('')
    setEntSubconta('CAIXA')
  }

  const selectedMaterial = materiaisList.find((material) => material.id === entMaterialId)
  const selectedContaData = contasList.find((conta) => conta.id === entContaId)
  const isSubmitting = createEntradaFinanceiro.isPending
  const canSubmit =
    entMaterialId &&
    entQty &&
    Number(entQty.replace(',', '.')) > 0 &&
    entAlmoxId &&
    entUnidade &&
    entContaId &&
    entPagamento

  const entradaTotal =
    Number(entQty.replace(',', '.') || '0') *
    (parseCurrency(entPreco) || selectedMaterial?.preco_unitario || 0)

  const handleRegistrar = async () => {
    if (!canSubmit) {
      toast({ title: 'Entrada inválida', variant: 'error' })
      return
    }
    const qty = Number.parseFloat(entQty.replace(',', '.').replace(/[^0-9.]/g, ''))
    const preco = parseCurrency(entPreco) || selectedMaterial?.preco_unitario || 0

    try {
      await createEntradaFinanceiro.mutateAsync({
        p_material_id: entMaterialId,
        p_quantidade: qty,
        p_preco_unitario: preco,
        p_almoxarifado_id: entAlmoxId,
        p_conta_id: entContaId,
        p_subconta: entSubconta,
        p_motivo: `Compra: ${selectedMaterial?.nome ?? 'Material'}${entObs ? ` — ${entObs}` : ''}`,
        p_data: todayISO(),
        p_fornecedor_id: entFornecedorId || undefined,
        p_unidade: entUnidade || undefined,
        p_forma_pagamento: entPagamento || undefined,
        p_observacao: entObs || undefined,
      })
      toast({ title: 'Entrada registrada', variant: 'success' })
      resetForm()
      onClose()
    } catch {
      toast({ title: 'Erro ao registrar entrada', variant: 'error' })
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (isSubmitting) return
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-lg">
        <DialogTitle className="sr-only">Nova Entrada de Estoque</DialogTitle>
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <span className="text-[17px] sm:text-[15px] font-semibold">Nova Entrada</span>
          <motion.button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 space-y-5 py-6">
          <div className="space-y-2">
            <Label>Material</Label>
            <Select value={entMaterialId} onValueChange={setEntMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                {materiaisList.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.nome}{' '}
                    <span className="text-muted-foreground">({material.codigo})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMaterial && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/50 px-4 py-3">
              <Badge variant="secondary">{selectedMaterial.categoria?.nome}</Badge>
              <span className="text-[13px] sm:text-[12px] text-muted-foreground">
                Unid:{' '}
                <strong>{selectedMaterial.unidade ?? selectedMaterial.categoria?.unidade}</strong>
              </span>
              {(selectedMaterial.preco_unitario ?? 0) > 0 && (
                <span className="text-[13px] ml-auto text-muted-foreground">
                  Último: <strong>{formatCurrency(selectedMaterial.preco_unitario)}</strong>
                </span>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={entUnidade} onValueChange={setEntUnidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: 'UN', label: 'Unidade' },
                  { value: 'KG', label: 'Quilograma' },
                ].map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Qtd.</Label>
              <Input
                type="number"
                step="0.01"
                value={entQty}
                onChange={(event) => setEntQty(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Un.</Label>
              <CurrencyInput
                value={entPreco}
                onChange={(event) => setEntPreco(event.target.value)}
                placeholder={
                  (selectedMaterial?.preco_unitario ?? 0) > 0
                    ? String(selectedMaterial?.preco_unitario).replace('.', ',')
                    : '0,00'
                }
              />
            </div>
          </div>
          {entradaTotal > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-accent/50 px-4 py-3">
              <span className="text-[14px] text-muted-foreground">Subtotal</span>
              <span className="text-[18px] font-bold tabular-nums">
                {formatCurrency(entradaTotal)}
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Almoxarifado</Label>
            <Select value={entAlmoxId} onValueChange={setEntAlmoxId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {almoxByObra.map(([obraId, { obraNome, almoxs }]) => (
                  <div key={obraId}>
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                      {obraNome}
                    </div>
                    {almoxs.map((almox) => (
                      <SelectItem key={almox.id} value={almox.id}>
                        {almox.nome}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Conta para Débito</Label>
            <Select value={entContaId} onValueChange={setEntContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                {contasList.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedContaData && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEntSubconta('CAIXA')}
                  className={cn(
                    'flex-1 rounded-xl border p-2 text-left',
                    entSubconta === 'CAIXA' && 'border-[#007AFF] bg-[#007AFF]/10',
                  )}
                >
                  Caixa: {formatCurrency(Number(selectedContaData.valor_caixa))}
                </button>
                <button
                  type="button"
                  onClick={() => setEntSubconta('APLICADO')}
                  className={cn(
                    'flex-1 rounded-xl border p-2 text-left',
                    entSubconta === 'APLICADO' && 'border-[#34C759] bg-[#34C759]/10',
                  )}
                >
                  Aplicado: {formatCurrency(Number(selectedContaData.valor_aplicado))}
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma Pag.</Label>
              <Select value={entPagamento} onValueChange={setEntPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Ex: PIX" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CARTAO_DEBITO">Cartão Débito</SelectItem>
                  <SelectItem value="CARTAO_CREDITO">Cartão Crédito</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={entFornecedorId} onValueChange={setEntFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedoresList.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleRegistrar}
                  disabled={!canSubmit}
                  loading={isSubmitting}
                >
                  Registrar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
