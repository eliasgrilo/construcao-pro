import { Badge } from '@/components/ui/badge'
import type { MovimentacaoRow } from '@/hooks/use-supabase/catalogo'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronRight,
  Minus,
  Package,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Warehouse,
} from 'lucide-react'
import { getUnidadeForEstoque, isLowStock } from './obra-detail-state'
import type {
  Almoxarifado,
  BaixaTarget,
  DeleteEstoqueTarget,
  EstoqueItem,
} from './obra-detail-types'

const tipoConfig: Record<string, { label: string; icon: typeof ArrowLeftRight; tint: string }> = {
  ENTRADA: { label: 'Entrada', icon: ArrowDownRight, tint: '#34C759' },
  SAIDA: { label: 'Saída', icon: ArrowUpRight, tint: '#FF3B30' },
  TRANSFERENCIA: { label: 'Transferência', icon: ArrowLeftRight, tint: '#007AFF' },
}

const statusTransf: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }
> = {
  PENDENTE: { label: 'Pendente', variant: 'warning' },
  APROVADA_NIVEL_1: { label: 'Aprovada N1', variant: 'secondary' },
  APROVADA: { label: 'Aprovada', variant: 'success' },
  REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
}

function AlmoxarifadoItemIcon({ isLow }: { isLow: boolean }) {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0 transition-colors"
      style={{ backgroundColor: isLow ? '#FF3B3014' : '#007AFF0D' }}
    >
      {isLow ? (
        <AlertTriangle className="h-4 w-4" style={{ color: '#FF3B30' }} />
      ) : (
        <Package className="h-4 w-4" style={{ color: '#007AFF' }} />
      )}
    </span>
  )
}

function AlmoxarifadoItemTags({
  item,
  custoUn,
  total,
}: {
  item: EstoqueItem
  custoUn: number
  total: number
}) {
  return (
    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
      {item.material?.codigo && (
        <span className="text-[11px] text-muted-foreground font-mono">{item.material.codigo}</span>
      )}
      {item.material?.categoria?.nome && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/60 text-muted-foreground font-medium">
          {item.material.categoria.nome}
        </span>
      )}
      {custoUn > 0 && (
        <span className="sm:hidden text-[10px] text-muted-foreground/70 tabular-nums">
          {formatCurrency(custoUn)}/un · {formatCurrency(total)}
        </span>
      )}
    </div>
  )
}

export function Empty({
  icon: Icon,
  text,
  sub,
}: {
  icon: typeof Package
  text: string
  sub: string
}) {
  return (
    <div className="text-center py-16">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-[13px] font-medium text-muted-foreground">{text}</p>
      <p className="text-[12px] text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  )
}

export function ObraDetailAlmoxarifadoCard({
  a,
  estoque,
  setSelectedAlmox,
}: {
  a: Almoxarifado
  estoque: EstoqueItem[]
  setSelectedAlmox: (sel: { id: string; nome: string }) => void
}) {
  const aEstoque = estoque.filter((item) => item.almoxarifado?.id === a.id)
  const totalItems = aEstoque.length
  const totalQty = aEstoque.reduce((sum, item) => sum + (item.quantidade || 0), 0)
  const totalValue = aEstoque.reduce(
    (sum, item) => sum + (item.quantidade || 0) * (item.material?.preco_unitario || 0),
    0,
  )
  const lowStock = aEstoque.filter(isLowStock)
  const hasAlert = lowStock.length > 0

  return (
    <button
      type="button"
      onClick={() => setSelectedAlmox({ id: a.id, nome: a.nome })}
      className="group rounded-2xl border bg-card p-5 text-left transition-all duration-200 hover:shadow-md hover:border-border/80 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[12px] flex-shrink-0 transition-colors"
            style={{ backgroundColor: hasAlert ? '#FF3B3014' : '#007AFF14' }}
          >
            <Warehouse
              className="h-[18px] w-[18px]"
              style={{ color: hasAlert ? '#FF3B30' : '#007AFF' }}
            />
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-tight">{a.nome}</p>
            {a.obra?.nome && (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate max-w-[140px]">
                {a.obra.nome}
              </p>
            )}
            {a.responsavel && (
              <div className="flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{a.responsavel}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors mt-0.5 flex-shrink-0" />
      </div>

      <div className="mb-4">
        {hasAlert ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: '#FF3B3014', color: '#FF3B30' }}
          >
            <AlertTriangle className="h-3 w-3" />
            {lowStock.length} {lowStock.length === 1 ? 'item abaixo' : 'itens abaixo'} do mínimo
          </div>
        ) : totalItems > 0 ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: '#34C75914', color: '#34C759' }}
          >
            <Package className="h-3 w-3" />
            {totalItems} {totalItems === 1 ? 'item estocado' : 'itens estocados'}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium bg-muted/60 text-muted-foreground">
            <Package className="h-3 w-3" />
            Sem itens no estoque
          </div>
        )}
      </div>

      <div className="flex items-end justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[15px] font-semibold tabular-nums leading-none">{totalItems}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
              Itens
            </p>
          </div>
          <div>
            <p className="text-[15px] font-semibold tabular-nums leading-none">
              {formatNumber(totalQty)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
              Quantidade
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-semibold tabular-nums leading-none">
            {formatCurrency(totalValue)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
            Valor total
          </p>
        </div>
      </div>
    </button>
  )
}

export function ObraDetailAlmoxarifadoItem({
  e,
  setBaixaTarget,
  setMovTipo,
  setMovAlmoxId,
  setMovMaterialId,
  setMovDialog,
  setDeleteEstoqueTarget,
}: {
  e: EstoqueItem
  setBaixaTarget: (val: BaixaTarget) => void
  setMovTipo: (val: string) => void
  setMovAlmoxId: (id: string) => void
  setMovMaterialId: (id: string) => void
  setMovDialog: (val: boolean) => void
  setDeleteEstoqueTarget: (val: DeleteEstoqueTarget) => void
}) {
  const lowStock = isLowStock(e)
  const custoUn = e.material?.preco_unitario ?? 0
  const total = (e.quantidade ?? 0) * custoUn
  const unidade = getUnidadeForEstoque(e)

  const handleBaixa = () => {
    setBaixaTarget({
      materialId: e.material?.id ?? '',
      materialNome: e.material?.nome ?? '—',
      materialCodigo: e.material?.codigo ?? '',
      almoxarifadoId: e.almoxarifado?.id ?? '',
      almoxarifadoNome: e.almoxarifado?.nome ?? '',
      quantidadeDisponivel: e.quantidade ?? 0,
      unidade,
      precoUnitario: custoUn,
    })
  }

  const handleTransfer = () => {
    setMovTipo('TRANSFERENCIA')
    setMovAlmoxId(e.almoxarifado?.id ?? '')
    setMovMaterialId(e.material?.id ?? '')
    setMovDialog(true)
  }

  const handleDelete = () => {
    setDeleteEstoqueTarget({
      id: e.id,
      materialId: e.material?.id ?? '',
      materialNome: e.material?.nome ?? '—',
      almoxarifadoId: e.almoxarifado?.id ?? '',
      almoxarifadoNome: e.almoxarifado?.nome ?? '—',
      quantidade: e.quantidade ?? 0,
      unidade,
      precoUnitario: custoUn,
    })
  }

  return (
    <div
      className={cn(
        'group flex items-center rounded-xl border bg-card px-4 py-3 gap-3 transition-all hover:shadow-sm',
        lowStock ? 'border-destructive/30 bg-destructive/[0.03]' : 'hover:border-border/80',
      )}
    >
      <AlmoxarifadoItemIcon isLow={lowStock} />

      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-medium truncate leading-tight"
          title={e.material?.nome ?? '—'}
        >
          {e.material?.nome ?? '—'}
        </p>
        <AlmoxarifadoItemTags item={e} custoUn={custoUn} total={total} />
      </div>

      <div className="text-right flex-shrink-0 w-14">
        <p
          className={cn(
            'text-[14px] font-semibold tabular-nums leading-tight',
            lowStock && 'text-destructive',
          )}
        >
          {formatNumber(e.quantidade ?? 0)}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
          {unidade}
        </p>
      </div>

      <div className="text-right flex-shrink-0 w-20 hidden sm:block">
        <p className="text-[13px] tabular-nums text-muted-foreground leading-tight">
          {custoUn > 0 ? formatCurrency(custoUn) : '—'}
        </p>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
          /unidade
        </p>
      </div>

      <div className="text-right flex-shrink-0 w-20 hidden sm:block">
        <p className="text-[13px] font-semibold tabular-nums leading-tight">
          {formatCurrency(total)}
        </p>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">
          em estoque
        </p>
      </div>

      <div className="flex items-center flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
        <button
          type="button"
          onClick={handleBaixa}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground/50 hover:text-orange-500 hover:bg-orange-500/10 active:scale-90 transition-all"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleTransfer}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground/50 hover:text-[#007AFF] hover:bg-[#007AFF]/10 active:scale-90 transition-all"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function MovimentacaoTotalValue({
  total,
  priceColor,
  priceSignal,
}: {
  total: number
  priceColor: string
  priceSignal: string
}) {
  if (total <= 0) return null
  return (
    <p className={cn('text-[13px] font-semibold tabular-nums', priceColor)}>
      {priceSignal}
      {formatCurrency(total)}
    </p>
  )
}

export function ObraDetailMovimentacaoItem({ mov }: { mov: MovimentacaoRow }) {
  const config = tipoConfig[mov.tipo] ?? tipoConfig.ENTRADA
  const Icon = config.icon
  const status = mov.status_transferencia ? statusTransf[mov.status_transferencia] : null
  const precoUnit = mov.preco_unitario ?? 0
  const totalMov = mov.quantidade * precoUnit

  const isSaida = mov.tipo === 'SAIDA'
  const isTransf = mov.tipo === 'TRANSFERENCIA'
  const signal = isSaida ? '−' : isTransf ? '⇄' : '+'
  const priceSignal = isSaida ? '−' : '+'
  const priceColor = isSaida ? 'text-destructive' : 'text-success'
  const transfDestino =
    isTransf && mov.almoxarifado_destino ? ` → ${mov.almoxarifado_destino.nome}` : ''
  const movUsuario = mov.usuario?.nome ? ` · ${mov.usuario.nome}` : ''
  const movPreco = precoUnit > 0 ? ` · ${formatCurrency(precoUnit)}/un` : ''

  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
        style={{ backgroundColor: `${config.tint}14` }}
      >
        <Icon className="h-[15px] w-[15px]" style={{ color: config.tint }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium truncate">{mov.material?.nome ?? '—'}</p>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: config.tint }}>
            {signal}
            {formatNumber(mov.quantidade)}
          </span>
          {status && (
            <Badge variant={status.variant} className="text-[10px] py-0 h-[18px]">
              {status.label}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {config.label} · {mov.almoxarifado?.nome ?? '—'}
          {transfDestino}
          {movUsuario}
          {movPreco}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <MovimentacaoTotalValue
          total={totalMov}
          priceColor={priceColor}
          priceSignal={priceSignal}
        />
        <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(mov.created_at)}
        </p>
      </div>
    </li>
  )
}

export function ObraDetailVendaPreview({ vk, investido }: { vk: number; investido: number }) {
  const lucro = vk - investido
  const isPositivo = lucro >= 0
  const margem = investido > 0 ? ((lucro / investido) * 100).toFixed(1) : '0.0'

  return (
    <motion.div
      key="lucro"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isPositivo ? (
              <TrendingUp className="h-4 w-4" style={{ color: '#34C759' }} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{ color: '#FF3B30' }} />
            )}
            <span
              className="text-[13px] font-semibold"
              style={{ color: isPositivo ? '#34C759' : '#FF3B30' }}
            >
              {isPositivo ? 'Lucro' : 'Prejuízo'}
            </span>
          </div>
          <span
            className="text-[15px] font-bold tabular-nums"
            style={{ color: isPositivo ? '#34C759' : '#FF3B30' }}
          >
            {isPositivo ? '+' : '-'}
            {formatCurrency(Math.abs(lucro))}
          </span>
        </div>
        <div
          className="h-[4px] rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(60,60,67,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(Math.abs(Number(margem)), 100)}%`,
              backgroundColor: isPositivo ? '#34C759' : '#FF3B30',
            }}
          />
        </div>
        <p className="text-[11px] tabular-nums mt-1" style={{ color: '#8E8E93' }}>
          Margem:{' '}
          <span className="font-semibold" style={{ color: isPositivo ? '#34C759' : '#FF3B30' }}>
            {isPositivo ? '+' : ''}
            {margem}%
          </span>
        </p>
      </div>
    </motion.div>
  )
}
