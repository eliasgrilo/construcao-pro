/**
 * obras-dialogs.tsx
 * ObraCreateDialog + ObraDeleteDialog extraídos de obras.tsx
 */
import { Button } from '@/components/ui/button'
import { CurrencyInput, parseCurrency } from '@/components/ui/currency-input'
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
import { useCreateObra, useDeleteObra } from '@/hooks/use-supabase'
import { type CreateObraInput, createObraSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, HardHat, MapPin, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'

/* ── Apple-style section stagger variants ── */
const modalSectionVariants = {
  hidden: { opacity: 0, y: 7 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.7 },
  },
} as const

const modalContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
} as const

/* Shared section-label class */
const SL =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/45 select-none'

/* ── Status options for the Nova Obra chip selector ── */
export const OBRA_STATUS_OPTS: Array<{
  key: 'ATIVA' | 'PAUSADA' | 'FINALIZADA' | 'VENDIDO' | 'TERRENO'
  label: string
  color: string
}> = [
  { key: 'ATIVA', label: 'Ativa', color: '#34C759' },
  { key: 'TERRENO', label: 'Terreno', color: '#AF52DE' },
  { key: 'PAUSADA', label: 'Pausada', color: '#FF9500' },
  { key: 'FINALIZADA', label: 'Finalizada', color: '#8E8E93' },
  { key: 'VENDIDO', label: 'Vendido', color: '#5856D6' },
]

export function ObraCreateDialog({
  open,
  setOpen,
}: { open: boolean; setOpen: (v: boolean) => void }) {
  const { toast } = useToast()
  const createMutation = useCreateObra()
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof OBRA_STATUS_OPTS)[number]['key']>('ATIVA')
  const isSubmittingRef = useRef(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateObraInput>({
    resolver: zodResolver(createObraSchema),
    mode: 'onTouched',
    defaultValues: {
      status: 'ATIVA',
      orcamento: 0,
      valorBurocracia: 0,
      valorConstrucao: 0,
    },
  })

  const isPending = createMutation.isPending
  const isKeyboardOpen = useIsKeyboardOpen()

  const formRef = useRef<HTMLFormElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  function handleClose() {
    if (isPending) return
    setOpen(false)
    reset()
    setSelectedStatus('ATIVA')
  }

  function handleStatusSelect(key: (typeof OBRA_STATUS_OPTS)[number]['key']) {
    setSelectedStatus(key)
    setValue('status', key)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col overflow-clip!">
        {/* ══ HEADER ══ */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-border/30 sm:pt-5 sm:pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
              style={{ background: 'rgba(0,122,255,0.09)' }}
            >
              <HardHat className="h-[18px] w-[18px]" style={{ color: '#007AFF' }} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold tracking-[-0.02em] leading-tight">
                Nova Obra
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground/60 leading-tight mt-[1px]">
                Preencha os dados abaixo
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Cadastre uma nova obra de construção.
          </DialogDescription>
          <motion.button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            whileTap={{ scale: 0.84 }}
            transition={{ type: 'spring', stiffness: 600, damping: 32 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground/70 hover:bg-muted disabled:opacity-40 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        </div>

        {/* ══ SCROLLABLE BODY ══ */}
        <form
          id="nova-obra-form"
          ref={formRef}
          onSubmit={handleSubmit(async (d) => {
            if (isSubmittingRef.current) return
            isSubmittingRef.current = true
            try {
              await createMutation.mutateAsync({
                nome: d.nome,
                endereco: d.endereco,
                status: d.status,
                orcamento: d.orcamento,
                valorTerreno: d.valorTerreno,
                valorBurocracia: d.valorBurocracia,
                valorConstrucao: d.valorConstrucao,
              })
              setOpen(false)
              reset()
              setSelectedStatus('ATIVA')
              toast({ title: 'Obra criada com sucesso', variant: 'success' })
            } catch {
              toast({
                title: 'Erro ao criar obra',
                description: 'Verifique os dados e tente novamente.',
                variant: 'error',
              })
            } finally {
              isSubmittingRef.current = false
            }
          })}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        >
          <motion.div
            className="px-5 pt-5 pb-6 flex flex-col gap-5"
            variants={modalContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* ── Identificação ── */}
            <motion.div variants={modalSectionVariants} className="space-y-3">
              <p className={SL}>Identificação</p>

              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-[13px] font-medium text-foreground/80">
                  Nome da Obra
                </Label>
                <Input
                  id="nome"
                  icon={HardHat}
                  {...register('nome')}
                  placeholder="Ex: Edifício Horizonte"
                  autoComplete="off"
                />
                {errors.nome && (
                  <motion.p
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-destructive px-0.5"
                  >
                    {errors.nome.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco" className="text-[13px] font-medium text-foreground/80">
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  icon={MapPin}
                  {...register('endereco')}
                  placeholder="Ex: Av. Paulista, 1000 — SP"
                  autoComplete="off"
                />
                {errors.endereco && (
                  <motion.p
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-destructive px-0.5"
                  >
                    {errors.endereco.message}
                  </motion.p>
                )}
              </div>
            </motion.div>

            {/* ── hairline ── */}
            <motion.div variants={modalSectionVariants} className="h-px bg-border/25" />

            {/* ── Status ── */}
            <motion.div variants={modalSectionVariants} className="space-y-2.5">
              <p className={SL}>Status inicial</p>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Status inicial da obra"
              >
                {OBRA_STATUS_OPTS.map((s) => {
                  const isSelected = selectedStatus === s.key
                  return (
                    <motion.button
                      key={s.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleStatusSelect(s.key)}
                      whileTap={{ scale: 0.91 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 py-[7px] rounded-full text-[13px] font-medium transition-colors duration-150',
                        isSelected ? '' : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${s.color}13`,
                              color: s.color,
                              border: `1.5px solid ${s.color}30`,
                            }
                          : { border: '1.5px solid transparent' }
                      }
                    >
                      <span
                        className="h-[7px] w-[7px] rounded-full flex-shrink-0 transition-opacity"
                        style={{ backgroundColor: s.color, opacity: isSelected ? 1 : 0.4 }}
                      />
                      {s.label}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0, width: 0 }}
                            animate={{ scale: 1, opacity: 1, width: 'auto' }}
                            exit={{ scale: 0, opacity: 0, width: 0 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                            className="overflow-hidden flex-shrink-0"
                            aria-hidden="true"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: s.color }} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* ── hairline ── */}
            <motion.div variants={modalSectionVariants} className="h-px bg-border/25" />

            {/* ── Valores financeiros ── */}
            <motion.div variants={modalSectionVariants} className="space-y-3">
              <p className={SL}>Valores</p>

              <div className="space-y-1.5">
                <Label htmlFor="orcamento" className="text-[13px] font-medium text-foreground/80">
                  Orçamento da Obra
                </Label>
                <CurrencyInput
                  id="orcamento"
                  {...register('orcamento', { setValueAs: (v) => parseCurrency(String(v)) })}
                  placeholder="0,00"
                />
                {errors.orcamento && (
                  <motion.p
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-destructive px-0.5"
                  >
                    {errors.orcamento.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="valorTerreno"
                  className="text-[13px] font-medium text-foreground/80"
                >
                  Valor do Terreno
                </Label>
                <CurrencyInput
                  id="valorTerreno"
                  {...register('valorTerreno', { setValueAs: (v) => parseCurrency(String(v)) })}
                  placeholder="0,00"
                />
                {errors.valorTerreno && (
                  <motion.p
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-destructive px-0.5"
                  >
                    {errors.valorTerreno.message}
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </form>

        {/* ══ STICKY FOOTER ══ */}
        <AnimatePresence initial={false}>
          {!isKeyboardOpen && (
            <motion.div
              key="footer"
              variants={{
                visible: { height: 'auto', opacity: 1, transition: { duration: 0 } },
                hidden: { height: 0, opacity: 0, transition: { duration: 0 } },
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="shrink-0 overflow-hidden"
            >
              <div className="flex flex-col gap-2.5 px-5 pt-3.5 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/30 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="submit"
                  form="nova-obra-form"
                  loading={isPending}
                  className="w-full h-[52px] text-[15px] font-semibold rounded-[14px] sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-2 sm:order-2"
                >
                  Criar Obra
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                  className="w-full h-[52px] text-[15px] font-medium rounded-[14px] sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg order-1 sm:order-1"
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

export function ObraDeleteDialog({
  deleteTarget,
  setDeleteTarget,
}: {
  deleteTarget: { id: string; nome: string } | null
  setDeleteTarget: (v: { id: string; nome: string } | null) => void
}) {
  const { toast } = useToast()
  const deleteMutation = useDeleteObra()

  const cachedDeleteTarget = useRef(deleteTarget)
  if (deleteTarget) cachedDeleteTarget.current = deleteTarget
  const activeDelete = deleteTarget || cachedDeleteTarget.current

  return (
    <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Obra</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{activeDelete?.nome}</strong>? Esta ação não pode
            ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              activeDelete &&
              deleteMutation.mutate(activeDelete.id, {
                onSuccess: () => {
                  setDeleteTarget(null)
                  toast({ title: 'Obra excluída', variant: 'success' })
                },
                onError: () => {
                  toast({
                    title: 'Erro ao excluir',
                    description: 'Esta obra pode ter almoxarifados e estoque vinculados.',
                    variant: 'error',
                  })
                },
              })
            }
            loading={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
