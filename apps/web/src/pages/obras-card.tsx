/**
 * obras-card.tsx
 * ObraCardStats, ObraCardVenda, ObraCard, ObrasGrid extraídos de obras.tsx
 */
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { usePermissions } from '@/hooks/use-permissions'
import type { ObraRow } from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Banknote,
  Building2,
  ChevronRight,
  FileText,
  HardHat,
  Landmark,
  MapPin,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

/* ── Types ── */
export type ObraData = ObraRow

export interface CustoData {
  id: string
  custo: number
  percentual: number
  valor_burocracia: number
  valor_construcao: number
  valor_venda: number
}

/* ── Motion variants ── */
export const obraCardItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const

export const obraCardListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
} as const

/* ── Color helpers ── */
export function progressColor(p: number) {
  return p > 90 ? '#FF3B30' : p > 70 ? '#FF9500' : '#34C759'
}

/* ── ObraCardStats ── */
export function ObraCardStats({
  valorTerreno,
  valorBurocracia,
  valorConstrucao,
}: {
  valorTerreno: number
  valorBurocracia: number
  valorConstrucao: number
}) {
  return (
    <div className="mt-2.5 space-y-1.5">
      {[
        {
          label: 'Terreno',
          Icon: Landmark,
          color: '#AF52DE',
          value: valorTerreno,
          valueColor: valorTerreno > 0 ? '#AF52DE' : undefined,
        },
        {
          label: 'Burocracia',
          Icon: FileText,
          color: '#007AFF',
          value: valorBurocracia,
          valueColor: valorBurocracia > 0 ? '#007AFF' : undefined,
        },
        {
          label: 'Construção',
          Icon: Building2,
          color: '#FF9500',
          value: valorConstrucao,
          valueColor: valorConstrucao > 0 ? '#FF9500' : undefined,
        },
      ].map(({ label, Icon, color, value, valueColor }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md flex-shrink-0"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon className="h-3 w-3" style={{ color }} />
          </span>
          <span className="text-[12px] text-muted-foreground">{label}</span>
          <span
            className="text-[12px] font-semibold tabular-nums ml-auto"
            style={{ color: valueColor }}
          >
            {formatCurrency(value || 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── ObraCardVenda ── */
export function ObraCardVenda({
  valorVenda,
  lucro,
  isPositive,
  margem,
}: {
  valorVenda: number
  lucro: number
  isPositive: boolean
  margem: string
}) {
  return (
    <div className="mt-2 pt-2 border-t border-border/20 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0"
          style={{ backgroundColor: '#5856D618' }}
        >
          <Banknote className="h-3.5 w-3.5" style={{ color: '#5856D6' }} />
        </span>
        <span className="text-[13px] text-muted-foreground">Venda</span>
        <span
          className="text-[13px] font-semibold tabular-nums ml-auto"
          style={{ color: '#5856D6' }}
        >
          {formatCurrency(valorVenda)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0"
          style={{ backgroundColor: isPositive ? '#34C75918' : '#FF3B3018' }}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" style={{ color: '#34C759' }} />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" style={{ color: '#FF3B30' }} />
          )}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {isPositive ? 'Lucro' : 'Prejuízo'}
        </span>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums ml-auto',
            isPositive ? 'text-success' : 'text-destructive',
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(lucro)}
        </span>
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-border/20 mt-1">
        <span className="text-[13px] text-muted-foreground">Margem</span>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            isPositive ? 'text-success' : 'text-destructive',
          )}
        >
          {isPositive ? '+' : ''}
          {margem}%
        </span>
      </div>
    </div>
  )
}

/* ── statusMap — exported so ObrasPage can use it too ── */
export const statusMap: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'info'; color: string }
> = {
  ATIVA: { label: 'Ativa', variant: 'success', color: '#34C759' },
  FINALIZADA: { label: 'Finalizada', variant: 'secondary', color: '#8E8E93' },
  PAUSADA: { label: 'Pausada', variant: 'warning', color: '#FF9500' },
  VENDIDO: { label: 'Vendido', variant: 'info', color: '#5856D6' },
  TERRENO: { label: 'Terreno', variant: 'info', color: '#AF52DE' },
  MANUTENCAO: { label: 'Manutenção', variant: 'warning' as const, color: '#FF9500' },
}

/* ── ObraCard ── */
export function ObraCard({
  obra,
  custosData,
  canManageObras,
  onNavigate,
  onDelete,
  vendida = false,
}: {
  obra: ObraData
  custosData: CustoData[]
  canManageObras: boolean
  onNavigate: () => void
  onDelete: () => void
  vendida?: boolean
}) {
  const st = statusMap[obra.status] ?? statusMap.ATIVA
  const custos = custosData.find((c) => c.id === obra.id)
  const valorTerreno = obra.valor_terreno ?? 0
  const valorBurocracia = custos?.valor_burocracia ?? obra.valor_burocracia ?? 0
  const valorConstrucao = custos?.valor_construcao ?? obra.valor_construcao ?? 0
  const valorVenda = custos?.valor_venda ?? obra.valor_venda ?? 0
  const totalInvestido = valorTerreno + valorBurocracia + valorConstrucao
  const orcamento = obra.orcamento ?? 0
  const percentualOrcamento = orcamento > 0 ? Math.round((totalInvestido / orcamento) * 100) : 0
  const lucro = valorVenda - totalInvestido
  const isPositive = lucro >= 0
  const margem = totalInvestido > 0 ? ((lucro / totalInvestido) * 100).toFixed(1) : '0.0'

  return (
    <motion.div
      variants={obraCardItemVariants}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      aria-label={obra.nome}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate()}
      className="apple-card flex flex-col p-5 text-left cursor-pointer w-full"
    >
      {/* Status + Delete + Chevron */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[9px] w-[9px] rounded-full"
            style={{ backgroundColor: st.color }}
          />
          <span className="text-[13px] font-medium" style={{ color: st.color }}>
            {st.label}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {canManageObras && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              aria-label="Excluir obra"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-semibold leading-snug line-clamp-2">{obra.nome}</h3>

      {/* Address */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
        <span className="text-[13px] text-muted-foreground leading-snug truncate">
          {obra.endereco}
        </span>
      </div>

      {/* Investimento */}
      <ObraCardStats
        valorTerreno={valorTerreno}
        valorBurocracia={valorBurocracia}
        valorConstrucao={valorConstrucao}
      />

      {/* Venda + Lucro for VENDIDO */}
      {obra.status === 'VENDIDO' && valorVenda > 0 && (
        <ObraCardVenda
          valorVenda={valorVenda}
          lucro={lucro}
          isPositive={isPositive}
          margem={margem}
        />
      )}

      <div className="flex-1 min-h-4" />

      {/* Budget progress */}
      <div className="mt-4 pt-4 border-t border-border/15">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[15px] font-semibold tabular-nums">
            {formatCurrency(totalInvestido)}
          </span>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            de {formatCurrency(orcamento)}
          </span>
        </div>
        <div className="h-[5px] w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(percentualOrcamento, 100)}%`,
              backgroundColor: progressColor(percentualOrcamento),
            }}
          />
        </div>
        <p className="text-[12px] text-muted-foreground mt-1.5 tabular-nums">
          {percentualOrcamento}% do orçamento utilizado
        </p>
      </div>
    </motion.div>
  )
}

/* ── ObrasGrid ── */
export function ObrasGrid({
  isLoading,
  obras,
  filterStatus,
  search,
  setFilterStatus,
  setSearch,
  obrasAtivas,
  obrasVendidas,
  custosData,
  navigate,
  setDeleteTarget,
  setOpen,
}: {
  isLoading: boolean
  obras: ObraData[]
  filterStatus: string
  search: string
  setFilterStatus: (
    status: 'ALL' | 'ATIVA' | 'PAUSADA' | 'FINALIZADA' | 'VENDIDO' | 'TERRENO',
  ) => void
  setSearch: (s: string) => void
  obrasAtivas: ObraData[]
  obrasVendidas: ObraData[]
  custosData: CustoData[]
  navigate: (opts: { to: string; params?: { obraId: string } }) => void
  setDeleteTarget: (target: { id: string; nome: string } | null) => void
  setOpen: (v: boolean) => void
}) {
  const { canManageObras } = usePermissions()

  return (
    <div className="px-4 md:px-8 space-y-10">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={String(i)} className="rounded-2xl border bg-card p-6 animate-pulse space-y-4">
              <div className="h-5 w-40 bg-muted rounded-lg" />
              <div className="h-4 w-56 bg-muted rounded-lg" />
              <div className="flex gap-6 pt-2">
                <div className="h-8 w-12 bg-muted rounded" />
                <div className="h-8 w-12 bg-muted rounded" />
                <div className="h-8 w-12 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : obras.length === 0 ? (
        filterStatus !== 'ALL' || search ? (
          <div className="text-center py-20">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[17px] font-medium text-muted-foreground">Nenhuma obra encontrada</p>
            <button
              type="button"
              onClick={() => {
                setFilterStatus('ALL')
                setSearch('')
              }}
              className="text-[14px] text-primary mt-2 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <EmptyState
            icon={HardHat}
            title="Nenhuma obra cadastrada"
            description="Crie sua primeira obra para começar a gerenciar custos, materiais e equipes"
            action={{ label: '+ Nova obra', onClick: () => setOpen(true) }}
          />
        )
      ) : (
        <>
          {obrasAtivas.length > 0 && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={obraCardListVariants}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {obrasAtivas.map((obra: ObraData) => (
                <ObraCard
                  key={obra.id}
                  obra={obra}
                  custosData={custosData}
                  canManageObras={canManageObras}
                  onNavigate={() => navigate({ to: '/obras/$obraId', params: { obraId: obra.id } })}
                  onDelete={() => setDeleteTarget({ id: obra.id, nome: obra.nome })}
                />
              ))}
            </motion.div>
          )}

          {filterStatus === 'ALL' && obrasVendidas.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-5">
                Obras Vendidas
              </h3>
              <motion.div
                initial="hidden"
                animate="show"
                variants={obraCardListVariants}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                {obrasVendidas.map((obra: ObraData) => (
                  <ObraCard
                    key={obra.id}
                    obra={obra}
                    custosData={custosData}
                    canManageObras={canManageObras}
                    onNavigate={() =>
                      navigate({ to: '/obras/$obraId', params: { obraId: obra.id } })
                    }
                    onDelete={() => setDeleteTarget({ id: obra.id, nome: obra.nome })}
                    vendida
                  />
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
