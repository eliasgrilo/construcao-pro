import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { Modal } from '@/components/Modal/Modal'
import { useToast } from '@/components/ui/toast'
import { useCreateManutencao } from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Wrench, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ObraDetailManutencaoDialogProps {
  open: boolean
  onClose: () => void
  obraId: string
  statusAnterior: string
  onSuccess: () => void
}

export function ObraDetailManutencaoDialog({
  open,
  onClose,
  obraId,
  statusAnterior,
  onSuccess,
}: ObraDetailManutencaoDialogProps) {
  const [descricao, setDescricao] = useState('')
  const [problemas, setProblemas] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)
  const createManutencao = useCreateManutencao()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDescricao('')
      setProblemas([])
      setIsSubmitting(false)
      setTimeout(() => textareaRef.current?.focus(), 350)
    }
  }, [open])

  // FIX (P0 — Issue #3): Removed duplicate Escape key listener.
  // The parent Modal component (Modal.tsx:49-58) already handles Escape.
  // Having two listeners caused onClose() to fire twice per Escape press.

  const handleAddProblema = () => {
    const trimmed = descricao.trim()
    if (!trimmed) return
    setProblemas((prev) => [...prev, trimmed])
    setDescricao('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleRemoveProblema = (index: number) => {
    setProblemas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStart = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // Collect all problems: already added + current textarea if non-empty
    const allProblemas = [...problemas]
    const trimmedCurrent = descricao.trim()
    if (trimmedCurrent) allProblemas.push(trimmedCurrent)

    try {
      await createManutencao.mutateAsync({
        obra_id: obraId,
        status_anterior: statusAnterior,
        problemas: allProblemas,
      })
      toast({
        title: 'Manutenção iniciada',
        description:
          allProblemas.length > 0
            ? `${allProblemas.length} problema${allProblemas.length > 1 ? 's' : ''} registrado${allProblemas.length > 1 ? 's' : ''}.`
            : undefined,
        variant: 'success',
      })
      onSuccess()
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : undefined
      toast({
        title: 'Erro ao iniciar manutenção',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasText = descricao.trim().length > 0
  const totalProblemas = problemas.length + (hasText ? 1 : 0)

  return (
    <Modal isOpen={open} onClose={() => !isSubmitting && onClose()} noPadding>
      <div className="relative w-full bg-card pb-7 pt-4 px-7">
        <div ref={formRef}>
          {/* Top accent stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: 'linear-gradient(90deg, #FF8C00 0%, #FF9500 45%, #FFAC30 100%)',
            }}
          />

          {/* Close button */}
          <motion.button
            type="button"
            aria-label="Fechar"
            whileTap={{ scale: 0.85 }}
            disabled={isSubmitting}
            onClick={() => !isSubmitting && onClose()}
            className="absolute top-4 right-5 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60 transition-colors hover:bg-muted disabled:opacity-30"
          >
            <X className="h-[14px] w-[14px]" />
          </motion.button>

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                delay: 0.08,
                type: 'spring',
                damping: 14,
                stiffness: 300,
              }}
              className="relative"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px]"
                style={{
                  background: 'linear-gradient(145deg, #FF9F0A 0%, #FF6B00 100%)',
                  boxShadow: '0 8px 28px rgba(255,149,0,0.42), 0 2px 8px rgba(255,149,0,0.24)',
                }}
              >
                <Wrench className="h-9 w-9 text-white" strokeWidth={2.2} />
              </div>
              {/* ambient glow */}
              <div
                className="absolute inset-0 -z-10 scale-[1.6] rounded-full opacity-30 blur-2xl"
                style={{ background: '#FF9500' }}
              />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="mb-1.5 text-center text-[22px] font-semibold tracking-[-0.3px] text-foreground"
          >
            Iniciar Manutenção
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="mb-7 text-center text-[14px] leading-snug text-muted-foreground"
          >
            O status da obra será alterado para{' '}
            <span style={{ color: '#FF9500', fontWeight: 600 }}>Manutenção</span>.
          </motion.p>

          {/* Problem textarea */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21 }}
            className="mb-5"
          >
            <label
              htmlFor="manutencao-descricao"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              Problema encontrado{' '}
              <span className="normal-case tracking-normal font-normal text-muted-foreground/50">
                (opcional)
              </span>
            </label>

            {/* Added problems list */}
            <AnimatePresence initial={false}>
              {problemas.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex items-start gap-2 overflow-hidden rounded-[10px] px-3 py-2 bg-warning/10 border border-warning/30"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white bg-warning">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[13px] leading-snug text-foreground/80">{p}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProblema(i)}
                    disabled={isSubmitting}
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70 disabled:opacity-40 text-muted-foreground/60"
                    aria-label="Remover problema"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="relative">
              <textarea
                id="manutencao-descricao"
                ref={textareaRef}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (hasText) handleAddProblema()
                  }
                }}
                placeholder={
                  problemas.length > 0
                    ? 'Adicionar outro problema…'
                    : 'Ex: Infiltração na parede norte, rachaduras no piso…'
                }
                rows={3}
                disabled={isSubmitting}
                className="w-full resize-none rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-all duration-150 disabled:opacity-50 focus:border-[#FF9500] focus:bg-background focus:shadow-[0_0_0_4px_rgba(255,149,0,0.10)] [caret-color:#FF9500]"
                style={{ paddingBottom: '2.75rem' }}
              />
              {/* Add problem button */}
              <AnimatePresence>
                {hasText && (
                  <motion.button
                    type="button"
                    key="add-btn"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    whileTap={{ scale: 0.88 }}
                    onClick={handleAddProblema}
                    disabled={isSubmitting}
                    className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(145deg, #FF9F0A 0%, #FF6B00 100%)',
                      boxShadow: '0 2px 8px rgba(255,149,0,0.40)',
                    }}
                    title="Adicionar problema (↵)"
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 4px 12px rgba(255,149,0,0.55)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 2px 8px rgba(255,149,0,0.40)'
                    }}
                  >
                    <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-2.5"
          >
            {/* Primary CTA */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.975 }}
              onClick={handleStart}
              disabled={isSubmitting}
              className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] text-[15px] font-semibold text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, #FF9F0A 0%, #FF6B00 100%)',
                boxShadow: '0 4px 14px rgba(255,149,0,0.38)',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 6px 20px rgba(255,149,0,0.50)'
                }
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 14px rgba(255,149,0,0.38)'
              }}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderTopColor: '#FFFFFF',
                  }}
                />
              ) : (
                <>
                  <Wrench className="h-4 w-4" strokeWidth={2.2} />
                  <span>
                    {totalProblemas > 0
                      ? `Iniciar com ${totalProblemas} Problema${totalProblemas > 1 ? 's' : ''}`
                      : 'Iniciar Manutenção'}
                  </span>
                </>
              )}
            </motion.button>

            {/* Cancel */}
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="h-10 w-full text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
          </motion.div>
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
