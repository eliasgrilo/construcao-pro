import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryError } from '@/components/ui/query-error'
import { usePermissions } from '@/hooks/use-permissions'
import { useDashboardCustoPorObra, useObras } from '@/hooks/use-supabase'
import type { ObraFilterStatus } from '@/lib/obra-route-search'
import { cn } from '@/lib/utils'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Plus } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { type CustoData, type ObraData, ObrasGrid, statusMap } from './obras-card'
import { ObraCreateDialog, ObraDeleteDialog } from './obras-dialogs'

export function ObrasPage() {
  const layoutIdPrefix = useId()
  const navigate = useNavigate()
  const routeSearch = useSearch({ from: '/obras' })
  const { canManageObras, allowedObraIds } = usePermissions()
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | ObraFilterStatus>(
    routeSearch.tab ?? 'ALL',
  )
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fromDashboard = routeSearch.from === 'dashboard'

  useEffect(() => {
    if (routeSearch.tab) {
      setFilterStatus(routeSearch.tab)
    }
  }, [routeSearch.tab])

  useEffect(() => {
    if (!routeSearch.tab && !routeSearch.from) return
    void navigate({ to: '/obras', search: {}, replace: true })
  }, [navigate, routeSearch.from, routeSearch.tab])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable)
        return
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const { data: obrasRaw, isLoading, isError, refetch } = useObras()
  const { data: custosData = [] } = useDashboardCustoPorObra()
  const obrasData = useMemo(() => {
    if (!obrasRaw) return obrasRaw
    if (!allowedObraIds) return obrasRaw
    const allowed = new Set(allowedObraIds)
    return obrasRaw.filter((o: ObraData) => allowed.has(o.id))
  }, [obrasRaw, allowedObraIds])

  const counts = {
    ALL: obrasData?.length ?? 0,
    ATIVA: obrasData?.filter((o: ObraData) => o.status === 'ATIVA').length ?? 0,
    PAUSADA: obrasData?.filter((o: ObraData) => o.status === 'PAUSADA').length ?? 0,
    FINALIZADA: obrasData?.filter((o: ObraData) => o.status === 'FINALIZADA').length ?? 0,
    VENDIDO: obrasData?.filter((o: ObraData) => o.status === 'VENDIDO').length ?? 0,
    TERRENO: obrasData?.filter((o: ObraData) => o.status === 'TERRENO').length ?? 0,
    MANUTENCAO: obrasData?.filter((o: ObraData) => o.status === 'MANUTENCAO').length ?? 0,
  }

  const obras = (obrasData || []).filter((o: ObraData) => {
    const matchesSearch =
      !search ||
      o.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.endereco?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const { obrasAtivas, obrasVendidas } = useMemo(() => {
    if (filterStatus !== 'ALL') return { obrasAtivas: obras, obrasVendidas: [] }
    return {
      obrasAtivas: obras.filter((o: ObraData) => o.status !== 'VENDIDO'),
      obrasVendidas: obras.filter((o: ObraData) => o.status === 'VENDIDO'),
    }
  }, [obras, filterStatus])

  const segments = [
    { key: 'ALL' as const, label: 'Todas', color: null },
    { key: 'TERRENO' as const, label: 'Terreno', color: '#AF52DE' },
    { key: 'ATIVA' as const, label: 'Ativa', color: '#34C759' },
    { key: 'PAUSADA' as const, label: 'Pausada', color: '#FF9500' },
    { key: 'MANUTENCAO' as const, label: 'Manutenção', color: '#FF9500' },
    { key: 'FINALIZADA' as const, label: 'Finalizada', color: '#8E8E93' },
    { key: 'VENDIDO' as const, label: 'Vendido', color: '#5856D6' },
  ]

  if (isError) {
    return (
      <div className="px-4 md:px-8 pt-10">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight mb-6">Obras</h1>
        <QueryError onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {fromDashboard && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-1 text-[15px] font-medium mb-2"
              style={{ color: '#007AFF' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </motion.button>
          )}
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Obras</h1>
          <p className="text-[15px] text-muted-foreground mt-0.5">
            {obras.length} obra{obras.length !== 1 ? 's' : ''}
            {filterStatus !== 'ALL' && (
              <span className="text-muted-foreground/60"> · {statusMap[filterStatus]?.label}</span>
            )}
          </p>
        </div>
        {canManageObras && (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Obra
          </Button>
        )}
      </div>

      {/* Filter + Search */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Segmented Control */}
        <div className="w-full overflow-x-auto scrollbar-hide px-4 md:px-8">
          <div
            role="radiogroup"
            aria-label="Filtrar obras por status"
            className="inline-flex items-center bg-muted rounded-[12px] p-1 gap-0.5 min-w-max"
          >
            {segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                role="radio"
                aria-checked={filterStatus === seg.key}
                aria-label={seg.label}
                onClick={() => setFilterStatus(seg.key)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-[9px] text-[13px] font-medium whitespace-nowrap"
              >
                {filterStatus === seg.key && (
                  <motion.div
                    layoutId={`${layoutIdPrefix}-filter-pill`}
                    className="absolute inset-0 rounded-[9px] bg-background shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    'relative flex items-center gap-1.5 transition-colors duration-150',
                    filterStatus === seg.key ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {seg.color && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                  )}
                  {seg.label}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={counts[seg.key]}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'text-[11px] tabular-nums',
                        filterStatus === seg.key
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/50',
                      )}
                    >
                      {counts[seg.key]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 md:px-8">
          <Input
            ref={searchInputRef}
            placeholder="Buscar obras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
                searchInputRef.current?.blur()
              }
            }}
            className="max-w-xs"
          />
        </div>
      </div>

      <ObrasGrid
        isLoading={isLoading}
        obras={obras}
        filterStatus={filterStatus}
        search={search}
        setFilterStatus={setFilterStatus}
        setSearch={setSearch}
        obrasAtivas={obrasAtivas}
        obrasVendidas={obrasVendidas}
        custosData={custosData as CustoData[]}
        navigate={navigate}
        setDeleteTarget={setDeleteTarget}
        setOpen={setOpen}
      />

      <ObraCreateDialog open={open} setOpen={setOpen} />
      <ObraDeleteDialog deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget} />
    </div>
  )
}
