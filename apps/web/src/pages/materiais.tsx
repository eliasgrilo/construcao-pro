import { useMateriais } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, Search, Tag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CategoriasTab } from './categorias-tab'
import { MateriaisTab } from './materiais-tab'

type TabType = 'materiais' | 'categorias'

/* ════════════════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════════════════ */

export function MateriaisPage() {
  const [activeTab, setActiveTab] = useState<TabType>('materiais')
  const [globalSearch, setGlobalSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // '/' focuses search; Escape clears it when focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable)
        return
      if (e.key === '/' && activeTab === 'materiais') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activeTab])

  const { data: materiaisData = [] } = useMateriais()
  const totalMateriais = materiaisData.length

  return (
    <div className="min-h-screen pb-24 relative">
      {/* ── Hero Header ── */}
      <div className="px-4 md:px-8 pt-10 pb-0">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(0,122,255,0.10)' }}
              >
                <Package className="h-5 w-5" style={{ color: '#007AFF' }} />
              </div>
              <div>
                <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight leading-none">
                  Materiais
                </h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {totalMateriais > 0
                    ? `${totalMateriais} material${totalMateriais !== 1 ? 'is' : ''} cadastrado${totalMateriais !== 1 ? 's' : ''}`
                    : 'Catálogo de materiais e categorias'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Search bar ── */}
        {activeTab === 'materiais' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="relative mb-5"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setGlobalSearch('')
                  searchInputRef.current?.blur()
                }
              }}
              placeholder="Buscar materiais por nome, código ou categoria..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/60 transition-all duration-200"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </motion.div>
        )}

        {/* ── Apple Segmented Control ── */}
        <div className="inline-flex rounded-xl bg-muted/60 p-[3px] w-full sm:w-auto mb-1">
          {(['materiais', 'categorias'] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 sm:flex-none relative rounded-[10px] px-5 py-[7px] text-[14px] sm:text-[13px] font-medium transition-all duration-200 select-none',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm shadow-black/10 dark:shadow-black/30'
                  : 'text-muted-foreground hover:text-foreground/80',
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab === 'materiais' ? (
                  <Package className="h-[15px] w-[15px]" />
                ) : (
                  <Tag className="h-[15px] w-[15px]" />
                )}
                {tab === 'materiais' ? 'Materiais' : 'Categorias'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'materiais' ? (
          <motion.div
            key="materiais"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <MateriaisTab searchQuery={globalSearch} onClearSearch={() => setGlobalSearch('')} />
          </motion.div>
        ) : (
          <motion.div
            key="categorias"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <CategoriasTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
