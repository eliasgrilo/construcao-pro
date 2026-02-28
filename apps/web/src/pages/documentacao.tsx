import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  type Documento,
  type DocumentoCategoria,
  useCreateDocumentoCategoria,
  useDeleteDocumento,
  useDeleteDocumentoCategoria,
  useDocumentoCategorias,
  useDocumentoUrl,
  useDocumentos,
  useObras,
  useUpdateDocumentoCategoria,
  useUploadDocumento,
} from '@/hooks/use-supabase'
import { cn, formatDateShort } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  Check,
  ChevronRight,
  Download,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  FolderPlus,
  Landmark,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

/* ═══════════════════════════════════════════════════════════
   Apple System Design Tokens
   ═══════════════════════════════════════════════════════════ */

const modalCn =
  'p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[390px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col max-h-[85vh] overflow-y-hidden'

const cardCn =
  'rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden'

const CATEGORY_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#00C7BE', '#FF6482', '#30B0C7',
]

const STATUS_COLORS: Record<string, string> = {
  ATIVA: '#34C759',
  FINALIZADA: '#8E8E93',
  PAUSADA: '#FF9500',
  VENDIDO: '#5856D6',
  TERRENO: '#AF52DE',
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('pdf')) return FileText
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
    return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar'))
    return FileArchive
  return File
}

function getFileColor(mime: string) {
  if (mime.startsWith('image/')) return '#FF9500'
  if (mime.startsWith('video/')) return '#AF52DE'
  if (mime.startsWith('audio/')) return '#FF2D55'
  if (mime.includes('pdf')) return '#FF3B30'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '#34C759'
  if (mime.includes('zip') || mime.includes('rar')) return '#8E8E93'
  return '#007AFF'
}

function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const s = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(i > 0 ? 1 : 0)} ${s[i]}`
}

/* ═══════════════════════════════════════════════════════════
   FileRow — single document row (reused in every card)
   ═══════════════════════════════════════════════════════════ */

function FileRow({
  doc,
  onOpen,
  onDownload,
  onDelete,
  last,
}: {
  doc: Documento
  onOpen: () => void
  onDownload: () => void
  onDelete: () => Promise<void>
  last: boolean
}) {
  const Icon = getFileIcon(doc.tipo_arquivo)
  const color = getFileColor(doc.tipo_arquivo)
  const [menu, setMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenu(false)
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 pl-4 pr-3 py-2.5 cursor-pointer',
        'hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors',
        deleting && 'opacity-40 pointer-events-none',
      )}
      onClick={(e) => { e.stopPropagation(); onOpen() }}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
        style={{ backgroundColor: `${color}10` }}
      >
        {deleting
          ? <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70 animate-spin" />
          : <Icon className="h-[18px] w-[18px]" style={{ color }} strokeWidth={1.5} />
        }
      </div>

      {/* Info + hairline */}
      <div className={cn('flex-1 min-w-0 flex items-center gap-2 py-0.5', !last && 'border-b border-border/8 dark:border-white/[0.04] pb-2.5')}>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate leading-tight">{doc.nome}</p>
          <div className="flex items-center gap-1.5 mt-[3px]">
            {doc.documento_categorias && (
              <span
                className="inline-block h-[6px] w-[6px] rounded-full flex-shrink-0"
                style={{ backgroundColor: doc.documento_categorias.cor }}
              />
            )}
            <span className="text-[12px] text-muted-foreground/60 truncate">
              {fmtSize(doc.tamanho)} · {formatDateShort(doc.created_at)}
            </span>
          </div>
        </div>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload() }}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground/70" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(true) }}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground/70" />
          </button>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={(e) => { e.stopPropagation(); setMenu(false) }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.12 }}
              className="absolute right-3 top-full z-50 w-[148px] rounded-xl bg-white dark:bg-[#2C2C2E] border border-border/15 shadow-xl shadow-black/8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(); setMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <Download className="h-3.5 w-3.5 text-[#007AFF]" />
                Baixar
              </button>
              <div className="h-px bg-border/15 mx-2" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/6"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DropZoneOverlay — shown when dragging files over a card
   ═══════════════════════════════════════════════════════════ */

function DropZoneOverlay({ label, color }: { label: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm"
      style={{ backgroundColor: `${color}08`, borderColor: color }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-2"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <Upload className="h-5 w-5" style={{ color }} strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-semibold" style={{ color }}>
          {label}
        </p>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export function DocumentacaoPage() {
  /* ── hooks ── */
  const { data: documentos = [], isLoading: docsLoading } = useDocumentos()
  const { data: categorias = [] } = useDocumentoCategorias()
  const { data: obras = [] } = useObras()
  const uploadMut = useUploadDocumento()
  const deleteMut = useDeleteDocumento()
  const getUrlMut = useDocumentoUrl()
  const createCatMut = useCreateDocumentoCategoria()
  const updateCatMut = useUpdateDocumentoCategoria()
  const deleteCatMut = useDeleteDocumentoCategoria()

  /* ── state ── */
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [expandedObras, setExpandedObras] = useState<Set<string>>(new Set())
  const [companyExpanded, setCompanyExpanded] = useState(true)

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploadTargetLabel, setUploadTargetLabel] = useState('Empresa')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCategoriaId, setUploadCategoriaId] = useState<string | null>(null)
  const [uploadDescricao, setUploadDescricao] = useState('')

  // Category modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<DocumentoCategoria | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#007AFF')

  // Drag per-card
  const [dragOver, setDragOver] = useState<string | null>(null) // "empresa" | obraId | null

  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalOpenRef = useRef(false)
  modalOpenRef.current = uploadModalOpen

  /* ── computed ── */
  const empresaDocs = useMemo(
    () => documentos.filter((d) => !d.obra_id),
    [documentos],
  )

  const obraDocs = useMemo(() => {
    const m: Record<string, Documento[]> = {}
    for (const d of documentos) if (d.obra_id) (m[d.obra_id] ??= []).push(d)
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
    setUploadFiles([])
    setUploadCategoriaId(null)
    setUploadDescricao('')
    setUploadError(null)
    setUploadModalOpen(true)
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || [])
    if (f.length > 0) {
      if (modalOpenRef.current) setUploadFiles((p) => [...p, ...f])
      else { setUploadFiles(f); setUploadModalOpen(true) }
    }
    e.target.value = ''
  }, [])

  const handleUpload = async () => {
    if (!uploadFiles.length) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of uploadFiles) {
        await uploadMut.mutateAsync({
          file, nome: file.name,
          descricao: uploadDescricao || undefined,
          categoria_id: uploadCategoriaId,
          obra_id: uploadTarget,
        })
      }
      setUploadFiles([]); setUploadCategoriaId(null); setUploadDescricao('')
      setUploadError(null); setUploadModalOpen(false)
      if (uploadTarget) setExpandedObras((p) => new Set(p).add(uploadTarget))
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao enviar. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  // Pre-open the tab synchronously (before await) so the browser won't
  // treat the window.open as an unsolicited popup and block it.
  const openDoc = async (doc: Documento) => {
    const tab = window.open('about:blank', '_blank')
    try {
      const url = await getUrlMut.mutateAsync(doc.storage_path)
      if (tab) tab.location.href = url
      else window.open(url, '_blank')
    } catch (err) {
      console.error('[openDoc]', err)
      tab?.close()
    }
  }

  const downloadDoc = async (doc: Documento) => {
    try {
      const url = await getUrlMut.mutateAsync(doc.storage_path)
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.nome })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('[downloadDoc]', err)
    }
  }

  // Returns Promise so FileRow can show per-row loading spinner
  const deleteDoc = async (doc: Documento): Promise<void> => {
    await deleteMut.mutateAsync({ id: doc.id, storagePath: doc.storage_path })
  }

  const saveCategory = async () => {
    if (!catNome.trim()) return
    try {
      if (editCategory) await updateCatMut.mutateAsync({ id: editCategory.id, nome: catNome.trim(), cor: catCor })
      else await createCatMut.mutateAsync({ nome: catNome.trim(), cor: catCor })
      setCatNome(''); setCatCor('#007AFF'); setEditCategory(null); setCategoryModalOpen(false)
    } catch { /* */ }
  }

  const deleteCategory = async (id: string) => {
    try {
      await deleteCatMut.mutateAsync(id)
      setCategoryModalOpen(false); setEditCategory(null)
    } catch { /* */ }
  }

  /* ── drag handlers ── */
  const onDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(id)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX: cx, clientY: cy } = e
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) setDragOver(null)
  }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const onDrop = (e: React.DragEvent, targetId: string | null, label: string) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(null)
    const f = Array.from(e.dataTransfer.files)
    if (f.length) {
      setUploadTarget(targetId); setUploadTargetLabel(label)
      setUploadFiles(f); setUploadCategoriaId(null); setUploadDescricao('')
      setUploadError(null); setUploadModalOpen(true)
    }
  }

  const toggleObra = (id: string) =>
    setExpandedObras((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="pb-12 min-h-screen">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

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
            onClick={() => { setEditCategory(null); setCatNome(''); setCatCor('#007AFF'); setCategoryModalOpen(true) }}
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
            {dragOver === 'empresa' && <DropZoneOverlay label="Soltar na empresa" color="#007AFF" />}
          </AnimatePresence>

          {/* Header — clicking the left side toggles expand/collapse */}
          <div
            className="flex items-center justify-between px-5 pt-4 pb-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.015] transition-colors select-none"
            onClick={() => setCompanyExpanded((p) => !p)}
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
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); openUpload(null, 'Empresa') }}
                className="flex items-center gap-1.5 rounded-full bg-[#007AFF] pl-3.5 pr-4 py-[7px] text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/20 hover:shadow-md hover:shadow-[#007AFF]/25 active:shadow-sm transition-all"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
                Enviar
              </motion.button>

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
                {/* Category tags ribbon */}
                {categorias.length > 0 && (
                  <div className="px-5 pb-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {categorias.map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-[5px] rounded-full px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: `${c.cor}0D`, color: c.cor }}
                      >
                        <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </span>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-border/10 dark:bg-white/[0.04]" />

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
                {!docsLoading && empresaDocs.length === 0 && (
                  <button
                    onClick={() => openUpload(null, 'Empresa')}
                    className="w-full flex flex-col items-center py-10 px-4 group/empty"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#007AFF]/[0.05] group-hover/empty:bg-[#007AFF]/[0.08] transition-colors">
                      <FolderOpen className="h-7 w-7 text-[#007AFF]/40 group-hover/empty:text-[#007AFF]/60 transition-colors" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-medium text-muted-foreground/50 mt-4 group-hover/empty:text-muted-foreground/70 transition-colors">
                      Enviar primeiro documento
                    </p>
                    <p className="text-[12px] text-muted-foreground/30 mt-1">
                      Arraste arquivos ou clique aqui
                    </p>
                  </button>
                )}

                {/* File rows */}
                {!docsLoading && empresaDocs.length > 0 && empresaDocs.map((doc, i) => (
                  <FileRow
                    key={doc.id}
                    doc={doc}
                    onOpen={() => openDoc(doc)}
                    onDownload={() => downloadDoc(doc)}
                    onDelete={() => deleteDoc(doc)}
                    last={i === empresaDocs.length - 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION — OBRAS
          ══════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-8">
        <p className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-[0.5px] mb-3 px-1">
          Documentação por Obra
        </p>

        {obras.length === 0 && !docsLoading && (
          <div className={cn(cardCn, 'flex flex-col items-center py-10')}>
            <Building2 className="h-10 w-10 text-muted-foreground/15" strokeWidth={1.5} />
            <p className="text-[14px] text-muted-foreground/40 mt-3">Nenhuma obra cadastrada</p>
          </div>
        )}

        <div className="space-y-3">
          {obras.map((obra, obraIdx) => {
            const docs = obraDocs[obra.id] || []
            const expanded = expandedObras.has(obra.id)
            const hovering = dragOver === obra.id
            const statusColor = STATUS_COLORS[obra.status] || '#8E8E93'

            return (
              <motion.div
                key={obra.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: obraIdx * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
                className={cn(cardCn, 'relative')}
                onDragEnter={(e) => onDragEnter(e, obra.id)}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, obra.id, obra.nome)}
              >
                {/* Drag overlay */}
                <AnimatePresence>
                  {hovering && <DropZoneOverlay label={`Soltar em ${obra.nome}`} color="#FF9500" />}
                </AnimatePresence>

                {/* Obra header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.015] transition-colors"
                  onClick={() => toggleObra(obra.id)}
                >
                  {/* Obra icon with status indicator */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#FF9500]/12 to-[#FF9500]/4">
                      <Building2 className="h-[22px] w-[22px] text-[#FF9500]" strokeWidth={1.5} />
                    </div>
                    {/* Status dot */}
                    <span
                      className="absolute -bottom-[2px] -right-[2px] h-[10px] w-[10px] rounded-full border-2 border-white dark:border-[#1C1C1E]"
                      style={{ backgroundColor: statusColor }}
                    />
                  </div>

                  {/* Obra info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold leading-tight truncate tracking-[-0.1px]">
                      {obra.nome}
                    </h3>
                    <p className="text-[12px] text-muted-foreground/50 mt-[2px] truncate">
                      {obra.endereco}
                    </p>
                  </div>

                  {/* Right side: count + upload + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {docs.length > 0 && (
                      <span className="text-[12px] text-muted-foreground/40 tabular-nums font-medium">
                        {docs.length}
                      </span>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => { e.stopPropagation(); openUpload(obra.id, obra.nome) }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9500]/10 hover:bg-[#FF9500]/16 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-[#FF9500]" strokeWidth={2.5} />
                    </motion.button>

                    <motion.div
                      animate={{ rotate: expanded ? 90 : 0 }}
                      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                      className="flex h-5 w-5 items-center justify-center"
                    >
                      <ChevronRight className="h-[14px] w-[14px] text-muted-foreground/30" />
                    </motion.div>
                  </div>
                </div>

                {/* Expanded body */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="h-px bg-border/8 dark:bg-white/[0.04]" />

                      {docs.length === 0 ? (
                        <button
                          onClick={() => openUpload(obra.id, obra.nome)}
                          className="w-full flex flex-col items-center py-7 group/empty"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF9500]/[0.05] group-hover/empty:bg-[#FF9500]/[0.08] transition-colors">
                            <Upload className="h-5 w-5 text-[#FF9500]/40 group-hover/empty:text-[#FF9500]/60 transition-colors" strokeWidth={1.5} />
                          </div>
                          <p className="text-[13px] text-muted-foreground/40 mt-3 group-hover/empty:text-muted-foreground/60 transition-colors">
                            Enviar documento para esta obra
                          </p>
                        </button>
                      ) : (
                        docs.map((doc, i) => (
                          <FileRow
                            key={doc.id}
                            doc={doc}
                            onOpen={() => openDoc(doc)}
                            onDownload={() => downloadDoc(doc)}
                            onDelete={() => deleteDoc(doc)}
                            last={i === docs.length - 1}
                          />
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          UPLOAD MODAL (iOS Sheet)
          ══════════════════════════════════════════════════════ */}
      <Dialog open={uploadModalOpen} onOpenChange={(o) => { setUploadModalOpen(o); if (!o) setUploadError(null) }}>
        <DialogContent className={modalCn}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setUploadModalOpen(false)} className="text-[16px] text-[#007AFF]">
                Cancelar
              </button>
              <DialogTitle className="text-[16px] font-semibold">Enviar</DialogTitle>
              <button
                onClick={handleUpload}
                disabled={!uploadFiles.length || uploading}
                className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30"
              >
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {/* Error */}
            <AnimatePresence>
              {uploadError && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
                {uploadTarget
                  ? <Building2 className="h-4 w-4 text-[#FF9500]" />
                  : <Landmark className="h-4 w-4 text-[#007AFF]" />}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground/45 uppercase tracking-wider font-semibold leading-tight">
                  Destino
                </p>
                <p className="text-[14px] font-medium leading-tight mt-[1px]">{uploadTargetLabel}</p>
              </div>
            </div>

            {/* Files */}
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              {uploadFiles.length === 0 ? (
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2.5 py-8 px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF]/8">
                    <Upload className="h-6 w-6 text-[#007AFF]" />
                  </div>
                  <p className="text-[14px] font-medium">Selecionar arquivos</p>
                  <p className="text-[12px] text-muted-foreground/40">PDF, imagens, planilhas e mais</p>
                </button>
              ) : (
                <>
                  {uploadFiles.map((file, i) => {
                    const Icon = getFileIcon(file.type); const color = getFileColor(file.type)
                    return (
                      <div key={i} className={cn('flex items-center gap-3 px-4 py-2.5', i > 0 && 'border-t border-border/8 dark:border-white/[0.04]')}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] flex-shrink-0" style={{ backgroundColor: `${color}0D` }}>
                          <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{file.name}</p>
                          <p className="text-[11px] text-muted-foreground/50">{fmtSize(file.size)}</p>
                        </div>
                        <button onClick={() => setUploadFiles(uploadFiles.filter((_, j) => j !== i))} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-[#007AFF] font-medium border-t border-border/8 dark:border-white/[0.04]">
                    <Plus className="h-3.5 w-3.5" /> Mais arquivos
                  </button>
                </>
              )}
            </div>

            {/* Descrição */}
            <div>
              <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
                Descrição
              </p>
              <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                <input
                  type="text" value={uploadDescricao} onChange={(e) => setUploadDescricao(e.target.value)}
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
                    onClick={() => setUploadCategoriaId(null)}
                    className={cn('w-full flex items-center justify-between px-4 py-3 text-[15px]', !uploadCategoriaId && 'text-[#007AFF] font-medium')}
                  >
                    Nenhuma
                    {!uploadCategoriaId && <Check className="h-4 w-4 text-[#007AFF]" />}
                  </button>
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setUploadCategoriaId(c.id)}
                      className={cn('w-full flex items-center justify-between px-4 py-3 text-[15px] border-t border-border/8 dark:border-white/[0.04]', uploadCategoriaId === c.id && 'font-medium')}
                      style={uploadCategoriaId === c.id ? { color: c.cor } : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </div>
                      {uploadCategoriaId === c.id && <Check className="h-4 w-4" style={{ color: c.cor }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          CATEGORY MODAL (iOS Sheet)
          ══════════════════════════════════════════════════════ */}
      <Dialog open={categoryModalOpen} onOpenChange={(o) => { setCategoryModalOpen(o); if (!o) { setEditCategory(null); setCatNome(''); setCatCor('#007AFF') } }}>
        <DialogContent className={modalCn}>
          <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setCategoryModalOpen(false)} className="text-[16px] text-[#007AFF]">
                {editCategory ? 'Cancelar' : 'Fechar'}
              </button>
              <DialogTitle className="text-[16px] font-semibold">
                {editCategory ? 'Editar' : 'Categorias'}
              </DialogTitle>
              {editCategory ? (
                <button onClick={saveCategory} disabled={!catNome.trim()} className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30">
                  Salvar
                </button>
              ) : <div className="w-[52px]" />}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {editCategory ? (
              <>
                <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                  <input type="text" value={catNome} onChange={(e) => setCatNome(e.target.value)} placeholder="Nome" className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25" autoFocus />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">Cor</p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] p-4">
                    <div className="flex flex-wrap gap-3">
                      {CATEGORY_COLORS.map((c) => (
                        <button key={c} onClick={() => setCatCor(c)} className={cn('h-8 w-8 rounded-full transition-all', catCor === c ? 'ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E]' : 'hover:scale-110')} style={{ backgroundColor: c }}>
                          {catCor === c && <Check className="h-4 w-4 text-white mx-auto" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteCategory(editCategory.id)} className="w-full h-12 rounded-[14px] text-[#FF3B30] text-[15px] font-medium bg-white dark:bg-white/[0.07]">
                  Excluir Categoria
                </button>
                <button onClick={() => { setEditCategory(null); setCatNome(''); setCatCor('#007AFF') }} className="w-full py-2 text-[14px] text-[#007AFF]">
                  ← Voltar
                </button>
              </>
            ) : (
              <>
                {/* List */}
                {categorias.length > 0 && (
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                    {categorias.map((c, i) => (
                      <div key={c.id} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border/8 dark:border-white/[0.04]')}>
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.cor }} />
                        <span className="text-[15px] flex-1">{c.nome}</span>
                        <span className="text-[13px] text-muted-foreground/40 tabular-nums mr-2">{catCounts[c.id] || 0}</span>
                        <button onClick={() => { setEditCategory(c); setCatNome(c.nome); setCatCor(c.cor) }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add new */}
                <div>
                  <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">Nova</p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                    <input type="text" value={catNome} onChange={(e) => setCatNome(e.target.value)} placeholder="Nome da categoria" className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25" />
                  </div>
                  <div className="mt-3 rounded-[14px] bg-white dark:bg-white/[0.07] p-3">
                    <div className="flex flex-wrap gap-2.5">
                      {CATEGORY_COLORS.map((c) => (
                        <button key={c} onClick={() => setCatCor(c)} className={cn('h-7 w-7 rounded-full transition-all', catCor === c ? 'ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E]' : 'hover:scale-110')} style={{ backgroundColor: c }}>
                          {catCor === c && <Check className="h-3.5 w-3.5 text-white mx-auto" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={saveCategory}
                    disabled={!catNome.trim()}
                    className="w-full mt-3 h-11 rounded-[14px] bg-[#007AFF] text-white text-[15px] font-semibold disabled:opacity-30 transition-opacity"
                  >
                    Criar
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
