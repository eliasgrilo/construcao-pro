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
  ChevronDown,
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  FolderPlus,
  Grid3X3,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const modalCn =
  'p-0 gap-0 border-0 dark:border dark:border-white/[0.07] sm:max-w-[390px] sm:rounded-[28px] bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col overflow-y-hidden'

const CATEGORY_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#00C7BE', '#FF6482', '#30B0C7',
]

const CATEGORY_ICONS = [
  'Folder', 'FileText', 'Building2', 'Tag', 'FileSpreadsheet',
  'FileImage', 'FileArchive', 'Receipt', 'Shield', 'Landmark',
]

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
    return FileArchive
  if (mimeType.includes('text') || mimeType.includes('document') || mimeType.includes('word'))
    return FileText
  return File
}

function getFileIconColor(mimeType: string) {
  if (mimeType.startsWith('image/')) return '#FF9500'
  if (mimeType.startsWith('video/')) return '#AF52DE'
  if (mimeType.startsWith('audio/')) return '#FF2D55'
  if (mimeType.includes('pdf')) return '#FF3B30'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return '#34C759'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '#8E8E93'
  return '#007AFF'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`
}

function getFileExtension(nome: string): string {
  const parts = nome.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : ''
}

// ═══════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════

export function DocumentacaoPage() {
  // ── Data hooks ──
  const { data: documentos = [], isLoading: docsLoading } = useDocumentos()
  const { data: categorias = [], isLoading: catsLoading } = useDocumentoCategorias()
  const { data: obras = [] } = useObras()
  const uploadMut = useUploadDocumento()
  const deleteMut = useDeleteDocumento()
  const getUrlMut = useDocumentoUrl()
  const createCatMut = useCreateDocumentoCategoria()
  const updateCatMut = useUpdateDocumentoCategoria()
  const deleteCatMut = useDeleteDocumentoCategoria()

  // ── UI state ──
  const [search, setSearch] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
  const [selectedObra, setSelectedObra] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<DocumentoCategoria | null>(null)
  const [docMenuOpen, setDocMenuOpen] = useState<string | null>(null)
  const [obraDropdownOpen, setObraDropdownOpen] = useState(false)

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCategoriaId, setUploadCategoriaId] = useState<string | null>(null)
  const [uploadObraId, setUploadObraId] = useState<string | null>(null)
  const [uploadDescricao, setUploadDescricao] = useState('')

  // Category form
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#007AFF')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // ── Filtered documents ──
  const filtered = useMemo(() => {
    let result = documentos
    if (selectedCategoria) {
      result = result.filter((d) => d.categoria_id === selectedCategoria)
    }
    if (selectedObra) {
      result = result.filter((d) => d.obra_id === selectedObra)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          d.nome.toLowerCase().includes(q) ||
          d.descricao?.toLowerCase().includes(q) ||
          d.tipo_arquivo.toLowerCase().includes(q),
      )
    }
    return result
  }, [documentos, selectedCategoria, selectedObra, search])

  // ── Category counts ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of documentos) {
      if (d.categoria_id) {
        counts[d.categoria_id] = (counts[d.categoria_id] || 0) + 1
      }
    }
    return counts
  }, [documentos])

  // ── Drag & Drop ──
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        setUploadFiles(files)
        setUploadModalOpen(true)
      }
    },
    [],
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadFiles(files)
      setUploadModalOpen(true)
    }
    // Reset so re-selecting the same file works
    e.target.value = ''
  }, [])

  // ── Upload handler ──
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of uploadFiles) {
        await uploadMut.mutateAsync({
          file,
          nome: file.name,
          descricao: uploadDescricao || undefined,
          categoria_id: uploadCategoriaId,
          obra_id: uploadObraId,
        })
      }
      // Reset
      setUploadFiles([])
      setUploadCategoriaId(null)
      setUploadObraId(null)
      setUploadDescricao('')
      setUploadModalOpen(false)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  // ── Download/Preview handler ──
  const handleOpenDoc = async (doc: Documento) => {
    try {
      const url = await getUrlMut.mutateAsync(doc.storage_path)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Failed to get URL:', err)
    }
  }

  const handleDownloadDoc = async (doc: Documento) => {
    try {
      const url = await getUrlMut.mutateAsync(doc.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nome
      a.click()
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  // ── Delete doc ──
  const handleDeleteDoc = async (doc: Documento) => {
    try {
      await deleteMut.mutateAsync({ id: doc.id, storagePath: doc.storage_path })
      setDocMenuOpen(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // ── Save category ──
  const handleSaveCategory = async () => {
    if (!catNome.trim()) return
    try {
      if (editCategory) {
        await updateCatMut.mutateAsync({
          id: editCategory.id,
          nome: catNome.trim(),
          cor: catCor,
        })
      } else {
        await createCatMut.mutateAsync({
          nome: catNome.trim(),
          cor: catCor,
        })
      }
      setCatNome('')
      setCatCor('#007AFF')
      setEditCategory(null)
      setCategoryModalOpen(false)
    } catch (err) {
      console.error('Category save failed:', err)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCatMut.mutateAsync(id)
      if (selectedCategoria === id) setSelectedCategoria(null)
      setCategoryModalOpen(false)
      setEditCategory(null)
    } catch (err) {
      console.error('Category delete failed:', err)
    }
  }

  const isLoading = docsLoading || catsLoading

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      className="pb-10 min-h-screen relative"
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#007AFF]/10">
                <Upload className="h-10 w-10 text-[#007AFF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-[20px] font-semibold">Solte os arquivos aqui</p>
                <p className="text-[14px] text-muted-foreground mt-1">
                  Seus documentos serão enviados automaticamente
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Header ── */}
      <div className="px-4 md:px-8 pt-10 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">
              Documentação
            </h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              {documentos.length === 0
                ? 'Gerencie todos os documentos da empresa e obras'
                : `${documentos.length} documento${documentos.length !== 1 ? 's' : ''} arquivado${documentos.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0066D6] transition-colors flex-shrink-0"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Enviar</span>
          </motion.button>
        </div>
      </div>

      {/* ── Search & View Toggle ── */}
      <div className="px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border-0 text-[14px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
            />
          </div>
          <div className="flex rounded-xl bg-black/[0.03] dark:bg-white/[0.06] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-[10px] transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-white/15 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-[10px] transition-all',
                viewMode === 'list'
                  ? 'bg-white dark:bg-white/15 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="px-4 md:px-8 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedCategoria(null)
              setSelectedObra(null)
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0',
              !selectedCategoria && !selectedObra
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
            )}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Todos
          </motion.button>

          {/* Category pills */}
          {categorias.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedCategoria(selectedCategoria === cat.id ? null : cat.id)
                setSelectedObra(null)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0',
                selectedCategoria === cat.id
                  ? 'text-white shadow-sm'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
              )}
              style={
                selectedCategoria === cat.id
                  ? { backgroundColor: cat.cor }
                  : undefined
              }
            >
              <Tag className="h-3.5 w-3.5" />
              {cat.nome}
              {categoryCounts[cat.id] ? (
                <span className={cn(
                  'text-[11px] px-1.5 rounded-full',
                  selectedCategoria === cat.id
                    ? 'bg-white/25'
                    : 'bg-black/[0.06] dark:bg-white/[0.08]',
                )}>
                  {categoryCounts[cat.id]}
                </span>
              ) : null}
            </motion.button>
          ))}

          {/* Manage categories */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditCategory(null)
              setCatNome('')
              setCatCor('#007AFF')
              setCategoryModalOpen(true)
            }}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#007AFF] bg-[#007AFF]/8 hover:bg-[#007AFF]/12 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Categoria
          </motion.button>

          {/* Divider */}
          {obras.length > 0 && (
            <div className="h-5 w-px bg-border/50 flex-shrink-0 mx-0.5" />
          )}

          {/* Obra filter dropdown */}
          {obras.length > 0 && (
            <div className="relative flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setObraDropdownOpen(!obraDropdownOpen)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all whitespace-nowrap',
                  selectedObra
                    ? 'bg-[#FF9500] text-white shadow-sm'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                {selectedObra
                  ? obras.find((o) => o.id === selectedObra)?.nome || 'Obra'
                  : 'Obra'}
                <ChevronDown className="h-3 w-3" />
              </motion.button>

              <AnimatePresence>
                {obraDropdownOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setObraDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-2xl bg-white dark:bg-[#2C2C2E] border border-border/30 shadow-xl overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setSelectedObra(null)
                          setObraDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                          !selectedObra && 'text-[#007AFF] font-medium',
                        )}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Todas as obras
                        {!selectedObra && <Check className="h-4 w-4 ml-auto" />}
                      </button>
                      <div className="h-px bg-border/30" />
                      {obras.map((obra) => (
                        <button
                          key={obra.id}
                          onClick={() => {
                            setSelectedObra(obra.id)
                            setSelectedCategoria(null)
                            setObraDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                            selectedObra === obra.id && 'text-[#FF9500] font-medium',
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                          <span className="truncate">{obra.nome}</span>
                          {selectedObra === obra.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 md:px-8">
        {/* Loading skeletons */}
        {isLoading && (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
              : 'space-y-2',
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'animate-pulse rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]',
                  viewMode === 'grid' ? 'aspect-[4/5] p-4' : 'h-16 px-4',
                )}
              >
                <div className={cn(
                  'rounded-xl bg-muted/50',
                  viewMode === 'grid' ? 'h-12 w-12 mb-3' : 'h-8 w-8',
                )} />
                <div className="rounded bg-muted/40 h-3 w-3/4 mt-2" />
                <div className="rounded bg-muted/30 h-2.5 w-1/2 mt-1.5" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-black/[0.03] dark:bg-white/[0.04]">
              <FolderOpen className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-semibold mt-5">
              {search || selectedCategoria || selectedObra
                ? 'Nenhum documento encontrado'
                : 'Nenhum documento ainda'}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 text-center max-w-[280px]">
              {search || selectedCategoria || selectedObra
                ? 'Tente ajustar os filtros ou buscar por outro termo'
                : 'Arraste arquivos para cá ou clique em Enviar para começar'}
            </p>
            {!search && !selectedCategoria && !selectedObra && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 mt-6 rounded-full bg-[#007AFF] px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0066D6] transition-colors"
              >
                <Upload className="h-4 w-4" />
                Enviar Documentos
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Grid View */}
        {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {filtered.map((doc, i) => {
              const Icon = getFileIcon(doc.tipo_arquivo)
              const color = getFileIconColor(doc.tipo_arquivo)
              const ext = getFileExtension(doc.nome)
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="group relative rounded-2xl bg-white dark:bg-white/[0.05] border border-border/20 dark:border-white/[0.06] overflow-hidden hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-none hover:border-border/40 transition-all cursor-pointer"
                  onClick={() => handleOpenDoc(doc)}
                >
                  {/* File thumbnail area */}
                  <div className="aspect-[4/3] flex flex-col items-center justify-center bg-black/[0.015] dark:bg-white/[0.02] relative">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${color}12` }}
                    >
                      <Icon className="h-7 w-7" style={{ color }} strokeWidth={1.5} />
                    </div>
                    {ext && (
                      <span
                        className="mt-2 text-[10px] font-bold tracking-wider rounded-md px-2 py-0.5"
                        style={{ color, backgroundColor: `${color}10` }}
                      >
                        {ext}
                      </span>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 shadow-sm backdrop-blur-sm"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Context menu */}
                    <AnimatePresence>
                      {docMenuOpen === doc.id && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDocMenuOpen(null)
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-10 right-2 z-50 w-44 rounded-xl bg-white dark:bg-[#2C2C2E] border border-border/30 shadow-xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                handleOpenDoc(doc)
                                setDocMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                            >
                              <Eye className="h-4 w-4 text-[#007AFF]" />
                              Visualizar
                            </button>
                            <button
                              onClick={() => {
                                handleDownloadDoc(doc)
                                setDocMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                            >
                              <Download className="h-4 w-4 text-[#34C759]" />
                              Baixar
                            </button>
                            <div className="h-px bg-border/30 mx-2" />
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/6 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* File info */}
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium truncate leading-tight">
                      {doc.nome}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {doc.documento_categorias && (
                        <span
                          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: doc.documento_categorias.cor }}
                        />
                      )}
                      <span className="text-[11px] text-muted-foreground truncate">
                        {formatFileSize(doc.tamanho)} · {formatDateShort(doc.created_at)}
                      </span>
                    </div>
                    {doc.obras && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3 text-[#FF9500]" />
                        <span className="text-[11px] text-[#FF9500] truncate font-medium">
                          {doc.obras.nome}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* List View */}
        {!isLoading && filtered.length > 0 && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/20 dark:border-white/[0.06] overflow-hidden"
          >
            {filtered.map((doc, i) => {
              const Icon = getFileIcon(doc.tipo_arquivo)
              const color = getFileIconColor(doc.tipo_arquivo)
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer',
                    i > 0 && 'border-t border-border/10 dark:border-white/[0.04]',
                  )}
                  onClick={() => handleOpenDoc(doc)}
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: `${color}12` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} strokeWidth={1.5} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{doc.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.documento_categorias && (
                        <div className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: doc.documento_categorias.cor }}
                          />
                          <span className="text-[12px] text-muted-foreground">
                            {doc.documento_categorias.nome}
                          </span>
                        </div>
                      )}
                      {doc.obras && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-[#FF9500]" />
                          <span className="text-[12px] text-[#FF9500] font-medium">
                            {doc.obras.nome}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-[12px] text-muted-foreground">
                      {formatFileSize(doc.tamanho)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {formatDateShort(doc.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadDoc(doc)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDoc(doc)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#FF3B30]/8 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-[#FF3B30]" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          UPLOAD MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className={modalCn}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-[16px] text-[#007AFF]"
              >
                Cancelar
              </button>
              <DialogTitle className="text-[16px] font-semibold">
                Enviar Documentos
              </DialogTitle>
              <button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || uploading}
                className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/40"
              >
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[env(safe-area-inset-bottom)] pb-5">
            {/* Files preview */}
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              {uploadFiles.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 py-8 px-4"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007AFF]/10">
                    <Upload className="h-6 w-6 text-[#007AFF]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-medium">Selecionar arquivos</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      PDF, imagens, planilhas e mais
                    </p>
                  </div>
                </button>
              ) : (
                <>
                  {uploadFiles.map((file, i) => {
                    const Icon = getFileIcon(file.type)
                    const color = getFileIconColor(file.type)
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3',
                          i > 0 && 'border-t border-border/10 dark:border-white/[0.04]',
                        )}
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                          style={{ backgroundColor: `${color}12` }}
                        >
                          <Icon className="h-4.5 w-4.5" style={{ color }} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate">{file.name}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setUploadFiles(uploadFiles.filter((_, idx) => idx !== i))
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] text-[#007AFF] font-medium border-t border-border/10 dark:border-white/[0.04]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Mais arquivos
                  </button>
                </>
              )}
            </div>

            {/* Descrição */}
            <div className="mt-4">
              <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium px-4 mb-1.5">
                Descrição (opcional)
              </p>
              <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                <input
                  type="text"
                  value={uploadDescricao}
                  onChange={(e) => setUploadDescricao(e.target.value)}
                  placeholder="Adicionar uma descrição..."
                  className="w-full px-4 py-3 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            {/* Categoria */}
            <div className="mt-4">
              <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium px-4 mb-1.5">
                Categoria
              </p>
              <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                <button
                  onClick={() => setUploadCategoriaId(null)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-[15px] transition-colors',
                    !uploadCategoriaId && 'text-[#007AFF] font-medium',
                  )}
                >
                  <span>Sem categoria</span>
                  {!uploadCategoriaId && <Check className="h-4.5 w-4.5 text-[#007AFF]" />}
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setUploadCategoriaId(cat.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-[15px] border-t border-border/10 dark:border-white/[0.04] transition-colors',
                      uploadCategoriaId === cat.id && 'font-medium',
                    )}
                    style={uploadCategoriaId === cat.id ? { color: cat.cor } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      {cat.nome}
                    </div>
                    {uploadCategoriaId === cat.id && (
                      <Check className="h-4.5 w-4.5" style={{ color: cat.cor }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Obra */}
            {obras.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium px-4 mb-1.5">
                  Obra (opcional)
                </p>
                <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                  <button
                    onClick={() => setUploadObraId(null)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-[15px] transition-colors',
                      !uploadObraId && 'text-[#007AFF] font-medium',
                    )}
                  >
                    <span>Documento geral</span>
                    {!uploadObraId && <Check className="h-4.5 w-4.5 text-[#007AFF]" />}
                  </button>
                  {obras.map((obra) => (
                    <button
                      key={obra.id}
                      onClick={() => setUploadObraId(obra.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-[15px] border-t border-border/10 dark:border-white/[0.04] transition-colors',
                        uploadObraId === obra.id && 'text-[#FF9500] font-medium',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {obra.nome}
                      </div>
                      {uploadObraId === obra.id && (
                        <Check className="h-4.5 w-4.5 text-[#FF9500]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          CATEGORY MODAL
          ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={categoryModalOpen}
        onOpenChange={(open) => {
          setCategoryModalOpen(open)
          if (!open) {
            setEditCategory(null)
            setCatNome('')
            setCatCor('#007AFF')
          }
        }}
      >
        <DialogContent className={modalCn}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-[16px] text-[#007AFF]"
              >
                Cancelar
              </button>
              <DialogTitle className="text-[16px] font-semibold">
                {editCategory ? 'Editar Categoria' : 'Categorias'}
              </DialogTitle>
              {editCategory ? (
                <button
                  onClick={handleSaveCategory}
                  disabled={!catNome.trim()}
                  className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/40"
                >
                  Salvar
                </button>
              ) : (
                <div className="w-[68px]" />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[env(safe-area-inset-bottom)] pb-5">
            {/* Show form when editing or creating */}
            {editCategory !== null || categorias.length === 0 ? (
              <>
                {/* Category name */}
                <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                  <input
                    type="text"
                    value={catNome}
                    onChange={(e) => setCatNome(e.target.value)}
                    placeholder="Nome da categoria"
                    className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/30"
                    autoFocus
                  />
                </div>

                {/* Color picker */}
                <div className="mt-4">
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium px-4 mb-1.5">
                    Cor
                  </p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] p-4">
                    <div className="flex flex-wrap gap-3">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCatCor(color)}
                          className={cn(
                            'h-8 w-8 rounded-full transition-all',
                            catCor === color
                              ? 'ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E]'
                              : 'hover:scale-110',
                          )}
                          style={{
                            backgroundColor: color,
                            ...(catCor === color ? { ringColor: color } : {}),
                          }}
                        >
                          {catCor === color && (
                            <Check className="h-4 w-4 text-white mx-auto" strokeWidth={3} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save button (for new category or if not in edit mode via list) */}
                {!editCategory && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveCategory}
                    disabled={!catNome.trim()}
                    className="w-full mt-4 h-12 rounded-[14px] bg-[#007AFF] text-white text-[16px] font-semibold disabled:opacity-40 transition-opacity"
                  >
                    Criar Categoria
                  </motion.button>
                )}

                {/* Delete option when editing */}
                {editCategory && (
                  <button
                    onClick={() => handleDeleteCategory(editCategory.id)}
                    className="w-full mt-4 h-12 rounded-[14px] text-[#FF3B30] text-[16px] font-medium bg-white dark:bg-white/[0.07]"
                  >
                    Excluir Categoria
                  </button>
                )}

                {/* Back to list */}
                {editCategory && (
                  <button
                    onClick={() => {
                      setEditCategory(null)
                      setCatNome('')
                      setCatCor('#007AFF')
                    }}
                    className="w-full mt-2 py-2 text-[14px] text-[#007AFF]"
                  >
                    ← Voltar para lista
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Category list */}
                <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                  {categorias.map((cat, i) => (
                    <div
                      key={cat.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        i > 0 && 'border-t border-border/10 dark:border-white/[0.04]',
                      )}
                    >
                      <span
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="text-[15px] flex-1">{cat.nome}</span>
                      <span className="text-[13px] text-muted-foreground mr-2">
                        {categoryCounts[cat.id] || 0}
                      </span>
                      <button
                        onClick={() => {
                          setEditCategory(cat)
                          setCatNome(cat.nome)
                          setCatCor(cat.cor)
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new category */}
                <div className="mt-4">
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium px-4 mb-1.5">
                    Nova Categoria
                  </p>
                  <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
                    <input
                      type="text"
                      value={catNome}
                      onChange={(e) => setCatNome(e.target.value)}
                      placeholder="Nome da categoria"
                      className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/30"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="rounded-[14px] bg-white dark:bg-white/[0.07] p-3">
                      <div className="flex flex-wrap gap-2.5">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setCatCor(color)}
                            className={cn(
                              'h-7 w-7 rounded-full transition-all',
                              catCor === color
                                ? 'ring-2 ring-offset-2 ring-offset-[#F2F2F7] dark:ring-offset-[#1C1C1E]'
                                : 'hover:scale-110',
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {catCor === color && (
                              <Check className="h-3.5 w-3.5 text-white mx-auto" strokeWidth={3} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveCategory}
                    disabled={!catNome.trim()}
                    className="w-full mt-3 h-11 rounded-[14px] bg-[#007AFF] text-white text-[15px] font-semibold disabled:opacity-40 transition-opacity"
                  >
                    Criar Categoria
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
