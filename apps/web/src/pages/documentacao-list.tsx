import type { Documento, DocumentoCategoria } from '@/hooks/use-supabase'
import { cn, formatDateShort } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Download, Eye, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionSheet,
  ContextMenu,
  type SheetAction,
  fmtSize,
  getFileColor,
  getFileIcon,
} from './documentacao-utils'

/* ═══════════════════════════════════════════════════════════
   FileRow — linha de documento
   Desktop: hover revela ···, click → macOS ContextMenu
   Mobile:  ··· sempre visível, tap → iOS ActionSheet
   ═══════════════════════════════════════════════════════════ */

export const FileRow = memo(function FileRow({
  doc,
  onOpen,
  onDownload,
  onDelete,
  onPrefetch,
  last,
  canDelete = false,
}: {
  doc: Documento
  onOpen: () => Promise<void>
  onDownload: () => void
  onDelete: () => Promise<void>
  onPrefetch?: () => void
  last: boolean
  canDelete?: boolean
}) {
  const Icon = getFileIcon(doc.tipo_arquivo, doc.nome)
  const color = getFileColor(doc.tipo_arquivo, doc.nome)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [opening, setOpening] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const [isPointer, setIsPointer] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const fn = (e: MediaQueryListEvent) => setIsPointer(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // Prefetch URL on mount — use ref to avoid re-firing when parent re-renders
  // (inline `() => onPrefetch?.(doc)` creates a new function every render)
  const onPrefetchRef = useRef(onPrefetch)
  onPrefetchRef.current = onPrefetch
  useEffect(() => {
    onPrefetchRef.current?.()
  }, [])

  const handleOpen = useCallback(async () => {
    setOpening(true)
    try {
      await onOpen()
    } finally {
      setOpening(false)
    }
  }, [onOpen])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }, [onDelete])

  const actions = useMemo<SheetAction[]>(() => {
    const base: SheetAction[] = [
      { label: 'Visualizar', icon: Eye, iconColor: '#007AFF', onClick: handleOpen },
      { label: 'Baixar', icon: Download, iconColor: '#007AFF', onClick: onDownload },
    ]
    if (canDelete) {
      base.push({ label: 'Excluir', icon: Trash2, destructive: true, onClick: handleDelete })
    }
    return base
  }, [handleOpen, onDownload, handleDelete, canDelete])

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-3.5 pl-4 pr-2 cursor-pointer select-none transition-colors w-full text-left',
          'hover:bg-black/[0.02] dark:hover:bg-white/[0.025]',
          'active:bg-black/[0.04] dark:active:bg-white/[0.04]',
          deleting && 'opacity-35 pointer-events-none',
          !last && 'border-b border-border/8 dark:border-white/[0.04]',
        )}
        style={{ minHeight: 56 }}
        onMouseEnter={() => onPrefetch?.()}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        aria-busy={opening || deleting}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpen()
          }
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0"
          style={{ backgroundColor: `${color}12` }}
        >
          {deleting || opening ? (
            <div
              className="h-4 w-4 rounded-full border-2 animate-spin"
              style={{ borderColor: `${color}30`, borderTopColor: color }}
            />
          ) : (
            <Icon className="h-[19px] w-[19px]" style={{ color }} strokeWidth={1.5} />
          )}
        </div>

        <div className="flex-1 min-w-0 py-3.5">
          <p className="text-[14px] font-medium truncate leading-tight tracking-[-0.1px]">
            {doc.nome}
          </p>
          <div className="flex items-center gap-1.5 mt-[3px]">
            {doc.documento_categorias && (
              <span
                className="h-[5px] w-[5px] rounded-full flex-shrink-0"
                style={{ backgroundColor: doc.documento_categorias.cor }}
              />
            )}
            <span className="text-[12px] text-muted-foreground/50 truncate">
              {fmtSize(doc.tamanho)} · {formatDateShort(doc.created_at)}
            </span>
          </div>
        </div>

        <button
          type="button"
          ref={btnRef}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 transition-all',
            menuOpen
              ? 'opacity-100 bg-black/[0.05] dark:bg-white/[0.08] text-foreground/70'
              : cn(
                  'text-muted-foreground/40',
                  'opacity-0 group-hover:opacity-100',
                  '[@media(hover:none)]:opacity-100',
                  'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
                  'active:bg-black/[0.09] dark:active:bg-white/[0.09]',
                ),
          )}
          aria-label="Opções"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>

      {isPointer ? (
        <ContextMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          actions={actions}
          anchorRef={btnRef}
        />
      ) : (
        <ActionSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={doc.nome}
          subtitle={`${fmtSize(doc.tamanho)}${doc.documento_categorias ? ` · ${doc.documento_categorias.nome}` : ''}`}
          actions={actions}
        />
      )}
    </>
  )
})

/* ═══════════════════════════════════════════════════════════
   DropZoneOverlay — shown when dragging files over a card
   ═══════════════════════════════════════════════════════════ */

export function DropZoneOverlay({ label, color }: { label: string; color: string }) {
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
   GroupedFileList — Apple Files-style: files in category sections
   ═══════════════════════════════════════════════════════════ */

export function GroupedFileList({
  docs,
  categorias,
  onOpen,
  onDownload,
  onDelete,
  onPrefetch,
  canDelete = false,
}: {
  docs: Documento[]
  categorias: DocumentoCategoria[]
  onOpen: (doc: Documento) => Promise<void>
  onDownload: (doc: Documento) => void
  onDelete: (doc: Documento) => Promise<void>
  onPrefetch?: (doc: Documento) => void
  canDelete?: boolean
}) {
  const groups = useMemo(() => {
    const orderedCats = categorias.filter((c) => docs.some((d) => d.categoria_id === c.id))
    const result: { cat: DocumentoCategoria | null; docs: Documento[] }[] = []
    for (const cat of orderedCats) {
      const catDocs = docs.filter((d) => d.categoria_id === cat.id)
      if (catDocs.length) result.push({ cat, docs: catDocs })
    }
    const uncategorized = docs.filter((d) => !d.categoria_id)
    if (uncategorized.length) result.push({ cat: null, docs: uncategorized })
    return result
  }, [docs, categorias])

  const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0].cat !== null)

  return (
    <>
      {groups.map(({ cat, docs: groupDocs }, gi) => (
        <Fragment key={cat?.id ?? '__none__'}>
          {gi > 0 && !showHeaders && <div className="h-px bg-border/8 dark:bg-white/[0.04] mx-4" />}

          {showHeaders && (
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-[7px]',
                'bg-black/[0.018] dark:bg-white/[0.02]',
                gi > 0 && 'border-t border-border/8 dark:border-white/[0.04]',
              )}
            >
              {cat ? (
                <span
                  className="h-[7px] w-[7px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.cor }}
                />
              ) : (
                <span className="h-[7px] w-[7px] rounded-full flex-shrink-0 bg-muted-foreground/20" />
              )}
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.55px] text-muted-foreground/40 flex-1 truncate">
                {cat?.nome ?? 'Outros'}
              </span>
              <span className="text-[10.5px] text-muted-foreground/28 tabular-nums">
                {groupDocs.length}
              </span>
            </div>
          )}

          {groupDocs.map((doc, i) => (
            <MemoizedFileRowAdapter
              key={doc.id}
              doc={doc}
              onOpen={onOpen}
              onDownload={onDownload}
              onDelete={onDelete}
              onPrefetch={onPrefetch}
              last={i === groupDocs.length - 1}
              canDelete={canDelete}
            />
          ))}
        </Fragment>
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   MemoizedFileRowAdapter — bridges doc-level callbacks to FileRow
   Memoized to prevent re-renders when parent data refetches
   ═══════════════════════════════════════════════════════════ */

const MemoizedFileRowAdapter = memo(function MemoizedFileRowAdapter({
  doc,
  onOpen,
  onDownload,
  onDelete,
  onPrefetch,
  last,
  canDelete,
}: {
  doc: Documento
  onOpen: (doc: Documento) => Promise<void>
  onDownload: (doc: Documento) => void
  onDelete: (doc: Documento) => Promise<void>
  onPrefetch?: (doc: Documento) => void
  last: boolean
  canDelete: boolean
}) {
  // Stable refs — parent callbacks are useCallback-wrapped,
  // but we still use refs so inner callbacks never change identity
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const onDownloadRef = useRef(onDownload)
  onDownloadRef.current = onDownload
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const onPrefetchRef = useRef(onPrefetch)
  onPrefetchRef.current = onPrefetch

  const handleOpen = useCallback(() => onOpenRef.current(doc), [doc])
  const handleDownload = useCallback(() => onDownloadRef.current(doc), [doc])
  const handleDelete = useCallback(() => onDeleteRef.current(doc), [doc])
  const handlePrefetch = useCallback(() => onPrefetchRef.current?.(doc), [doc])

  return (
    <FileRow
      doc={doc}
      onOpen={handleOpen}
      onDownload={handleDownload}
      onDelete={handleDelete}
      onPrefetch={handlePrefetch}
      last={last}
      canDelete={canDelete}
    />
  )
})
