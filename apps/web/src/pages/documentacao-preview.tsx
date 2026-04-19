import {
  ZoomableImageViewer,
  type ZoomableImageViewerHandle,
} from '@/components/ZoomableImageViewer'
import { ZoomablePdfViewer, type ZoomablePdfViewerHandle } from '@/components/ZoomablePdfViewer'
import { useToast } from '@/components/ui/toast'
import { useBodyScrollLock, useOverlayPresence } from '@/hooks/use-body-scroll-lock'
import type { Documento } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Share,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtSize, getFileColor, getFileIcon } from './documentacao-utils'

/* ═══════════════════════════════════════════════════════════
   FilePreviewModal — iOS Quick Look style in-app preview
   ═══════════════════════════════════════════════════════════ */

export function FilePreviewModal({
  doc,
  url,
  loading,
  onClose,
  onDownload,
  onDelete,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  canDelete = false,
}: {
  doc: Documento
  url: string | null
  loading: boolean
  onClose: () => void
  onDownload: () => void
  onDelete: () => Promise<void>
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
  canDelete?: boolean
}) {
  const { toast } = useToast()
  const isImage = doc.tipo_arquivo.startsWith('image/')
  const isPdf = doc.tipo_arquivo.includes('pdf')
  const isVideo = doc.tipo_arquivo.startsWith('video/')
  const isAudio = doc.tipo_arquivo.startsWith('audio/')
  const Icon = getFileIcon(doc.tipo_arquivo)
  const color = getFileColor(doc.tipo_arquivo)
  useBodyScrollLock(true)
  useOverlayPresence(true)

  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [deletePending, setDeletePending] = useState(false)
  const toolbarTimer = useRef<ReturnType<typeof setTimeout>>()
  const isMobileRef = useRef(
    typeof window !== 'undefined' ? window.matchMedia('(hover: none)').matches : false,
  )
  const imageViewerRef = useRef<ZoomableImageViewerHandle>(null)
  const pdfViewerRef = useRef<ZoomablePdfViewerHandle>(null)
  const allowToolbarAutoHide = isMobileRef.current && !isPdf
  const previewTouchAction = isImage ? 'none' : 'auto'
  /* Mobile: floating pill at bottom only, no top chrome → top inset small.
     Desktop: toolbar is in-flow at the bottom (takes flex), so inset is slim. */
  const topInset = isMobileRef.current ? 8 : 16
  const bottomInset = isMobileRef.current ? 84 : 8

  const resetToolbarTimer = useCallback(() => {
    setToolbarVisible(true)
    if (toolbarTimer.current) clearTimeout(toolbarTimer.current)
    if (allowToolbarAutoHide) {
      toolbarTimer.current = setTimeout(() => setToolbarVisible(false), 3000)
    }
  }, [allowToolbarAutoHide])

  useEffect(() => {
    resetToolbarTimer()
    return () => {
      if (toolbarTimer.current) clearTimeout(toolbarTimer.current)
    }
  }, [resetToolbarTimer])

  const handleContentTap = useCallback(
    (e: React.MouseEvent) => {
      if (!allowToolbarAutoHide) return
      if ((e.target as HTMLElement).closest('button')) return
      setToolbarVisible((v) => {
        if (!v) {
          if (toolbarTimer.current) clearTimeout(toolbarTimer.current)
          toolbarTimer.current = setTimeout(() => setToolbarVisible(false), 3000)
        }
        return !v
      })
    },
    [allowToolbarAutoHide],
  )

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onPrevRef = useRef(onPrev)
  onPrevRef.current = onPrev
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'ArrowLeft' && onPrevRef.current) onPrevRef.current()
      if (e.key === 'ArrowRight' && onNextRef.current) onNextRef.current()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const handleShare = async () => {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({ title: doc.nome, url })
      } catch {
        // ignore
      }
    } else {
      onDownload()
    }
  }

  const handleCopyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast({ variant: 'success', title: 'Link copiado' })
    } catch {
      // ignore
    }
  }

  const TOOLBAR_H = 60

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Pré-visualização: ${doc.nome}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        touchAction: previewTouchAction,
      }}
    >
      <div
        className="backdrop-blur-3xl"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.92)',
        }}
      />

      <div
        onClick={handleContentTap}
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          touchAction: previewTouchAction,
        }}
      >
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div className="h-9 w-9 rounded-full border-[2.5px] border-white/15 border-t-white/70 animate-spin" />
            <p className="text-[13px] text-white/35">Carregando...</p>
          </motion.div>
        )}

        {!loading && url && isImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <ZoomableImageViewer
              ref={imageViewerRef}
              src={url}
              alt={doc.nome}
              fitMargin={0.96}
              contentInsets={{ top: topInset, bottom: bottomInset }}
            />
          </motion.div>
        )}

        {!loading && url && isPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <ZoomablePdfViewer
              ref={pdfViewerRef}
              src={url}
              alt={doc.nome}
              contentInsets={{ top: topInset, bottom: bottomInset }}
            />
          </motion.div>
        )}

        {!loading && url && isVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <video
              src={url}
              controls
              playsInline
              style={{
                display: 'block',
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: `calc(100dvh - ${TOOLBAR_H + 32}px)`,
                borderRadius: '12px',
                backgroundColor: 'black',
              }}
            >
              <track kind="captions" srcLang="pt-BR" label="Português" />
            </video>
          </motion.div>
        )}

        {!loading && url && isAudio && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '28px',
              padding: '0 32px',
            }}
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-[32px] shadow-2xl shadow-black/60"
              style={{ backgroundColor: `${color}22`, border: `1.5px solid ${color}30` }}
            >
              <Icon className="h-12 w-12" style={{ color }} strokeWidth={1.25} />
            </div>
            <div className="text-center">
              <p className="text-[18px] font-semibold text-white tracking-[-0.2px]">{doc.nome}</p>
              <p className="text-[13px] text-white/35 mt-1">{fmtSize(doc.tamanho)}</p>
            </div>
            {/* biome-ignore lint/a11y/useMediaCaption: User uploaded external medias */}
            <audio src={url} controls className="w-full max-w-sm" />
          </motion.div>
        )}

        {!loading && url && !isImage && !isPdf && !isVideo && !isAudio && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-[32px] shadow-2xl shadow-black/60"
              style={{ backgroundColor: `${color}22`, border: `1.5px solid ${color}30` }}
            >
              <Icon className="h-12 w-12" style={{ color }} strokeWidth={1.25} />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white tracking-[-0.2px]">{doc.nome}</p>
              <p className="text-[13px] text-white/35 mt-1.5">{fmtSize(doc.tamanho)}</p>
              <p className="text-[12px] text-white/25 mt-1">Pré-visualização não disponível</p>
            </div>
          </motion.div>
        )}

        {!loading && !url && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-[32px] shadow-2xl shadow-black/60"
              style={{ backgroundColor: `${color}22`, border: `1.5px solid ${color}30` }}
            >
              <Icon className="h-12 w-12" style={{ color }} strokeWidth={1.25} />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white tracking-[-0.2px]">{doc.nome}</p>
              <p className="text-[13px] text-white/35 mt-1.5">{fmtSize(doc.tamanho)}</p>
              <p className="text-[12px] mt-2" style={{ color: '#FF453A' }}>
                Não foi possível carregar o arquivo
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={onClose}
              style={{
                borderRadius: '14px',
                padding: '10px 28px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: '#007AFF',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.1px',
              }}
            >
              Fechar
            </motion.button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {toolbarVisible && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: isMobileRef.current ? '-50%' : 0 }}
            animate={{ opacity: 1, y: 0, x: isMobileRef.current ? '-50%' : 0 }}
            exit={{ opacity: 0, y: 16, x: isMobileRef.current ? '-50%' : 0 }}
            transition={{ duration: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
            onPointerDown={resetToolbarTimer}
            style={{
              position: isMobileRef.current ? 'absolute' : 'relative',
              bottom: isMobileRef.current ? 'max(16px, env(safe-area-inset-bottom))' : undefined,
              left: isMobileRef.current ? '50%' : undefined,
              zIndex: 10,
              borderTop: isMobileRef.current ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: isMobileRef.current ? '28px' : undefined,
              border: isMobileRef.current ? '1px solid rgba(255,255,255,0.12)' : undefined,
              backgroundColor: isMobileRef.current ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              paddingBottom: isMobileRef.current
                ? undefined
                : 'max(8px, env(safe-area-inset-bottom))',
              flexShrink: 0,
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{
                padding: isMobileRef.current ? '4px 6px' : undefined,
                gap: isMobileRef.current ? '2px' : undefined,
              }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.82 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (deletePending) return
                  onPrev?.()
                  resetToolbarTimer()
                }}
                disabled={!hasPrev || deletePending}
                className={cn(
                  'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors disabled:opacity-35 flex-shrink-0',
                  isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                )}
                aria-label="Documento anterior"
              >
                <ChevronLeft className="h-[24px] w-[24px] text-[#007AFF]" strokeWidth={2.2} />
              </motion.button>

              <div
                className={cn(
                  'flex items-center',
                  isMobileRef.current ? 'gap-1' : 'gap-3 sm:gap-5 px-2 sm:px-4 py-2',
                )}
              >
                {canDelete && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.82 }}
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (deletePending) return
                      setDeletePending(true)
                      try {
                        await onDelete()
                        resetToolbarTimer()
                      } catch (error) {
                        toast({
                          variant: 'error',
                          title: 'Erro ao excluir arquivo',
                          description: error instanceof Error ? error.message : 'Tente novamente.',
                        })
                      } finally {
                        setDeletePending(false)
                      }
                    }}
                    disabled={deletePending}
                    className={cn(
                      'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors disabled:opacity-40',
                      isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                    )}
                    aria-label="Excluir"
                  >
                    {deletePending ? (
                      <div className="h-[20px] w-[20px] rounded-full border-2 border-white/20 border-t-[#FF453A] animate-spin" />
                    ) : (
                      <Trash2 className="h-[20px] w-[20px] text-[#FF453A]" strokeWidth={1.7} />
                    )}
                  </motion.button>
                )}

                {!isMobileRef.current && (isImage || isPdf) && (
                  <>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.82 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isImage) imageViewerRef.current?.zoomOut()
                        else pdfViewerRef.current?.zoomOut()
                        resetToolbarTimer()
                      }}
                      className="flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors h-11 w-11"
                      aria-label="Diminuir zoom"
                    >
                      <ZoomOut className="h-[20px] w-[20px] text-[#007AFF]" strokeWidth={1.7} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.82 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isImage) imageViewerRef.current?.zoomIn()
                        else pdfViewerRef.current?.zoomIn()
                        resetToolbarTimer()
                      }}
                      className="flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors h-11 w-11"
                      aria-label="Aumentar zoom"
                    >
                      <ZoomIn className="h-[20px] w-[20px] text-[#007AFF]" strokeWidth={1.7} />
                    </motion.button>
                  </>
                )}

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.82 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShare()
                    resetToolbarTimer()
                  }}
                  className={cn(
                    'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors',
                    isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                  )}
                  aria-label="Compartilhar"
                >
                  <Share className="h-[20px] w-[20px] text-[#007AFF]" strokeWidth={1.7} />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.82 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyLink()
                    resetToolbarTimer()
                  }}
                  className={cn(
                    'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors',
                    isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                  )}
                  aria-label="Copiar link"
                >
                  <Copy className="h-[20px] w-[20px] text-[#007AFF]" strokeWidth={1.7} />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.82 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload()
                    resetToolbarTimer()
                  }}
                  className={cn(
                    'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors',
                    isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                  )}
                  aria-label="Baixar"
                >
                  <Download className="h-[20px] w-[20px] text-[#007AFF]" strokeWidth={1.7} />
                </motion.button>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.82 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (deletePending) return
                  onNext?.()
                  resetToolbarTimer()
                }}
                disabled={!hasNext || deletePending}
                className={cn(
                  'flex items-center justify-center rounded-full hover:bg-white/[0.12] active:bg-white/[0.08] transition-colors disabled:opacity-35 flex-shrink-0',
                  isMobileRef.current ? 'h-10 w-10' : 'h-11 w-11',
                )}
                aria-label="Próximo documento"
              >
                <ChevronRight className="h-[24px] w-[24px] text-[#007AFF]" strokeWidth={2.2} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.06, duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={() => {
          if (deletePending) return
          onClose()
        }}
        disabled={deletePending}
        style={{
          position: 'absolute',
          zIndex: 50,
          top: 'max(10px, env(safe-area-inset-top))',
          left: '10px',
          display: 'flex',
          width: '44px',
          height: '44px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          cursor: deletePending ? 'progress' : 'pointer',
          WebkitBackdropFilter: 'blur(40px)',
          backdropFilter: 'blur(40px)',
        }}
        aria-label="Fechar pré-visualização"
      >
        <X className="h-[16px] w-[16px] text-white" strokeWidth={2.8} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'absolute',
          zIndex: 40,
          top: 'max(16px, env(safe-area-inset-top))',
          left: 0,
          right: 0,
          paddingLeft: '60px',
          paddingRight: '60px',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p className="text-[14px] font-semibold text-white/80 leading-tight truncate tracking-[-0.1px]">
          {doc.nome}
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
