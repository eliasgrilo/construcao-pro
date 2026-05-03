import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
/**
 * documentacao-upload-modal.tsx
 * DocumentacaoUploadModal extraído de documentacao-dialogs.tsx
 */
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { DocumentoCategoria } from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Check, Landmark, Plus, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtSize, getFileColor, getFileIcon, modalCn } from './documentacao-utils'

interface DocumentacaoUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uploadTarget: string | null
  uploadTargetLabel: string
  uploadItems: { id: string; file: File; name: string }[]
  setUploadItems: React.Dispatch<React.SetStateAction<{ id: string; file: File; name: string }[]>>
  uploadCategoriaId: string | null
  setUploadCategoriaId: (id: string | null) => void
  uploadDescricao: string
  setUploadDescricao: (desc: string) => void
  uploading: boolean
  uploadError: string | null
  setUploadError: (err: string | null) => void
  handleUpload: () => void
  categorias: DocumentoCategoria[]
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function DocumentacaoUploadModal({
  open,
  onOpenChange,
  uploadTarget,
  uploadTargetLabel,
  uploadItems,
  setUploadItems,
  uploadCategoriaId,
  setUploadCategoriaId,
  uploadDescricao,
  setUploadDescricao,
  uploading,
  uploadError,
  setUploadError,
  handleUpload,
  categorias,
  fileInputRef,
}: DocumentacaoUploadModalProps) {
  const [previewItem, setPreviewItem] = useState<{
    url: string
    file: File
    name: string
  } | null>(null)

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  function openPreview(item: { file: File; name: string }) {
    const url = URL.createObjectURL(item.file)
    setPreviewItem({ url, file: item.file, name: item.name })
  }

  function closePreview() {
    if (previewItem) URL.revokeObjectURL(previewItem.url)
    setPreviewItem(null)
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o)
          if (!o) setUploadError(null)
        }}
      >
        <DialogContent className={modalCn}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-[16px] text-[#007AFF]"
              >
                Cancelar
              </button>
              <DialogTitle className="text-[16px] font-semibold">Enviar</DialogTitle>
              <DialogDescription className="sr-only">
                Envie documentos para o repositório de documentação
              </DialogDescription>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadItems.length || uploading}
                className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30"
              >
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-4">
            {/* Error */}
            <AnimatePresence>
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[14px] bg-[#FF3B30]/8 border border-[#FF3B30]/15 px-4 py-3 flex items-start gap-2.5">
                    <X className="h-4 w-4 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#FF3B30] leading-snug">{uploadError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Destination pill */}
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] px-4 py-3 flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px] flex-shrink-0"
                style={{ backgroundColor: uploadTarget ? '#FF95000D' : '#007AFF0D' }}
              >
                {uploadTarget ? (
                  <Building2 className="h-4 w-4 text-[#FF9500]" />
                ) : (
                  <Landmark className="h-4 w-4 text-[#007AFF]" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground/45 uppercase tracking-wider font-semibold leading-tight">
                  Destino
                </p>
                <p className="text-[14px] font-medium leading-tight mt-[1px]">
                  {uploadTargetLabel}
                </p>
              </div>
            </div>

            {/* Files */}
            <div>
              <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
                Arquivos
              </p>
              <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                {uploadItems.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2.5 py-8 px-4"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF]/8">
                      <Upload className="h-6 w-6 text-[#007AFF]" />
                    </div>
                    <p className="text-[14px] font-medium">Selecionar arquivos</p>
                    <p className="text-[12px] text-muted-foreground/40">PDF, PNG e JPG</p>
                  </button>
                ) : (
                  <>
                    {uploadItems.map((item, i) => {
                      const Icon = getFileIcon(item.file.type, item.file.name)
                      const color = getFileColor(item.file.type, item.file.name)
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-start gap-3 px-4 pt-3 pb-2.5',
                            i > 0 && 'border-t border-border/8 dark:border-white/[0.04]',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => openPreview(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] flex-shrink-0 mt-[3px]"
                            style={{ backgroundColor: `${color}0D` }}
                          >
                            <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                setUploadItems((prev) =>
                                  prev.map((it, j) =>
                                    j === i ? { ...it, name: e.target.value } : it,
                                  ),
                                )
                              }
                              className="w-full bg-transparent text-[13px] font-medium border-0 border-b border-border/15 focus:border-[#007AFF] focus:outline-none pb-[2px] leading-tight transition-colors"
                              placeholder="Nome do arquivo"
                            />
                            <p className="text-[11px] text-muted-foreground/40 mt-[4px]">
                              {fmtSize(item.file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploadItems(uploadItems.filter((_, j) => j !== i))}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] flex-shrink-0 mt-[2px]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-[#007AFF] font-medium border-t border-border/8 dark:border-white/[0.04]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Mais arquivos
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
                Descrição
              </p>
              <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                <input
                  type="text"
                  value={uploadDescricao}
                  onChange={(e) => setUploadDescricao(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full px-4 py-3 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
                />
              </div>
            </div>

            {/* Categoria */}
            {categorias.length > 0 && (
              <div>
                <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
                  Categoria
                </p>
                <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setUploadCategoriaId(null)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-[15px]',
                      !uploadCategoriaId && 'text-[#007AFF] font-medium',
                    )}
                  >
                    Nenhuma
                    {!uploadCategoriaId && <Check className="h-4 w-4 text-[#007AFF]" />}
                  </button>
                  {categorias.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setUploadCategoriaId(c.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-[15px] border-t border-border/8 dark:border-white/[0.04]',
                        uploadCategoriaId === c.id && 'font-medium',
                      )}
                      style={uploadCategoriaId === c.id ? { color: c.cor } : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </div>
                      {uploadCategoriaId === c.id && (
                        <Check className="h-4 w-4" style={{ color: c.cor }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

      {previewItem &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-black"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* toolbar */}
            <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
              <p className="text-[14px] font-medium text-white/90 truncate max-w-[70%]">
                {previewItem.name}
              </p>
              <button
                type="button"
                onClick={closePreview}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* content */}
            <div className="flex-1 min-h-0">
              {previewItem.file.type.startsWith('image/') ? (
                <ZoomableImageViewer
                  src={previewItem.url}
                  alt={previewItem.name}
                  contentInsets={{ top: 56, bottom: 8 }}
                />
              ) : previewItem.file.type === 'application/pdf' ? (
                <iframe
                  src={`${previewItem.url}#view=FitH`}
                  title={previewItem.name}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <p className="text-white/50 text-[14px]">Pré-visualização não disponível</p>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
