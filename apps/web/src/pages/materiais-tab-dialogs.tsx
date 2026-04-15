import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
/**
 * materiais-tab-dialogs.tsx
 * Dialogs extraídos de materiais-tab.tsx: Criar, Editar, Excluir Material + Quick-Add Categoria.
 */
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StickyFooter } from '@/components/ui/sticky-footer'
import { useToast } from '@/components/ui/toast'
import {
  type CategoriaRow,
  type MaterialRow,
  useCategorias,
  useCreateCategoria,
  useCreateMaterial,
  useDeleteMaterial,
  useUpdateMaterial,
} from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { type CreateMaterialInput, createMaterialSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Plus, Tag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { UNIDADES, getUnidadeLabel } from './materiais-tab-constants'

/* ── Shared form fields ── */
function MaterialFormFields({
  register,
  setValue,
  watch,
  errors,
  categoriasData,
  onQuickAddCat,
}: {
  register: ReturnType<typeof useForm<CreateMaterialInput>>['register']
  setValue: ReturnType<typeof useForm<CreateMaterialInput>>['setValue']
  watch: ReturnType<typeof useForm<CreateMaterialInput>>['watch']
  errors: ReturnType<typeof useForm<CreateMaterialInput>>['formState']['errors']
  categoriasData: CategoriaRow[]
  onQuickAddCat?: () => void
}) {
  const selectedCategoriaId = watch('categoriaId')
  const selectedUnidade = watch('unidade')

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Nome do Material</Label>
          <Input
            {...register('nome')}
            placeholder="Ex: Cimento CP-II 50kg"
            className="h-11 sm:h-10 text-[15px] sm:text-[13px]"
          />
          {errors.nome && <p className="text-[12px] text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Código</Label>
          <Input
            {...register('codigo')}
            placeholder="Ex: CIM-001"
            className="h-11 sm:h-10 text-[15px] sm:text-[13px] font-mono"
          />
          {errors.codigo && <p className="text-[12px] text-destructive">{errors.codigo.message}</p>}
        </div>
      </div>
      <div className="border-t border-border/50" />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Categoria</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                onValueChange={(v) => {
                  setValue('categoriaId', v)
                  const cat = categoriasData.find((c) => c.id === v)
                  if (cat?.unidade && !selectedUnidade) setValue('unidade', cat.unidade)
                }}
                value={selectedCategoriaId}
              >
                <SelectTrigger className="h-11 sm:h-10 text-[15px] sm:text-[13px]">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasData.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {onQuickAddCat && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl sm:rounded-lg"
                aria-label="Criar nova categoria"
                onClick={onQuickAddCat}
                title="Criar nova categoria"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {errors.categoriaId && (
            <p className="text-[12px] text-destructive">{errors.categoriaId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Unidade de Medida</Label>
          <Select onValueChange={(v) => setValue('unidade', v)} value={selectedUnidade}>
            <SelectTrigger className="h-11 sm:h-10 text-[15px] sm:text-[13px]">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[12px] font-semibold text-muted-foreground w-6">
                      {u.abbr}
                    </span>
                    <span>{u.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unidade && (
            <p className="text-[12px] text-destructive">{errors.unidade.message}</p>
          )}
        </div>
      </div>
      <div className="border-t border-border/50" />
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">Estoque Mínimo</Label>
        <Input
          type="number"
          {...register('estoqueMinimo', { valueAsNumber: true })}
          placeholder="0"
          className="h-11 sm:h-10 text-[15px] sm:text-[13px]"
          min={0}
        />
        <p className="text-[12px] text-muted-foreground">
          Alerta quando o estoque cair abaixo deste valor
        </p>
      </div>
    </div>
  )
}

/* ── Create dialog ── */
export function MateriaisCreateDialog({
  open,
  onClose,
  onRequestQuickAddCat,
  pendingCategory,
  onPendingCategoryApplied,
}: {
  open: boolean
  onClose: () => void
  onRequestQuickAddCat: () => void
  pendingCategory: { id: string; unidade: string } | null
  onPendingCategoryApplied: () => void
}) {
  const { toast } = useToast()
  const { data: categoriasData = [] } = useCategorias()
  const createMutation = useCreateMaterial()

  const formRef = useRef<HTMLFormElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema),
    mode: 'onTouched',
    defaultValues: { estoqueMinimo: 0 },
  })

  // Apply pending category (set after QuickAdd creates one)
  useEffect(() => {
    if (open && pendingCategory) {
      setValue('categoriaId', pendingCategory.id)
      if (pendingCategory.unidade) setValue('unidade', pendingCategory.unidade)
      onPendingCategoryApplied()
    }
  }, [open, pendingCategory, setValue, onPendingCategoryApplied])

  const handleClose = () => {
    if (createMutation.isPending) return
    onClose()
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-lg">
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <DialogTitle>Novo Material</DialogTitle>
          <DialogDescription className="sr-only">
            Cadastre o material no catálogo.
          </DialogDescription>
          <motion.button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-opacity disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <form
          id="novo-material-form"
          ref={formRef}
          onSubmit={handleSubmit((d) =>
            createMutation.mutate(
              {
                nome: d.nome,
                codigo: d.codigo,
                categoria_id: d.categoriaId,
                unidade: d.unidade,
                estoque_minimo: d.estoqueMinimo || 0,
              },
              {
                onSuccess: () => {
                  onClose()
                  reset()
                  toast({ title: 'Material cadastrado com sucesso', variant: 'success' })
                },
                onError: () => toast({ title: 'Erro ao cadastrar material', variant: 'error' }),
              },
            ),
          )}
          className={cn('overflow-y-auto overscroll-contain px-5 flex-1 min-h-0 py-5')}
        >
          <MaterialFormFields
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            categoriasData={categoriasData}
            onQuickAddCat={() => {
              onClose()
              onRequestQuickAddCat()
            }}
          />
        </form>
        <StickyFooter>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/50 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="novo-material-form"
              loading={createMutation.isPending}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Cadastrar Material
            </Button>
          </div>
        </StickyFooter>
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

/* ── Edit dialog ── */
export interface MateriaisEditTarget {
  id: string
  nome: string
  codigo: string
  categoriaId?: string
  unidade: string
  estoqueMinimo: number
}

export function MateriaisEditDialog({
  editTarget,
  onClose,
}: {
  editTarget: MateriaisEditTarget | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const { data: categoriasData = [] } = useCategorias()
  const updateMutation = useUpdateMaterial()

  const cachedEditTarget = useRef(editTarget)
  if (editTarget) cachedEditTarget.current = editTarget
  const activeEdit = editTarget || cachedEditTarget.current

  const formRef = useRef<HTMLFormElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema),
    mode: 'onTouched',
    defaultValues: { estoqueMinimo: 0 },
  })

  useEffect(() => {
    if (editTarget) {
      reset({
        nome: editTarget.nome,
        codigo: editTarget.codigo,
        categoriaId: editTarget.categoriaId ?? '',
        unidade: editTarget.unidade,
        estoqueMinimo: editTarget.estoqueMinimo,
      })
    }
  }, [editTarget, reset])

  const handleClose = () => {
    if (updateMutation.isPending) return
    onClose()
    reset()
  }

  return (
    <Dialog
      open={!!editTarget}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-lg">
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <DialogTitle>Editar Material</DialogTitle>
          <DialogDescription className="sr-only">
            Atualize as informações do material.
          </DialogDescription>
          <motion.button
            type="button"
            disabled={updateMutation.isPending}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-opacity disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <form
          id="editar-material-form"
          ref={formRef}
          onSubmit={handleSubmit((d) => {
            if (!activeEdit) return
            updateMutation.mutate(
              {
                id: activeEdit.id,
                nome: d.nome,
                codigo: d.codigo,
                categoria_id: d.categoriaId || undefined,
                unidade: d.unidade,
                estoque_minimo: d.estoqueMinimo || 0,
              },
              {
                onSuccess: () => {
                  onClose()
                  reset()
                  toast({ title: 'Material atualizado com sucesso', variant: 'success' })
                },
                onError: () => toast({ title: 'Erro ao atualizar material', variant: 'error' }),
              },
            )
          })}
          className={cn('overflow-y-auto overscroll-contain px-5 flex-1 min-h-0 py-5')}
        >
          <MaterialFormFields
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            categoriasData={categoriasData}
          />
        </form>
        <StickyFooter>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/50 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="editar-material-form"
              loading={updateMutation.isPending}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Salvar Alterações
            </Button>
          </div>
        </StickyFooter>
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

/* ── Delete dialog ── */
export function MateriaisDeleteDialog({
  deleteTarget,
  onClose,
}: {
  deleteTarget: { id: string; nome: string } | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const deleteMutation = useDeleteMaterial()

  const cachedDeleteTarget = useRef(deleteTarget)
  if (deleteTarget) cachedDeleteTarget.current = deleteTarget
  const activeDelete = deleteTarget || cachedDeleteTarget.current

  return (
    <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Material</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{activeDelete?.nome}</strong>? Registros de
            estoque vinculados também serão removidos. Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              activeDelete &&
              deleteMutation.mutate(activeDelete.id, {
                onSuccess: () => {
                  onClose()
                  toast({ title: 'Material excluído', variant: 'success' })
                },
                onError: () =>
                  toast({
                    title: 'Erro ao excluir',
                    description: 'Este material pode estar vinculado a registros de estoque.',
                    variant: 'error',
                  }),
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

/* ── Quick-Add Categoria dialog ── */
export function QuickAddCategoriaDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string, unidade: string) => void
}) {
  const { toast } = useToast()
  const createCategoriaMutation = useCreateCategoria()
  const [catNome, setCatNome] = useState('')
  const [catUnidade, setCatUnidade] = useState('')

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const handleClose = () => {
    setCatNome('')
    setCatUnidade('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="p-0 sm:p-0 flex flex-col !overflow-hidden sm:max-w-md">
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border/50 sm:pt-5">
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription className="sr-only">Crie rapidamente uma categoria.</DialogDescription>
          <motion.button
            type="button"
            disabled={createCategoriaMutation.isPending}
            onClick={handleClose}
            whileTap={{ scale: 0.86 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-opacity disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <div
          ref={formRef}
          className={cn('overflow-y-auto overscroll-contain px-5 space-y-4 flex-1 min-h-0 py-5')}
        >
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Nome da Categoria</Label>
            <Input
              value={catNome}
              onChange={(e) => setCatNome(e.target.value)}
              placeholder="Ex: Elétrica, Hidráulica, Pintura..."
              autoFocus
              className="h-11 sm:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">
              Unidade Sugerida{' '}
              <span className="text-muted-foreground font-normal">(pré-preenche o material)</span>
            </Label>
            <Select value={catUnidade} onValueChange={setCatUnidade}>
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    <span className="flex items-center gap-2.5">
                      <span className="font-mono text-[12px] font-semibold text-muted-foreground w-6">
                        {u.abbr}
                      </span>
                      <span>{u.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {catNome && (
            <div className="flex items-center gap-3 rounded-xl bg-accent/60 px-4 py-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: 'rgba(0,122,255,0.10)' }}
              >
                <Tag className="h-4 w-4" style={{ color: '#007AFF' }} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">{catNome}</p>
                {catUnidade && (
                  <p className="text-[12px] text-muted-foreground">
                    Unidade sugerida: {getUnidadeLabel(catUnidade)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <StickyFooter>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))] border-t border-border/50 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() =>
                createCategoriaMutation.mutate(
                  {
                    nome: catNome.trim(),
                    unidade: (catUnidade || 'UN') as CategoriaRow['unidade'],
                  },
                  {
                    onSuccess: (data: CategoriaRow) => {
                      handleClose()
                      if (data?.id) onCreated(data.id, catUnidade)
                      toast({ title: 'Categoria criada e selecionada', variant: 'success' })
                    },
                    onError: () => toast({ title: 'Erro ao criar categoria', variant: 'error' }),
                  },
                )
              }
              disabled={!catNome.trim()}
              loading={createCategoriaMutation.isPending}
              className="w-full h-12 text-[15px] rounded-xl sm:w-auto sm:h-9 sm:text-[13px] sm:rounded-lg"
            >
              Criar Categoria
            </Button>
          </div>
        </StickyFooter>
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
