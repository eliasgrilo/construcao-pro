import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCheck, ChevronDown, Minus, Plus, Warehouse, X } from 'lucide-react'
import React, { useState } from 'react'
import type { AlmoxarifadoItem, DepotAllocation, UploadStep } from './notas-fiscais-types'
import { STEP_META, STEP_ORDER } from './notas-fiscais-utils'

// ─── Import dialog sub-components ──────────────────────────────────────────────

export function PreviewRow({
  label,
  value,
  mono,
  bold,
}: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-[12px] text-muted-foreground shrink-0">{label}</p>
      <p
        className={cn(
          'text-right truncate',
          mono ? 'font-mono text-[11px] text-muted-foreground' : 'text-[13px]',
          bold && 'font-semibold',
        )}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Step indicator — numbered circles with animated connecting lines ──────────

export function StepIndicator({ currentStep }: { currentStep: UploadStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  return (
    <div className="flex items-center w-full">
      {STEP_META.map((meta, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <React.Fragment key={meta.label}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <motion.div
                className="relative flex h-9 w-9 items-center justify-center rounded-full"
                animate={{
                  backgroundColor: done ? '#34C759' : active ? '#007AFF' : 'rgba(142,142,147,0.12)',
                  scale: active ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {done ? (
                  <CheckCheck className="h-4 w-4 text-white" />
                ) : (
                  <span
                    className="text-[14px] font-bold leading-none select-none"
                    style={{ color: active ? 'white' : '#8E8E93' }}
                  >
                    {i + 1}
                  </span>
                )}
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: '#007AFF' }}
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.65 }}
                    transition={{
                      duration: 1.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeOut',
                    }}
                  />
                )}
              </motion.div>
              <motion.span
                className="text-[9px] font-bold uppercase tracking-[0.08em]"
                animate={{ color: active ? '#007AFF' : done ? '#34C759' : '#8E8E93' }}
                transition={{ duration: 0.2 }}
              >
                {meta.label}
              </motion.span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className="flex-1 relative mx-1 mb-5">
                <div
                  className="h-[2px] w-full rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}
                />
                <motion.div
                  className="absolute top-0 left-0 h-[2px] rounded-full"
                  style={{ backgroundColor: done ? '#34C759' : '#007AFF' }}
                  animate={{ width: done ? '100%' : active ? '50%' : '0%' }}
                  transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── WarehousePickerCard ───────────────────────────────────────────────────────

export function WarehousePickerCard({
  alloc,
  availableAlmox,
  unidade,
  onSelectAlmox,
  onChangeQty,
  onRemove,
  canRemove,
}: {
  alloc: DepotAllocation
  availableAlmox: AlmoxarifadoItem[]
  unidade: string
  onSelectAlmox: (id: string) => void
  onChangeQty: (qty: number) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const selected = availableAlmox.find((a) => a.id === alloc.almoxarifadoId) ?? null
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div
      className="rounded-[16px] border overflow-hidden"
      style={{ borderColor: alloc.almoxarifadoId ? 'rgba(0,0,0,0.09)' : '#FF950060' }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setShowPicker((v) => !v)}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: selected ? '#007AFF15' : '#FF950015' }}
        >
          <Warehouse className="h-4 w-4" style={{ color: selected ? '#007AFF' : '#FF9500' }} />
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <p className="text-[13px] font-semibold line-clamp-2">{selected.nome}</p>
              {selected.obra && (
                <p className="text-[11px] text-muted-foreground truncate">{selected.obra.nome}</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">Selecionar almoxarifado…</p>
          )}
        </div>
        <motion.div animate={{ rotate: showPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          >
            {availableAlmox.map((almox) => {
              const isSelected = almox.id === alloc.almoxarifadoId
              return (
                <button
                  type="button"
                  key={almox.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    !isSelected && 'hover:bg-muted/20',
                  )}
                  style={isSelected ? { backgroundColor: '#007AFF0C' } : undefined}
                  onClick={() => {
                    onSelectAlmox(almox.id)
                    setShowPicker(false)
                  }}
                >
                  <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                    {isSelected && (
                      <CheckCheck className="h-3.5 w-3.5" style={{ color: '#007AFF' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] font-medium truncate"
                      style={isSelected ? { color: '#007AFF' } : undefined}
                    >
                      {almox.nome}
                    </p>
                    {almox.obra && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {almox.obra.nome}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-2 px-4 py-2.5 border-t"
        style={{ borderColor: 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(0,0,0,0.015)' }}
      >
        <p className="text-[11px] text-muted-foreground flex-1 font-medium">Quantidade</p>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[10px] hover:bg-muted/60 transition-colors"
          onClick={() => onChangeQty(Math.max(0, Number(alloc.quantidade) - 1))}
        >
          <Minus className="h-3 w-3 text-muted-foreground" />
        </button>
        <input
          type="number"
          value={alloc.quantidade || ''}
          onChange={(e) => onChangeQty(Number.parseFloat(e.target.value) || 0)}
          className="w-16 rounded-[10px] border px-2 py-1.5 text-center text-[13px] font-semibold tabular-nums bg-background focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
          placeholder="0"
          min="0"
          step="0.001"
        />
        <span className="text-[11px] text-muted-foreground w-8 font-medium">{unidade}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[10px] hover:bg-muted/60 transition-colors"
          onClick={() => onChangeQty(Number(alloc.quantidade) + 1)}
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
        {canRemove && (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-[10px] hover:bg-red-50 transition-colors ml-1"
            onClick={onRemove}
          >
            <X className="h-3 w-3" style={{ color: '#FF3B30' }} />
          </button>
        )}
      </div>
    </div>
  )
}
