import { formatBRL } from '@/components/ui/currency-input'
import { useToast } from '@/components/ui/toast'
import { useUpdateObra } from '@/hooks/use-supabase'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { ArrowDownRight, Building2, DollarSign, FileText, Landmark, Package } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import type { CompraRecente, MaterialEstoque, ObraCustos } from './obra-detail'
import { Empty } from './obra-detail'

interface ChartTipProps {
  active?: boolean
  payload?: Array<{ payload: { categoria?: string; mes?: string; valor: number } }>
}

function ChartTip({ active, payload }: ChartTipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[13px] font-medium mb-1">{data.categoria || data.mes}</p>
        <p className="text-[14px] font-bold tabular-nums">{formatCurrency(data.valor)}</p>
      </div>
    )
  }
  return null
}

const parseCurrency = (str: string) => {
  if (!str) return 0
  return Number(str.replace(/[^\d,]/g, '').replace(',', '.'))
}

export function EvolucaoAreaChart({ tendenciaDados }: { tendenciaDados?: unknown }) {
  const t = (Array.isArray(tendenciaDados) ? tendenciaDados : []) as Array<{
    mes: string
    valor: number
  }>
  if (t.length === 0) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
        <ArrowDownRight className="h-6 w-6 opacity-30" />
        <span className="text-[13px] font-medium">Sem movimentações registradas</span>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={t} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#007AFF" stopOpacity={0.28} />
            <stop offset="55%" stopColor="#007AFF" stopOpacity={0.07} />
            <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
          </linearGradient>
          <filter id="chartGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <XAxis
          dataKey="mes"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
          width={50}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <RechartsTooltip content={<ChartTip />} />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="#007AFF"
          strokeWidth={2.5}
          fill="url(#costGrad)"
          style={{ filter: 'drop-shadow(0 1px 6px rgba(0,122,255,0.35))' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function TerrenoEditableRow({ obraId, custos }: { obraId: string; custos: ObraCustos }) {
  const { toast } = useToast()
  const updateOrcamento = useUpdateObra()
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    const val = parseCurrency(inputVal)
    if (val >= 0) {
      updateOrcamento.mutate(
        { id: obraId, valor_terreno: val },
        {
          onSuccess: () => setEditing(false),
          onError: () => {
            setEditing(false)
            toast({ title: 'Erro ao salvar valor do terreno', variant: 'error' })
          },
        },
      )
    } else setEditing(false)
  }

  return (
    <div className="flex justify-between items-center text-[13px] md:text-[14px]">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Landmark className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#AF52DE' }} />
        Terreno
      </span>
      {editing ? (
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          className="text-[13px] font-semibold tabular-nums bg-transparent border-b border-primary outline-none w-32 text-right"
          value={inputVal}
          onChange={(e) => setInputVal(formatBRL(e.target.value))}
          onFocus={(e) => e.target.select()}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button
          type="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = custos.valorTerreno ?? 0
              setInputVal(v > 0 ? formatBRL(String(v).replace('.', ',')) : '')
              setEditing(true)
              setTimeout(() => ref.current?.focus(), 50)
            }
          }}
          className="font-semibold tabular-nums cursor-pointer hover:text-primary transition-colors text-left"
          style={{ color: (custos.valorTerreno ?? 0) > 0 ? '#AF52DE' : undefined }}
          onClick={() => {
            const v = custos.valorTerreno ?? 0
            setInputVal(v > 0 ? formatBRL(String(v).replace('.', ',')) : '')
            setEditing(true)
            setTimeout(() => ref.current?.focus(), 50)
          }}
          title="Clique para editar"
        >
          {formatCurrency(custos.valorTerreno ?? 0)}
        </button>
      )}
    </div>
  )
}

export function ObraDetailCustosTab({
  obraId,
  custos,
  investimentoCategoria,
  comprasRecentes,
  materiaisEstoque,
  materiaisEstoqueTotal,
}: {
  obraId: string
  custos?: ObraCustos
  investimentoCategoria: Array<{ categoria: string; valor: number; color: string }>
  comprasRecentes: CompraRecente[]
  materiaisEstoque: MaterialEstoque[]
  materiaisEstoqueTotal: number
}) {
  const [evolRange, setEvolRange] = useState<'1M' | '3M' | '6M' | 'all'>('6M')

  const evolDados = useMemo(() => {
    const t = (Array.isArray(custos?.tendencia) ? custos.tendencia : []) as Array<{
      mes: string
      valor: number
    }>
    if (evolRange === 'all') return t
    const months = evolRange === '1M' ? 1 : evolRange === '3M' ? 3 : 6
    return t.slice(-months)
  }, [custos?.tendencia, evolRange])

  if (!custos)
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border bg-card p-5 space-y-4 animate-pulse">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="flex items-center gap-6">
              <div className="h-28 w-28 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-4 animate-pulse">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-28 w-full rounded bg-muted" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-[200px] w-full rounded bg-muted" />
        </div>
      </div>
    )

  return (
    <div className="space-y-8">
      {/* Row 1: Budget gauge + Category ring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Budget card with editable categories */}
        <div className="rounded-2xl border bg-card p-5 md:p-7">
          <h3 className="text-[15px] md:text-[17px] font-semibold mb-4">Orçamento</h3>
          <div className="flex items-center gap-6">
            {/* Ring */}
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 120 120" className="h-28 w-28">
                <title>Orçamento da Obra</title>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop
                      offset="0%"
                      stopColor={
                        custos.percentual > 90
                          ? '#FF6B6B'
                          : custos.percentual > 70
                            ? '#FFB340'
                            : '#30D158'
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        custos.percentual > 90
                          ? '#FF3B30'
                          : custos.percentual > 70
                            ? '#FF9500'
                            : '#34C759'
                      }
                    />
                  </linearGradient>
                  <filter id="ringGlow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(120,120,128,0.16)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(custos.percentual / 100, 1) * 327} 327`}
                  transform="rotate(-90 60 60)"
                  filter="url(#ringGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {custos.percentual}%
                </span>
              </div>
            </div>
            {/* Values */}
            <div className="space-y-2.5 md:space-y-3 flex-1 min-w-0">
              <div className="flex justify-between items-center text-[13px] md:text-[14px]">
                <span className="text-muted-foreground">Orçamento</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(custos.orcamento)}
                </span>
              </div>
              {/* Terreno — click to edit */}
              <TerrenoEditableRow obraId={obraId} custos={custos} />

              {/* Burocracia — read only */}
              <div className="flex justify-between items-center text-[13px] md:text-[14px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
                  Burocracia
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: (custos.valorBurocracia ?? 0) > 0 ? '#007AFF' : undefined }}
                >
                  {formatCurrency(custos.valorBurocracia ?? 0)}
                </span>
              </div>

              {/* Construção — read only */}
              <div className="flex justify-between items-center text-[13px] md:text-[14px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF9500' }} />
                  Construção
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: (custos.valorConstrucao ?? 0) > 0 ? '#FF9500' : undefined }}
                >
                  {formatCurrency(custos.valorConstrucao ?? 0)}
                </span>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-border/50 flex justify-between items-center text-[14px] md:text-[15px]">
                <span className="font-semibold flex-shrink-0">Custo Atual</span>
                <span className="font-bold tabular-nums ml-2 text-right">
                  {formatCurrency(custos.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invested pie card */}
        <div className="rounded-2xl border bg-card p-5 md:p-7">
          <h3 className="text-[15px] md:text-[17px] font-semibold mb-4">Investimento</h3>
          {investimentoCategoria.length === 0 ? (
            <div className="h-[112px] flex flex-col items-center justify-center text-muted-foreground/50 gap-1.5">
              <DollarSign className="h-6 w-6 opacity-30" />
              <span className="text-[13px] font-medium">Nenhum custo registrado</span>
              <span className="text-[11px]">Registre entradas ou lançamentos</span>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={112} height={112}>
                <PieChart>
                  <Pie
                    data={investimentoCategoria}
                    dataKey="valor"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={52}
                    paddingAngle={3}
                    strokeWidth={0}
                    cornerRadius={3}
                  >
                    {investimentoCategoria.map((cat) => (
                      <Cell key={cat.categoria} fill={cat.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5 ml-2">
                {investimentoCategoria.map((cat) => {
                  const totalPie = investimentoCategoria.reduce((sum, c) => sum + c.valor, 0)
                  const pct = totalPie > 0 ? Math.round((cat.valor / totalPie) * 100) : 0
                  return (
                    <div key={cat.categoria} className="flex items-center text-[12px] gap-2">
                      <span
                        className="h-[8px] w-[8px] rounded-full flex-shrink-0"
                        style={{ background: cat.color }}
                      />
                      <span className="text-muted-foreground truncate flex-1">{cat.categoria}</span>
                      <span className="tabular-nums font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Spending trend */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold">Evolução Mensal</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">gastos acumulados</p>
          </div>
          <div className="flex gap-1">
            {(['1M', '3M', '6M', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setEvolRange(r)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-all',
                  evolRange === r
                    ? 'text-white'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-accent',
                )}
                style={
                  evolRange === r
                    ? {
                        background: 'linear-gradient(135deg, #0A84FF, #007AFF)',
                        boxShadow: '0 2px 8px rgba(0,122,255,0.35)',
                      }
                    : undefined
                }
              >
                {r === 'all' ? 'Tudo' : r}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[200px]">
          <EvolucaoAreaChart tendenciaDados={evolDados} />
        </div>
      </div>

      {/* Row 3: Purchase transactions */}
      <div>
        <h3 className="text-[15px] md:text-[17px] font-semibold mb-3">Compras Recentes</h3>
        {comprasRecentes.length === 0 ? (
          <Empty
            icon={DollarSign}
            text="Nenhuma compra registrada"
            sub="Entradas de material aparecerão aqui com seus custos."
          />
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <ul className="divide-y divide-border/50">
              {comprasRecentes.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3.5 px-5 py-3.5 md:px-6 md:py-4">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] flex-shrink-0"
                    style={{ backgroundColor: '#34C75914' }}
                  >
                    <ArrowDownRight className="h-[15px] w-[15px]" style={{ color: '#34C759' }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] md:text-[14px] font-medium line-clamp-2">
                      {tx.material}
                    </p>
                    <p className="text-[11px] md:text-[12px] text-muted-foreground">
                      {tx.quantidade} × {formatCurrency(tx.preco_unitario)} · {tx.almoxarifado}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] md:text-[14px] font-semibold tabular-nums">
                      {formatCurrency(tx.total)}
                    </p>
                    <p className="text-[11px] md:text-[12px] text-muted-foreground tabular-nums">
                      {formatDate(tx.data)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Row 4: Material detail */}
      <div>
        <h3 className="text-[15px] md:text-[17px] font-semibold mb-3">Materiais em Estoque</h3>
        {materiaisEstoque.length === 0 ? (
          <Empty icon={Package} text="Sem materiais" sub="Adicione materiais ao estoque." />
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <ul className="divide-y divide-border/50">
              {materiaisEstoque.map((item) => (
                <li key={item.id} className="flex items-center gap-3.5 px-5 py-3.5 md:px-6 md:py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] md:text-[14px] font-medium line-clamp-2">
                      {item.material}
                    </p>
                    <p className="text-[11px] md:text-[12px] text-muted-foreground">
                      {formatNumber(item.quantidade)} {item.unidade} ×{' '}
                      {formatCurrency(item.preco_unitario)} · {item.almoxarifado}
                    </p>
                  </div>
                  <p className="text-[13px] md:text-[14px] font-semibold tabular-nums flex-shrink-0">
                    {formatCurrency(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center px-5 py-3 md:px-6 md:py-4 border-t bg-muted/30">
              <span className="text-[13px] md:text-[14px] font-semibold">Total</span>
              <span className="text-[15px] md:text-[17px] font-bold tabular-nums">
                {formatCurrency(materiaisEstoqueTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
