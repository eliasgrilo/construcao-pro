import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  type DocumentoCategoria,
  useCreateDocumentoCategoria,
  useDeleteDocumentoCategoria,
  useUpdateDocumentoCategoria,
} from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, FolderPlus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { CATEGORY_COLORS, modalCn } from './documentacao-utils'

interface DocumentacaoCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categorias: DocumentoCategoria[]
  catCounts: Record<string, number>
}

export function DocumentacaoCategoryModal({
  open,
  onOpenChange,
  categorias,
  catCounts,
}: DocumentacaoCategoryModalProps) {
  const { toast } = useToast()
  const createCatMut = useCreateDocumentoCategoria()
  const updateCatMut = useUpdateDocumentoCategoria()
  const deleteCatMut = useDeleteDocumentoCategoria()

  const [catView, setCatView] = useState<'list' | 'form'>('list')
  const [editCategory, setEditCategory] = useState<DocumentoCategoria | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#007AFF')
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false)

  const saveCategory = async () => {
    if (!catNome.trim()) return
    try {
      if (editCategory)
        await updateCatMut.mutateAsync({ id: editCategory.id, nome: catNome.trim(), cor: catCor })
      else await createCatMut.mutateAsync({ nome: catNome.trim(), cor: catCor })
      toast({
        variant: 'success',
        title: editCategory ? 'Categoria atualizada' : 'Categoria criada',
      })
      setCatNome('')
      setCatCor('#007AFF')
      setEditCategory(null)
      setCatView('list')
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Erro ao salvar categoria',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await deleteCatMut.mutateAsync(id)
      toast({ variant: 'success', title: 'Categoria excluída' })
      setCatView('list')
      setEditCategory(null)
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Erro ao excluir categoria',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  const categoryModalOpen = open
  const setCategoryModalOpen = onOpenChange

  return (
    <Dialog
      open={categoryModalOpen}
      onOpenChange={(o) => {
        setCategoryModalOpen(o)
        if (!o) {
          setEditCategory(null)
          setCatNome('')
          setCatCor('#007AFF')
          setCatView('list')
        }
      }}
    >
      <DialogContent className={modalCn}>
        {/* ── iOS Navigation Bar — smooth context-aware header ── */}
        <div className="shrink-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {catView === 'list' ? (
              <motion.div
                key="header-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between px-5 pt-5 pb-3"
              >
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="text-[17px] text-[#007AFF] active:opacity-50 transition-opacity min-w-[60px] text-left"
                >
                  Fechar
                </button>
                <DialogTitle className="text-[17px] font-semibold tracking-[-0.2px] absolute left-1/2 -translate-x-1/2">
                  Categorias
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Gerencie as categorias de documentos
                </DialogDescription>
                <button
                  type="button"
                  onClick={() => {
                    setEditCategory(null)
                    setCatNome('')
                    setCatCor(CATEGORY_COLORS[0])
                    setCatView('form')
                  }}
                  className="text-[17px] font-semibold text-[#007AFF] active:opacity-50 transition-opacity min-w-[60px] text-right"
                >
                  Novo
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="header-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between px-5 pt-5 pb-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCatView('list')
                    setEditCategory(null)
                    setCatNome('')
                    setCatCor('#007AFF')
                  }}
                  className="flex items-center gap-0 text-[17px] text-[#007AFF] active:opacity-50 transition-opacity -ml-1.5 min-w-[60px]"
                >
                  <ChevronLeft className="h-[22px] w-[22px] -mr-0.5" strokeWidth={2.5} />
                  <span>Voltar</span>
                </button>
                <DialogTitle className="text-[17px] font-semibold tracking-[-0.2px] absolute left-1/2 -translate-x-1/2">
                  {editCategory ? 'Editar' : 'Nova Categoria'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Gerencie as categorias de documentos
                </DialogDescription>
                <button
                  type="button"
                  onClick={saveCategory}
                  disabled={!catNome.trim() || createCatMut.isPending || updateCatMut.isPending}
                  className="text-[17px] font-semibold text-[#007AFF] disabled:text-muted-foreground/25 active:opacity-50 transition-opacity min-w-[60px] text-right"
                >
                  {createCatMut.isPending || updateCatMut.isPending ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-[#007AFF]/25 border-t-[#007AFF] animate-spin inline-block" />
                    </span>
                  ) : editCategory ? (
                    'Salvar'
                  ) : (
                    'Criar'
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />
        </div>

        {/* ── Animated view container ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4">
          <AnimatePresence mode="wait" initial={false}>
            {catView === 'list' ? (
              <motion.div
                key="cat-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                {categorias.length === 0 ? (
                  <div className="flex flex-col items-center py-14 gap-3">
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                      className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(0,122,255,0.08) 0%, rgba(0,122,255,0.03) 100%)',
                      }}
                    >
                      <FolderPlus className="h-8 w-8 text-[#007AFF]/35" strokeWidth={1.4} />
                    </motion.div>
                    <div className="text-center mt-1">
                      <p className="text-[16px] font-semibold text-foreground/60">
                        Nenhuma categoria
                      </p>
                      <p className="text-[13px] text-muted-foreground/35 mt-1 leading-relaxed">
                        Crie categorias para organizar
                        <br />
                        seus documentos
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setEditCategory(null)
                        setCatNome('')
                        setCatCor(CATEGORY_COLORS[0])
                        setCatView('form')
                      }}
                      className="mt-2 flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/20 active:shadow-none transition-shadow"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      Criar Categoria
                    </motion.button>
                  </div>
                ) : (
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none">
                    {categorias.map((c, i) => (
                      <motion.button
                        type="button"
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: i * 0.035,
                          duration: 0.2,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                        onClick={() => {
                          setEditCategory(c)
                          setCatNome(c.nome)
                          setCatCor(c.cor)
                          setCatView('form')
                          setConfirmDeleteCat(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-3.5 px-4 py-[15px] text-left transition-colors',
                          'active:bg-black/[0.04] dark:active:bg-white/[0.06]',
                          i > 0 && 'border-t border-black/[0.04] dark:border-white/[0.04]',
                        )}
                      >
                        {/* Colored circle — iOS Reminders style */}
                        <span
                          className="h-[18px] w-[18px] rounded-full flex-shrink-0 shadow-sm"
                          style={{
                            backgroundColor: c.cor,
                            boxShadow: `0 1px 3px ${c.cor}40, 0 0 0 0.5px ${c.cor}15`,
                          }}
                        />
                        {/* Category name */}
                        <span className="text-[16px] font-medium flex-1 text-left leading-tight truncate text-foreground">
                          {c.nome}
                        </span>
                        {/* File count badge */}
                        {(catCounts[c.id] || 0) > 0 && (
                          <span
                            className="text-[12px] font-bold tabular-nums px-[8px] py-[3px] rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: `${c.cor}12`,
                              color: c.cor,
                            }}
                          >
                            {catCounts[c.id]}
                          </span>
                        )}
                        <ChevronRight
                          className="h-[15px] w-[15px] text-muted-foreground/20 flex-shrink-0"
                          strokeWidth={2.5}
                        />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="cat-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-5"
              >
                {/* Name input — iOS grouped style */}
                <div>
                  <p className="text-[12px] text-muted-foreground/45 uppercase tracking-[0.5px] font-semibold px-1 mb-2">
                    Nome da categoria
                  </p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none">
                    <input
                      autoFocus
                      type="text"
                      value={catNome}
                      onChange={(e) => setCatNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && catNome.trim()) saveCategory()
                      }}
                      placeholder="Ex: Contratos, Projetos..."
                      className="w-full px-4 py-[14px] bg-transparent text-[16px] border-0 focus:outline-none placeholder:text-muted-foreground/22 caret-[#007AFF]"
                      style={catNome.trim() ? { color: catCor } : undefined}
                    />
                  </div>
                </div>

                {/* Color picker — centered grid */}
                <div>
                  <p className="text-[12px] text-muted-foreground/45 uppercase tracking-[0.5px] font-semibold px-1 mb-2">
                    Cor
                  </p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none">
                    <div className="flex flex-wrap justify-center gap-3">
                      {CATEGORY_COLORS.map((c) => (
                        <motion.button
                          type="button"
                          key={c}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setCatCor(c)}
                          className="relative flex items-center justify-center"
                          style={{ height: 44, width: 44 }}
                          aria-label={c}
                        >
                          {/* Selection ring */}
                          <motion.span
                            className="absolute inset-[-3px] rounded-full"
                            style={{ border: `2.5px solid ${c}` }}
                            initial={false}
                            animate={{
                              opacity: catCor === c ? 1 : 0,
                              scale: catCor === c ? 1 : 0.8,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                          />
                          <span
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-full"
                            style={{
                              backgroundColor: c,
                              boxShadow: `0 1px 4px ${c}35`,
                            }}
                          >
                            <motion.span
                              initial={false}
                              animate={{
                                opacity: catCor === c ? 1 : 0,
                                scale: catCor === c ? 1 : 0.5,
                              }}
                              transition={{ duration: 0.15 }}
                            >
                              {catCor === c && (
                                <Check className="h-[15px] w-[15px] text-white" strokeWidth={3} />
                              )}
                            </motion.span>
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live preview card */}
                <div>
                  <p className="text-[12px] text-muted-foreground/45 uppercase tracking-[0.5px] font-semibold px-1 mb-2">
                    Prévia
                  </p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] px-4 py-[14px] flex items-center gap-3.5 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none">
                    <motion.span
                      className="h-[18px] w-[18px] rounded-full flex-shrink-0"
                      animate={{ backgroundColor: catCor, boxShadow: `0 1px 3px ${catCor}40` }}
                      transition={{ duration: 0.2 }}
                    />
                    <AnimatePresence mode="wait">
                      {catNome.trim() ? (
                        <motion.span
                          key="preview-name"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="text-[16px] font-medium leading-tight flex-1 truncate"
                          style={{ color: catCor }}
                        >
                          {catNome.trim()}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="preview-placeholder"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="text-[16px] text-muted-foreground/22"
                        >
                          Nome da categoria
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <ChevronRight
                      className="h-[14px] w-[14px] text-muted-foreground/15 flex-shrink-0"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                {/* Delete button — edit mode only */}
                {editCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, duration: 0.2 }}
                    className="pt-2"
                  >
                    {confirmDeleteCat ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => deleteCategory(editCategory.id)}
                          disabled={deleteCatMut.isPending}
                          className="flex-1 h-[52px] rounded-[14px] text-white text-[15px] font-semibold bg-[#FF3B30] flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity active:opacity-80"
                        >
                          {deleteCatMut.isPending ? (
                            <div className="h-[18px] w-[18px] rounded-full border-[2px] border-white/30 border-t-white animate-spin" />
                          ) : (
                            <Trash2 className="h-[15px] w-[15px]" strokeWidth={2} />
                          )}
                          Confirmar exclusão
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(false)}
                          className="h-[52px] w-[52px] rounded-[14px] bg-white dark:bg-white/[0.07] flex items-center justify-center text-muted-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCat(true)}
                        className="w-full h-[52px] rounded-[14px] text-[#FF3B30] text-[16px] font-medium bg-white dark:bg-white/[0.07] flex items-center justify-center gap-2.5 transition-opacity active:bg-[#FF3B30]/[0.04] shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-none"
                      >
                        <Trash2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                        Excluir Categoria
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
