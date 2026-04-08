import { Button } from '@/components/ui/button'
import type { MaterialRow } from '@/hooks/use-supabase'
import { accents } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Package, Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import { getUnidadeAbbr, itemVariants, listVariants } from './materiais-tab-constants'

type DeleteTarget = { id: string; nome: string }

type MateriaisTabContentProps = {
  canManageMateriais: boolean
  filteredMateriais: MaterialRow[]
  groupedMateriais: Record<string, MaterialRow[]>
  isLoading: boolean
  onClearSearch: () => void
  onDelete: (target: DeleteTarget) => void
  onEdit: (material: MaterialRow) => void
  onOpenCreate: () => void
  searchQuery: string
}

export function MateriaisTabContent({
  canManageMateriais,
  filteredMateriais,
  groupedMateriais,
  isLoading,
  onClearSearch,
  onDelete,
  onEdit,
  onOpenCreate,
  searchQuery,
}: MateriaisTabContentProps) {
  return (
    <>
      <div className="px-4 md:px-8 mt-5 mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-accent/40 px-3.5 py-2.5 text-[13px] text-muted-foreground flex-1 border border-border/40">
          <Package className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          <span>
            Cadastre materiais aqui. Para{' '}
            <strong className="text-foreground/80">entrada de estoque</strong> com preço e
            quantidade, use <strong className="text-foreground/80">Estoque → Nova Entrada</strong>.
          </span>
        </div>
        {canManageMateriais && (
          <Button onClick={onOpenCreate} size="sm" className="flex-shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Material</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}
      </div>

      <div className="px-4 md:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredMateriais.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ background: 'rgba(0,122,255,0.08)' }}
            >
              <Package className="h-7 w-7" style={{ color: '#007AFF' }} />
            </div>
            <p className="text-[17px] font-semibold">
              {searchQuery ? 'Nenhum resultado' : 'Nenhum material'}
            </p>
            <p className="text-[15px] text-muted-foreground mt-1 mb-6 max-w-xs">
              {searchQuery
                ? `Nada encontrado para "${searchQuery}"`
                : 'Cadastre materiais para organizar seu catálogo'}
            </p>
            {searchQuery ? (
              <Button variant="outline" onClick={onClearSearch} size="sm" className="gap-1.5">
                <X className="h-4 w-4" />
                Limpar busca
              </Button>
            ) : canManageMateriais ? (
              <Button onClick={onOpenCreate} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Cadastrar Material
              </Button>
            ) : null}
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={listVariants} className="space-y-5">
            {Object.entries(groupedMateriais).map(([catName, items], categoryIndex) => {
              const accent = accents[categoryIndex % accents.length]
              return (
                <motion.div key={catName} variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: accent.bg, color: accent.fg }}
                    >
                      <Tag className="h-3 w-3" />
                      {catName}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
                    {items.map((material) => {
                      const unidadeVal = material.unidade || material.categoria?.unidade || 'UN'
                      return (
                        <motion.div
                          key={material.id}
                          variants={itemVariants}
                          className="flex items-center gap-4 px-4 py-3.5 group hover:bg-accent/30 transition-colors duration-150"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span
                                className="font-semibold text-[14px] line-clamp-2"
                                title={material.nome}
                              >
                                {material.nome}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                                {material.codigo}
                              </span>
                              {(material.estoque_minimo ?? 0) > 0 && (
                                <>
                                  <span className="text-muted-foreground/30">·</span>
                                  <span className="text-[11px] text-muted-foreground/60">
                                    Mín: {material.estoque_minimo}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold font-mono"
                              style={{ background: accent.bg, color: accent.fg }}
                            >
                              {getUnidadeAbbr(unidadeVal)}
                            </span>
                            {canManageMateriais && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onEdit(material)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                                  aria-label="Editar material"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete({ id: material.id, nome: material.nome })}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                                  aria-label="Excluir material"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </>
  )
}
