import { useBodyScrollLock, useOverlayPresence } from '@/hooks/use-body-scroll-lock'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { iosSheetDialogCn } from './dialog-styles'

/* ═══════════════════════════════════════════════════════════
   Apple System Design Tokens
   ═══════════════════════════════════════════════════════════ */

export const modalCn = iosSheetDialogCn

export const cardCn =
  'rounded-2xl bg-white dark:bg-white/[0.05] border border-border/15 dark:border-white/[0.06] overflow-hidden'

export const CATEGORY_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#00C7BE',
  '#FF6482',
  '#30B0C7',
]

export const STATUS_COLORS: Record<string, string> = {
  ATIVA: '#34C759',
  FINALIZADA: '#8E8E93',
  PAUSADA: '#FF9500',
  VENDIDO: '#5856D6',
  TERRENO: '#AF52DE',
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

/** Derives a display label for a MIME type or file name extension. */
export function getFileTypeLabel(mime: string, fileName?: string): string {
  const ext = fileName?.split('.').pop()?.toUpperCase() ?? ''
  if (mime.startsWith('image/')) return ext || 'Imagem'
  if (mime.startsWith('video/')) return ext || 'Vídeo'
  if (mime.startsWith('audio/')) return ext || 'Áudio'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('acad') || mime.includes('dxf') || ext === 'DWG' || ext === 'DXF')
    return ext || 'CAD'
  if (mime.includes('x-step') || ext === 'IFC' || ext === 'STP' || ext === 'STEP')
    return ext || 'BIM'
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
    return ext || 'Planilha'
  if (mime.includes('wordprocessing') || mime.includes('msword')) return ext || 'Word'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return ext || 'PPTX'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z'))
    return ext || 'Arquivo'
  if (mime.includes('text/') || mime.includes('xml') || mime.includes('json')) return ext || 'Texto'
  if (mime.includes('model/') || ext === 'STL' || ext === 'OBJ') return ext || 'Modelo 3D'
  return ext || 'Arquivo'
}

export function getFileIcon(mime: string, fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('pdf')) return FileText
  // CAD / BIM / 3D
  if (
    mime.includes('acad') ||
    mime.includes('dxf') ||
    mime.includes('x-step') ||
    mime.includes('model/') ||
    [
      'dwg',
      'dxf',
      'rvt',
      'rfa',
      'ifc',
      'skp',
      'nwd',
      'nwc',
      '3ds',
      'obj',
      'stl',
      'step',
      'stp',
      'iges',
      'igs',
    ].includes(ext)
  )
    return FileCode
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ext === 'csv'
  )
    return FileSpreadsheet
  if (mime.includes('wordprocessing') || mime.includes('msword')) return FileText
  if (mime.includes('presentation') || mime.includes('powerpoint')) return FileText
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z'))
    return FileArchive
  if (mime.startsWith('text/') || mime.includes('xml') || mime.includes('json')) return FileText
  return File
}

export function getFileColor(mime: string, fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return '#FF9500'
  if (mime.startsWith('video/')) return '#AF52DE'
  if (mime.startsWith('audio/')) return '#FF2D55'
  if (mime.includes('pdf')) return '#FF3B30'
  // CAD / BIM / 3D — orange-brown, industry standard association
  if (
    mime.includes('acad') ||
    mime.includes('dxf') ||
    mime.includes('x-step') ||
    mime.includes('model/') ||
    [
      'dwg',
      'dxf',
      'rvt',
      'rfa',
      'ifc',
      'skp',
      'nwd',
      'nwc',
      '3ds',
      'obj',
      'stl',
      'step',
      'stp',
      'iges',
      'igs',
    ].includes(ext)
  )
    return '#FF6B35'
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ext === 'csv'
  )
    return '#34C759'
  if (mime.includes('wordprocessing') || mime.includes('msword')) return '#2979FF'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '#FF6B35'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z'))
    return '#8E8E93'
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) return '#30B0C7'
  return '#007AFF'
}

export function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const s = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(i > 0 ? 1 : 0)} ${s[i]}`
}

/* ═══════════════════════════════════════════════════════════
   ContextMenu / ActionSheet — dual-mode, Apple platform-native
   ═══════════════════════════════════════════════════════════ */

export interface SheetAction {
  label: string
  icon: React.ElementType
  iconColor?: string
  destructive?: boolean
  onClick: () => void | Promise<void>
}

export function ContextMenu({
  open,
  onClose,
  actions,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  actions: SheetAction[]
  anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const a = actionsRef.current
    const r = anchorRef.current.getBoundingClientRect()
    const W = 176
    const H = a.length * 34 + (a.some((x) => x.destructive) ? 12 : 0) + 10
    const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8))
    const showAbove = r.bottom + H + 8 > window.innerHeight
    const top = showAbove ? r.top - H - 6 : r.bottom + 6
    setPos({ top, left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open])

  if (typeof document === 'undefined') return null

  const main = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[300] w-full h-full cursor-default"
            onClick={onClose}
            tabIndex={-1}
            aria-label="Fechar menu"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'fixed z-[310] w-[176px] rounded-[11px] overflow-hidden',
              'bg-white dark:bg-[#2C2C2E]',
              'border border-black/[0.08] dark:border-white/[0.1]',
              'shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.10),0_20px_48px_rgba(0,0,0,0.06)]',
              'dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.45)]',
            )}
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-[5px]">
              {main.map((action) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={async () => {
                    onClose()
                    await action.onClick()
                  }}
                  className="group/item w-full flex items-center gap-[9px] px-[9px] h-[33px] rounded-[6px] text-[13px] leading-none text-left transition-colors hover:bg-[#007AFF]"
                >
                  <action.icon
                    className="h-[15px] w-[15px] flex-shrink-0 transition-colors group-hover/item:!text-white"
                    strokeWidth={1.7}
                    style={{ color: action.iconColor ?? '#007AFF' }}
                  />
                  <span
                    className="transition-colors group-hover/item:!text-white"
                    style={{ color: action.iconColor ?? '#007AFF' }}
                  >
                    {action.label}
                  </span>
                </button>
              ))}

              {destructive.length > 0 && (
                <>
                  <div className="h-px bg-black/[0.07] dark:bg-white/[0.07] mx-0 my-[5px]" />
                  {destructive.map((action) => (
                    <button
                      type="button"
                      key={action.label}
                      onClick={async () => {
                        onClose()
                        await action.onClick()
                      }}
                      className="group/itemd w-full flex items-center gap-[9px] px-[9px] h-[33px] rounded-[6px] text-[13px] text-[#FF3B30] leading-none text-left transition-colors hover:bg-[#FF3B30]"
                    >
                      <Trash2
                        className="h-[15px] w-[15px] flex-shrink-0 text-[#FF3B30] transition-colors group-hover/itemd:!text-white"
                        strokeWidth={1.7}
                      />
                      <span className="transition-colors group-hover/itemd:!text-white">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ActionSheet({
  open,
  onClose,
  title,
  subtitle,
  actions,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  actions: SheetAction[]
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useBodyScrollLock(open)
  useOverlayPresence(open)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open])

  if (typeof document === 'undefined') return null

  const main = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[300] bg-black"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.85 }}
            className="fixed bottom-0 left-0 right-0 z-[310] px-3 select-none"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            <div className="rounded-[16px] overflow-hidden bg-[#F2F2F7]/[0.97] dark:bg-[#2C2C2E]/[0.97] backdrop-blur-3xl mb-[10px] shadow-2xl shadow-black/20">
              <div className="px-5 pt-[14px] pb-[13px] text-center border-b border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-[13px] font-semibold text-foreground/70 leading-tight line-clamp-2 px-2">
                  {title}
                </p>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground/45 mt-[3px] truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {main.map((action, i) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={async () => {
                    onClose()
                    await action.onClick()
                  }}
                  className={cn(
                    'w-full flex items-center gap-[18px] px-5 transition-colors text-left active:bg-black/[0.06] dark:active:bg-white/[0.06]',
                    i > 0 && 'border-t border-black/[0.06] dark:border-white/[0.06]',
                  )}
                  style={{ minHeight: 57 }}
                >
                  <action.icon
                    className="h-[22px] w-[22px] flex-shrink-0"
                    strokeWidth={1.55}
                    style={{ color: action.iconColor ?? '#007AFF' }}
                  />
                  <span
                    className="text-[17px] leading-tight"
                    style={{ color: action.iconColor ?? '#007AFF' }}
                  >
                    {action.label}
                  </span>
                </button>
              ))}
              {destructive.map((action) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={async () => {
                    onClose()
                    await action.onClick()
                  }}
                  className="w-full flex items-center gap-[18px] px-5 border-t border-black/[0.06] dark:border-white/[0.06] transition-colors text-left active:bg-[#FF3B30]/[0.05]"
                  style={{ minHeight: 57 }}
                >
                  <Trash2
                    className="h-[22px] w-[22px] flex-shrink-0 text-[#FF3B30]"
                    strokeWidth={1.55}
                  />
                  <span className="text-[17px] text-[#FF3B30] leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-[16px] bg-[#F2F2F7]/[0.97] dark:bg-[#2C2C2E]/[0.97] backdrop-blur-3xl text-[17px] font-bold text-[#007AFF] transition-colors active:bg-black/[0.06] dark:active:bg-white/[0.06] shadow-xl shadow-black/10"
              style={{ minHeight: 57 }}
            >
              Cancelar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
