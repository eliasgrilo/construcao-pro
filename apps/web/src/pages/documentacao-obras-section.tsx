/**
 * documentacao-obras-section.tsx
 * Obras accordion list extracted from documentacao.tsx
 */
import type { Documento, DocumentoCategoria, ObraRow } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, ChevronRight, Plus, Upload } from 'lucide-react'
import { DropZoneOverlay, GroupedFileList } from './documentacao-list'
import { STATUS_COLORS, cardCn } from './documentacao-utils'

interface DocumentacaoObrasSectionProps {
  obras: ObraRow[]
  obraDocs: Record<string, Documento[]>
  expandedObras: Set<string>
  dragOver: string | null
  categorias: DocumentoCategoria[]
  docsLoading: boolean
  canManageDocumentos: boolean
  prefetchDoc?: (doc: Documento) => void
  openUpload: (obraId: string | null, label: string) => void
  openDoc: (doc: Documento) => Promise<void>
  downloadDoc: (doc: Documento) => Promise<void>
  deleteDoc: (doc: Documento) => Promise<void>
  onDragEnter: (e: React.DragEvent, id: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string | null, label: string) => void
  toggleObra: (id: string) => void
}

export function DocumentacaoObrasSection({
  obras,
  obraDocs,
  expandedObras,
  dragOver,
  categorias,
  docsLoading,
  canManageDocumentos,
  prefetchDoc,
  openUpload,
  openDoc,
  downloadDoc,
  deleteDoc,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  toggleObra,
}: DocumentacaoObrasSectionProps) {
  return (
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
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.015] transition-colors"
                onClick={() => toggleObra(obra.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleObra(obra.id)
                  }
                }}
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

                  {canManageDocumentos && (
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        openUpload(obra.id, obra.nome)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9500]/10 hover:bg-[#FF9500]/16 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-[#FF9500]" strokeWidth={2.5} />
                    </motion.button>
                  )}

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
                      canManageDocumentos ? (
                        <button
                          type="button"
                          onClick={() => openUpload(obra.id, obra.nome)}
                          className="w-full flex flex-col items-center py-7 group/empty"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF9500]/[0.05] group-hover/empty:bg-[#FF9500]/[0.08] transition-colors">
                            <Upload
                              className="h-5 w-5 text-[#FF9500]/40 group-hover/empty:text-[#FF9500]/60 transition-colors"
                              strokeWidth={1.5}
                            />
                          </div>
                          <p className="text-[13px] text-muted-foreground/40 mt-3 group-hover/empty:text-muted-foreground/60 transition-colors">
                            Enviar documento para esta obra
                          </p>
                        </button>
                      ) : null
                    ) : (
                      <GroupedFileList
                        docs={docs}
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
          )
        })}
      </div>
    </div>
  )
}
