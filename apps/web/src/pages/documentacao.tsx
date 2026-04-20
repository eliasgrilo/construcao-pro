import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type Documento,
  peekDocumentoUrl,
  useDeleteDocumento,
  useDocumentoCategorias,
  useDocumentoUrl,
  useDocumentos,
  useObras,
  useUploadDocumento,
} from '@/hooks/use-supabase'
import { cn, generateId } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, FolderOpen, FolderPlus, Landmark, Upload } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { DocumentacaoCategoryModal } from './documentacao-dialogs'
import { DropZoneOverlay, GroupedFileList } from './documentacao-list'
import { DocumentacaoObrasSection } from './documentacao-obras-section'
import { DocumentacaoUploadModal } from './documentacao-upload-modal'
import { cardCn } from './documentacao-utils'

type UploadItem = { id: string; file: globalThis.File; name: string }

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export function DocumentacaoPage() {
  /* ── hooks ── */
  const { toast } = useToast()
  const { canManageDocumentos } = usePermissions()
  const { data: documentos = [], isLoading: docsLoading, isError: docsError } = useDocumentos()
  const { data: categorias = [] } = useDocumentoCategorias()
  const { data: obras = [] } = useObras()
  const uploadMut = useUploadDocumento()
  const deleteMut = useDeleteDocumento()
  const urlMut = useDocumentoUrl()
  /* ── state ── */
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [expandedObras, setExpandedObras] = useState<Set<string>>(new Set())
  // Empresa card: starts EXPANDED — primary content, always relevant (Apple: never hide top-level content)
  const [companyExpanded, setCompanyExpanded] = useState(true)

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploadTargetLabel, setUploadTargetLabel] = useState('Empresa')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [uploadCategoriaId, setUploadCategoriaId] = useState<string | null>(null)
  const [uploadDescricao, setUploadDescricao] = useState('')

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  // Drag per-card
  const [dragOver, setDragOver] = useState<string | null>(null) // "empresa" | obraId | null

  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalOpenRef = useRef(false)
  modalOpenRef.current = uploadModalOpen

  /* ── computed ── */
  const empresaDocs = useMemo(() => documentos.filter((d) => !d.obra_id), [documentos])

  const obraDocs = useMemo(() => {
    const m: Record<string, Documento[]> = {}
    for (const d of documentos) {
      if (d.obra_id) {
        if (!m[d.obra_id]) m[d.obra_id] = []
        m[d.obra_id].push(d)
      }
    }
    return m
  }, [documentos])

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const d of documentos) if (d.categoria_id) c[d.categoria_id] = (c[d.categoria_id] || 0) + 1
    return c
  }, [documentos])

  /* ── actions ── */
  const openUpload = (targetId: string | null, label: string) => {
    setUploadTarget(targetId)
    setUploadTargetLabel(label)
    setUploadItems([])
    setUploadCategoriaId(null)
    setUploadDescricao('')
    setUploadError(null)
    setUploadModalOpen(true)
  }

  const buildUploadItems = useCallback(
    (files: globalThis.File[]): UploadItem[] =>
      files.map((file) => ({
        id: generateId('upload'),
        file,
        name: file.name,
      })),
    [],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = Array.from(e.target.files || [])
      if (f.length > 0) {
        const items = buildUploadItems(f)
        if (modalOpenRef.current) setUploadItems((p) => [...p, ...items])
        else {
          setUploadItems(items)
          setUploadModalOpen(true)
        }
      }
      e.target.value = ''
    },
    [buildUploadItems],
  )

  const handleUpload = async () => {
    if (!uploadItems.length) return
    setUploading(true)
    setUploadError(null)
    try {
      await Promise.all(
        uploadItems.map((item) =>
          uploadMut.mutateAsync({
            file: item.file,
            nome: item.name.trim() || item.file.name,
            descricao: uploadDescricao || undefined,
            categoria_id: uploadCategoriaId,
            obra_id: uploadTarget,
          }),
        ),
      )
      setUploadItems([])
      setUploadCategoriaId(null)
      setUploadDescricao('')
      setUploadError(null)
      setUploadModalOpen(false)
      if (uploadTarget) setExpandedObras((p) => new Set(p).add(uploadTarget))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const openDoc = async (doc: Documento) => {
    // Fast path: URL already cached — open directly (stays in user-gesture context)
    const cached = peekDocumentoUrl(doc.storage_path)
    if (cached) {
      window.open(cached, '_blank', 'noopener,noreferrer')
      return
    }
    // Async path: open blank tab synchronously (avoids popup blocker), then navigate
    const win = window.open('', '_blank')
    try {
      const url = await urlMut.mutateAsync({ storagePath: doc.storage_path })
      if (win) win.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      win?.close()
      toast({
        variant: 'error',
        title: 'Erro ao abrir arquivo',
        description: err instanceof Error ? err.message : 'Não foi possível obter o arquivo.',
      })
    }
  }

  const prefetchDoc = useCallback(
    (doc: Documento) => {
      if (!peekDocumentoUrl(doc.storage_path)) {
        urlMut.mutateAsync({ storagePath: doc.storage_path }).catch(() => {})
      }
    },
    [urlMut],
  )

  const downloadDoc = async (doc: Documento) => {
    const safeName = doc.nome.replace(/[/\\?%*:|"<>]/g, '_')
    try {
      const url = await urlMut.mutateAsync({ storagePath: doc.storage_path, download: safeName })
      // Fetch as blob so anchor.download works on cross-origin URLs across all
      // mobile browsers (fixes blank-HTML-page bug caused by window.open).
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = safeName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Erro ao baixar',
        description: err instanceof Error ? err.message : 'Não foi possível obter o arquivo.',
      })
    }
  }

  // Returns Promise so FileRow can show per-row loading spinner
  const deleteDoc = async (doc: Documento): Promise<void> => {
    try {
      await deleteMut.mutateAsync({ id: doc.id, storagePath: doc.storage_path })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Erro ao excluir arquivo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
      throw err
    }
  }

  /* ── drag handlers ── */
  const onDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(id)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX: cx, clientY: cy } = e
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) setDragOver(null)
  }
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const ACCEPTED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
  const isAccepted = (f: globalThis.File) =>
    ACCEPTED_MIME.includes(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name)

  const onDrop = (e: React.DragEvent, targetId: string | null, label: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    const f = Array.from(e.dataTransfer.files).filter(isAccepted)
    if (!f.length) {
      toast({
        variant: 'error',
        title: 'Formato não suportado',
        description: 'Apenas PDF, PNG e JPG são aceitos.',
      })
      return
    }
    setUploadTarget(targetId)
    setUploadTargetLabel(label)
    setUploadItems(buildUploadItems(f))
    setUploadCategoriaId(null)
    setUploadDescricao('')
    setUploadError(null)
    setUploadModalOpen(true)
  }

  const toggleObra = (id: string) =>
    setExpandedObras((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  if (docsError)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-[17px] font-semibold">Erro ao carregar documentos</p>
        <p className="text-[13px] text-muted-foreground max-w-xs">
          Não foi possível carregar os documentos. Verifique sua conexão e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white"
          style={{ backgroundColor: '#007AFF' }}
        >
          Recarregar
        </button>
      </div>
    )

  return (
    <div className="pb-12 min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Page header ── */}
      <div className="px-4 md:px-8 pt-10 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Documentação</h1>
            <p className="text-[14px] text-muted-foreground/70 mt-0.5">
              Documentos da empresa e das obras
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#007AFF] bg-[#007AFF]/8 hover:bg-[#007AFF]/12 transition-colors flex-shrink-0 mt-1"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Categorias
          </motion.button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CARD — DOCUMENTAÇÃO DA EMPRESA
          ══════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-8 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(cardCn, 'relative')}
          onDragEnter={(e) => onDragEnter(e, 'empresa')}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, null, 'Empresa')}
        >
          {/* Drag overlay */}
          <AnimatePresence>
            {dragOver === 'empresa' && (
              <DropZoneOverlay label="Soltar na empresa" color="#007AFF" />
            )}
          </AnimatePresence>

          {/* Header — clicking the left side toggles expand/collapse */}
          <div
            role="button"
            tabIndex={0}
            className="flex items-center justify-between px-5 pt-4 pb-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.015] transition-colors select-none"
            onClick={() => setCompanyExpanded((p) => !p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setCompanyExpanded((p) => !p)
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#007AFF]/15 to-[#007AFF]/5 flex-shrink-0">
                <Landmark className="h-[22px] w-[22px] text-[#007AFF]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.2px]">
                  Documentação da Empresa
                </h2>
                <p className="text-[12px] text-muted-foreground/50 mt-[2px]">
                  {empresaDocs.length} {empresaDocs.length === 1 ? 'arquivo' : 'arquivos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canManageDocumentos && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    openUpload(null, 'Empresa')
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[#007AFF] pl-3.5 pr-4 py-[7px] text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/20 hover:shadow-md hover:shadow-[#007AFF]/25 active:shadow-sm transition-all"
                >
                  <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Enviar
                </motion.button>
              )}

              {/* Animated chevron */}
              <motion.div
                animate={{ rotate: companyExpanded ? 90 : 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex h-5 w-5 items-center justify-center"
              >
                <ChevronRight className="h-[14px] w-[14px] text-muted-foreground/35" />
              </motion.div>
            </div>
          </div>

          {/* Collapsible body with smooth height animation */}
          <AnimatePresence initial={false}>
            {companyExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                {/* Divider */}
                <div className="h-px bg-border/8 dark:bg-white/[0.04]" />

                {/* Loading skeleton */}
                {docsLoading && (
                  <div className="p-4 space-y-[14px]">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-9 w-9 rounded-[10px] bg-muted/30" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-[11px] w-3/5 rounded-full bg-muted/25" />
                          <div className="h-[9px] w-2/5 rounded-full bg-muted/15" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {canManageDocumentos && !docsLoading && empresaDocs.length === 0 && (
                  <button
                    type="button"
                    onClick={() => openUpload(null, 'Empresa')}
                    className="w-full flex flex-col items-center py-10 px-4 group/empty"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#007AFF]/[0.05] group-hover/empty:bg-[#007AFF]/[0.08] transition-colors">
                      <FolderOpen
                        className="h-7 w-7 text-[#007AFF]/40 group-hover/empty:text-[#007AFF]/60 transition-colors"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-[14px] font-medium text-muted-foreground/50 mt-4 group-hover/empty:text-muted-foreground/70 transition-colors">
                      Enviar primeiro documento
                    </p>
                    <p className="text-[12px] text-muted-foreground/30 mt-1">
                      Arraste arquivos ou clique aqui
                    </p>
                  </button>
                )}

                {/* Grouped file list */}
                {!docsLoading && empresaDocs.length > 0 && (
                  <GroupedFileList
                    docs={empresaDocs}
                    categorias={categorias}
                    onOpen={openDoc}
                    onDownload={downloadDoc}
                    onDelete={deleteDoc}
                    onPrefetch={prefetchDoc}
                    canDelete={canManageDocumentos}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION — OBRAS
          ══════════════════════════════════════════════════════ */}
      <DocumentacaoObrasSection
        obras={obras}
        obraDocs={obraDocs}
        expandedObras={expandedObras}
        dragOver={dragOver}
        categorias={categorias}
        docsLoading={docsLoading}
        canManageDocumentos={canManageDocumentos}
        openUpload={openUpload}
        openDoc={openDoc}
        downloadDoc={downloadDoc}
        deleteDoc={deleteDoc}
        prefetchDoc={prefetchDoc}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        toggleObra={toggleObra}
      />

      <DocumentacaoUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        uploadTarget={uploadTarget}
        uploadTargetLabel={uploadTargetLabel}
        uploadItems={uploadItems}
        setUploadItems={setUploadItems}
        uploadCategoriaId={uploadCategoriaId}
        setUploadCategoriaId={setUploadCategoriaId}
        uploadDescricao={uploadDescricao}
        setUploadDescricao={setUploadDescricao}
        uploading={uploading}
        uploadError={uploadError}
        setUploadError={setUploadError}
        handleUpload={handleUpload}
        categorias={categorias}
        fileInputRef={fileInputRef}
      />

      <DocumentacaoCategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categorias={categorias}
        catCounts={catCounts}
      />

    </div>
  )
}
