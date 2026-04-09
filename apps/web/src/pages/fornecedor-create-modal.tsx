import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useCreateFornecedor } from '@/hooks/use-supabase'
import { type CreateFornecedorInput, createFornecedorSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { iosSheetDialogCn } from './dialog-styles'

const modalCn = iosSheetDialogCn

interface CreateFornecedorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFornecedorModal({ open, onOpenChange }: CreateFornecedorModalProps) {
  const { toast } = useToast()
  const createMutation = useCreateFornecedor()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFornecedorInput>({
    resolver: zodResolver(createFornecedorSchema),
    mode: 'onTouched',
  })

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const handleCreate = handleSubmit((data) =>
    createMutation.mutate(
      {
        nome: data.nome,
        cnpj: data.cnpj,
        nome_fantasia: data.nomeFantasia ?? null,
        inscricao_estadual: data.inscricaoEstadual ?? null,
        telefone: data.telefone,
        email: data.email,
        endereco: data.endereco,
        observacao: data.observacao,
        cidade: data.cidade ?? null,
        estado: data.estado ?? null,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          reset()
          toast({ title: 'Fornecedor cadastrado', variant: 'success' })
        },
        onError: () => toast({ title: 'Erro ao cadastrar', variant: 'error' }),
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (createMutation.isPending) return
        onOpenChange(o)
      }}
    >
      <DialogContent className={modalCn}>
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (createMutation.isPending) return
                onOpenChange(false)
              }}
              disabled={createMutation.isPending}
              className="text-[16px] text-[#007AFF] min-w-[64px] text-left disabled:opacity-30 transition-opacity"
            >
              Cancelar
            </button>
            <DialogTitle className="text-[16px] font-semibold">Novo Fornecedor</DialogTitle>
            <DialogDescription className="sr-only">
              Preencha os dados do novo fornecedor
            </DialogDescription>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30 min-w-[64px] text-right"
            >
              {createMutation.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 space-y-4 pb-6">
          {/* Razão Social */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Razão Social / Nome <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                {...register('nome')}
                placeholder="Ex: Votorantim Cimentos"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
            <AnimatePresence>
              {errors.nome && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12px] text-[#FF3B30] px-4 mt-1"
                >
                  {errors.nome.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Nome Fantasia */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Nome Fantasia
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                {...register('nomeFantasia')}
                placeholder="Nome comercial (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* CNPJ + IE + Telefone */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Identificação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                {...register('cnpj')}
                placeholder="CNPJ (opcional)"
                inputMode="numeric"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 font-mono"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <input
                {...register('inscricaoEstadual')}
                placeholder="Inscrição Estadual (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 font-mono"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <input
                {...register('telefone')}
                placeholder="Telefone (opcional)"
                inputMode="tel"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Contato Digital
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                type="email"
                {...register('email')}
                placeholder="Email (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12px] text-[#FF3B30] px-4 mt-1"
                >
                  {errors.email.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Localização */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Localização
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                {...register('endereco')}
                placeholder="Endereço (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <div className="flex items-center">
                <input
                  {...register('cidade')}
                  placeholder="Cidade (opcional)"
                  className="flex-1 px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
                />
                <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
                <input
                  {...register('estado')}
                  placeholder="UF"
                  maxLength={2}
                  className="w-[64px] px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 text-center uppercase"
                />
              </div>
            </div>
            <AnimatePresence>
              {errors.estado && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12px] text-[#FF3B30] px-4 mt-1"
                >
                  {errors.estado.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Observação */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Observação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                {...register('observacao')}
                placeholder="Notas internas (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>
        </div>
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
