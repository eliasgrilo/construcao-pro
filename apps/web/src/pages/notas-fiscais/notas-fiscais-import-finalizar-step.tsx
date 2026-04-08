import type { FinanceiroConta } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Package,
  Plus,
  Sparkles,
  Warehouse,
} from 'lucide-react'
import { WarehousePickerCard } from '../notas-fiscais-import-components'
import type { AlmoxarifadoItem } from '../notas-fiscais-types'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

// ─── Account Selector Subcomponent ──────────────────────────────────────────
const AccountSelector = ({
  contas,
  selectedContaId,
  immediateDebitAmount,
  setSelectedContaId,
}: {
  contas: FinanceiroConta[]
  selectedContaId: string | null
  immediateDebitAmount: number
  setSelectedContaId: (id: string) => void
}) => (
  <div className="space-y-3">
    <p
      className="text-[11px] font-bold uppercase tracking-widest px-1"
      style={{ color: '#8E8E93' }}
    >
      Conta para débito{' '}
      {contas.length > 0 && (
        <span
          className="font-medium normal-case"
          style={{
            color: selectedContaId ? '#34C759' : immediateDebitAmount > 0 ? '#FF3B30' : '#8E8E93',
          }}
        >
          {selectedContaId
            ? '(selecionada)'
            : immediateDebitAmount > 0
              ? '(obrigatório)'
              : '(opcional)'}
        </span>
      )}
    </p>
    {contas.length === 0 ? (
      <div
        className="flex items-center gap-3 rounded-[16px] p-4 text-[13px]"
        style={{ backgroundColor: '#FF950012', color: '#FF9500' }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Nenhuma conta financeira cadastrada.
      </div>
    ) : (
      <div className="space-y-2">
        {contas.map((conta) => {
          const isSelected = selectedContaId === conta.id
          const insuficiente =
            immediateDebitAmount > 0 && Number(conta.valor_caixa) < immediateDebitAmount

          return (
            <motion.button
              key={conta.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedContaId(conta.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-[18px] border p-3.5 text-left transition-all',
                isSelected ? 'border-[#007AFF]/40' : 'border-transparent hover:border-[#007AFF]/20',
              )}
              style={
                isSelected
                  ? { backgroundColor: '#007AFF08' }
                  : { backgroundColor: 'var(--card)', borderColor: 'rgba(0,0,0,0.08)' }
              }
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                style={{ backgroundColor: isSelected ? '#007AFF18' : '#8E8E9312' }}
              >
                <Building2
                  style={{ color: isSelected ? '#007AFF' : '#8E8E93', width: 18, height: 18 }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold">{conta.banco}</p>
                <p
                  className="text-[11px] font-semibold mt-0.5"
                  style={{ color: insuficiente ? '#FF3B30' : '#34C759' }}
                >
                  {formatCurrency(Number(conta.valor_caixa))}
                  {insuficiente && (
                    <span className="ml-1.5 font-medium opacity-80">· Saldo insuficiente</span>
                  )}
                </p>
              </div>
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isSelected ? 'border-[#007AFF]' : 'border-muted-foreground/25',
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: '#007AFF' }}
                  />
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    )}
  </div>
)

// ─── Destination Picker Subcomponent ───────────────────────────────────────
const DestinationPicker = ({
  almoxarifados,
  reviewAlmoxarifadoId,
  setReviewAlmoxarifadoId,
}: {
  almoxarifados: AlmoxarifadoItem[]
  reviewAlmoxarifadoId: string | null
  setReviewAlmoxarifadoId: (id: string) => void
}) => (
  <div className="space-y-3">
    <p
      className="text-[11px] font-bold uppercase tracking-widest px-1"
      style={{ color: '#8E8E93' }}
    >
      Estoque de destino{' '}
      <span
        className="font-medium normal-case"
        style={{ color: reviewAlmoxarifadoId ? '#34C759' : '#FF3B30' }}
      >
        {reviewAlmoxarifadoId ? '(selecionado)' : '(obrigatório)'}
      </span>
    </p>
    <div className="space-y-2">
      {almoxarifados.map((almox) => {
        const isSelected = reviewAlmoxarifadoId === almox.id
        return (
          <motion.button
            key={almox.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setReviewAlmoxarifadoId(almox.id)}
            className={cn(
              'w-full flex items-center gap-3 rounded-[18px] border p-3.5 text-left transition-all',
              isSelected ? 'border-[#007AFF]/40' : 'border-transparent hover:border-[#007AFF]/20',
            )}
            style={
              isSelected
                ? { backgroundColor: '#007AFF08' }
                : { backgroundColor: 'var(--card)', borderColor: 'rgba(0,0,0,0.08)' }
            }
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
              style={{ backgroundColor: isSelected ? '#007AFF18' : '#8E8E9312' }}
            >
              <Warehouse
                style={{ color: isSelected ? '#007AFF' : '#8E8E93', width: 18, height: 18 }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold">{almox.nome}</p>
              {almox.obra && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Obra: {almox.obra.nome}</p>
              )}
            </div>
            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                isSelected ? 'border-[#007AFF]' : 'border-muted-foreground/25',
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#007AFF' }}
                />
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  </div>
)

// ─── Main Component ────────────────────────────────────────────────────────
type Props = { model: NotasFiscaisPageModel }

export function NotasFiscaisImportFinalizarStep({ model }: Props) {
  const {
    addAllocation,
    allDistributionsComplete,
    almoxarifados,
    confirmedItems,
    contas,
    distributions,
    immediateDebitAmount,
    matchStates,
    parsed,
    removeAllocation,
    reviewAlmoxarifadoId,
    reviewEditedNames,
    selectedContaId,
    setReviewAlmoxarifadoId,
    setSelectedContaId,
    updateAllocation,
  } = model

  return (
    <motion.div
      key="finalizar"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col flex-1 min-h-0 gap-0 py-0"
    >
      <div className="flex-1 overflow-y-auto space-y-5 py-5 min-h-0">
        <div
          className="flex items-center justify-between rounded-[20px] px-5 py-4 border"
          style={{ backgroundColor: '#007AFF06', borderColor: '#007AFF20' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Total a importar
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              NF-e nº {parsed?.nf.numero.padStart(6, '0')}
            </p>
          </div>
          <p
            className="text-[28px] font-bold tabular-nums tracking-tight"
            style={{ color: '#007AFF' }}
          >
            {parsed && formatCurrency(parsed.nf.valor_total)}
          </p>
        </div>

        {parsed && matchStates.length > 0 && (
          <div
            className="rounded-[20px] border overflow-hidden"
            style={{ borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'var(--card)' }}
          >
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <p
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: '#8E8E93' }}
              >
                Itens da NF-e
              </p>
              <div className="flex items-center gap-2">
                {confirmedItems.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#34C75912', color: '#34C759' }}
                  >
                    {confirmedItems.length} vinculado{confirmedItems.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
              {matchStates.map((state) => {
                const isConfirmed = state.matchStatus === 'confirmed'
                const displayName =
                  reviewEditedNames.get(state.index) ??
                  (isConfirmed ? state.confirmedMaterialNome : state.item.descricao)

                return (
                  <div
                    key={state.index}
                    className="flex items-center gap-2.5 rounded-[12px] px-3 py-2"
                    style={{ backgroundColor: isConfirmed ? '#34C75906' : '#FF950006' }}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px]"
                      style={{ backgroundColor: isConfirmed ? '#34C75912' : '#FF950012' }}
                    >
                      {isConfirmed ? (
                        <CheckCircle2 className="h-3 w-3" style={{ color: '#34C759' }} />
                      ) : (
                        <Package className="h-3 w-3" style={{ color: '#FF9500' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {state.item.quantidade} {state.item.unidade} ×{' '}
                        {formatCurrency(state.item.valor_unitario)}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold tabular-nums shrink-0"
                      style={{ color: '#8E8E93' }}
                    >
                      {formatCurrency(state.item.valor_total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <AccountSelector
          contas={contas as FinanceiroConta[]}
          selectedContaId={selectedContaId}
          immediateDebitAmount={immediateDebitAmount}
          setSelectedContaId={setSelectedContaId}
        />

        {parsed && parsed.itens.length > 0 && (almoxarifados as AlmoxarifadoItem[]).length > 0 && (
          <DestinationPicker
            almoxarifados={almoxarifados as AlmoxarifadoItem[]}
            reviewAlmoxarifadoId={reviewAlmoxarifadoId}
            setReviewAlmoxarifadoId={setReviewAlmoxarifadoId}
          />
        )}

        {distributions.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">
              Distribuição de estoque
            </p>
            {((almoxarifados as AlmoxarifadoItem[])?.length ?? 0) === 0 ? null : (
              <div className="space-y-3">
                {distributions.map((dist) => {
                  const totalAllocated = dist.allocations.reduce(
                    (sum, allocation) => sum + (Number(allocation.quantidade) || 0),
                    0,
                  )
                  const remaining = dist.quantidadeTotal - totalAllocated
                  const isComplete = Math.abs(remaining) < 0.001
                  const isOver = remaining < -0.001
                  const isNewProduct = !dist.materialId
                  const usedAlmoxIds = dist.allocations
                    .map((allocation) => allocation.almoxarifadoId)
                    .filter(Boolean)

                  return (
                    <motion.div
                      key={dist.itemIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[20px] border overflow-hidden"
                      style={{
                        borderColor: isComplete
                          ? '#34C75938'
                          : isOver
                            ? '#FF3B3025'
                            : isNewProduct
                              ? '#FF950020'
                              : 'rgba(0,0,0,0.08)',
                        backgroundColor: isComplete
                          ? '#34C75904'
                          : isNewProduct
                            ? '#FF950004'
                            : 'var(--card)',
                      }}
                    >
                      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] mt-0.5"
                          style={{ backgroundColor: isNewProduct ? '#FF950012' : '#34C75912' }}
                        >
                          {isNewProduct ? (
                            <Sparkles className="h-4 w-4" style={{ color: '#FF9500' }} />
                          ) : (
                            <Package className="h-4 w-4" style={{ color: '#34C759' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold line-clamp-2">{dist.materialNome}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {parsed?.itens[dist.itemIndex]?.descricao}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tabular-nums"
                          style={{
                            backgroundColor: isOver
                              ? '#FF3B3015'
                              : isComplete
                                ? '#34C75915'
                                : '#FF950015',
                            color: isOver ? '#FF3B30' : isComplete ? '#34C759' : '#FF9500',
                          }}
                        >
                          {isComplete
                            ? `${dist.quantidadeTotal} ${dist.unidade} ✓`
                            : isOver
                              ? `+${Math.abs(remaining).toFixed(2)} excedidos`
                              : `${remaining.toFixed(remaining % 1 === 0 ? 0 : 2)} ${dist.unidade} restam`}
                        </span>
                      </div>
                      <div className="px-4 pb-4 space-y-2.5">
                        {dist.allocations.map((alloc, allocIndex) => (
                          <WarehousePickerCard
                            key={allocIndex}
                            alloc={alloc}
                            availableAlmox={(almoxarifados as AlmoxarifadoItem[]).filter(
                              (a) => a.id === alloc.almoxarifadoId || !usedAlmoxIds.includes(a.id),
                            )}
                            unidade={dist.unidade}
                            onSelectAlmox={(id) =>
                              updateAllocation(dist.itemIndex, allocIndex, 'almoxarifadoId', id)
                            }
                            onChangeQty={(qty) =>
                              updateAllocation(dist.itemIndex, allocIndex, 'quantidade', qty)
                            }
                            onRemove={() => removeAllocation(dist.itemIndex, allocIndex)}
                            canRemove={dist.allocations.length > 1}
                          />
                        ))}
                        {dist.allocations.length < almoxarifados.length && (
                          <button
                            type="button"
                            onClick={() => addAllocation(dist.itemIndex)}
                            className="flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[13px] font-semibold w-full transition-colors hover:bg-muted/30"
                            style={{ color: '#007AFF' }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar almoxarifado
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
