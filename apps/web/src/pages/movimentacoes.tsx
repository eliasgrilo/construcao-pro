import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAllFinanceiroMovimentacoes, useMovimentacoes } from '@/hooks/use-supabase'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@tanstack/react-table'

const tipoConfig: Record<
  string,
  {
    label: string
    badge: 'success' | 'destructive' | 'info'
    icon: typeof ArrowLeftRight
    tint: string
  }
> = {
  ENTRADA: { label: 'Entrada', badge: 'success', icon: ArrowDownRight, tint: '#34C759' },
  SAIDA: { label: 'Saída', badge: 'destructive', icon: ArrowUpRight, tint: '#FF3B30' },
  TRANSFERENCIA: { label: 'Transferência', badge: 'info', icon: ArrowLeftRight, tint: '#007AFF' },
}

const statusAprovacao: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'warning' }
> = {
  APROVADA: { label: 'Aprovada', variant: 'success' },
  REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
  PENDENTE: { label: 'Pendente', variant: 'warning' },
}

export function MovimentacoesPage() {
  const { data: movsData, isLoading: isLoadingMovs } = useMovimentacoes()
  const { data: finMovsData, isLoading: isLoadingFin } = useAllFinanceiroMovimentacoes()
  const [search, setSearch] = useState('')

  const isLoading = isLoadingMovs || isLoadingFin

  const unifiedData = useMemo(() => {
    const sbData = movsData || []
    const financialMovs = (finMovsData || []).map((m: any) => ({
      id: m.id,
      tipo: m.tipo,
      material: { nome: m.motivo, codigo: 'FINANCEIRO' },
      quantidade: 1,
      preco_unitario: m.valor,
      almoxarifado: {
        nome: `Banco: ${m.financeiro_contas?.banco ?? ''}`,
        obra: { nome: m.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações' },
      },
      updated_at: m.created_at,
      created_at:
        m.created_at || (m.data ? new Date(m.data).toISOString() : new Date().toISOString()),
      isFinancial: true,
    }))
    return [...sbData, ...financialMovs].sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [movsData, finMovsData])

  const filtered = useMemo(() => {
    if (!search.trim()) return unifiedData
    const q = search.toLowerCase()
    return unifiedData.filter((m: any) =>
      [
        m.material?.nome,
        m.material?.codigo,
        m.almoxarifado?.nome,
        m.almoxarifado?.obra?.nome,
        m.fornecedor?.nome,
        tipoConfig[m.tipo]?.label,
      ]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(q)),
    )
  }, [unifiedData, search])

  /* Desktop columns */
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const cfg = tipoConfig[row.original.tipo] || tipoConfig.ENTRADA
        const Icon = cfg.icon
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" style={{ color: cfg.tint }} />
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'material.nome',
      header: 'Material',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-[13px]">{row.original.material?.nome || '—'}</span>
          <p className="text-[11px] text-muted-foreground font-mono">
            {row.original.material?.codigo || ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'quantidade',
      header: 'Quantidade',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-[13px]">
          {formatNumber(row.original.quantidade)}
        </span>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const p = row.original.preco_unitario ?? 0
        const q = row.original.quantidade ?? 0
        const total = p * q
        if (total <= 0) return <span className="text-muted-foreground">—</span>
        return (
          <span
            className={`text-[13px] font-semibold tabular-nums ${row.original.tipo === 'SAIDA' ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
          >
            {row.original.tipo === 'SAIDA' ? '−' : '+'}
            {formatCurrency(total)}
          </span>
        )
      },
    },
    {
      accessorKey: 'almoxarifado.nome',
      header: 'Almoxarifado',
      cell: ({ row }) => (
        <div>
          <span className="text-[13px]">{row.original.almoxarifado?.nome || '—'}</span>
          <p className="text-[11px] text-muted-foreground">
            {row.original.almoxarifado?.obra?.nome || ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'fornecedor.nome',
      header: 'Fornecedor',
      cell: ({ row }) => {
        const f = row.original.fornecedor
        return f ? (
          <span className="text-[13px]">{f.nome}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Movimentações</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Histórico de entradas, saídas e transferências
        </p>
      </div>

      {/* Instruction banner */}
      <div className="px-4 md:px-8 mb-5">
        <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground">
          <span>📦</span>
          <span>
            As movimentações são registradas automaticamente. Para dar{' '}
            <strong>entrada de material</strong>, vá para <strong>Estoque → Nova Entrada</strong>.
          </span>
        </div>
      </div>

      {/* ── Desktop: full DataTable ── */}
      <div className="hidden sm:block px-4 md:px-8">
        <DataTable
          columns={columns}
          data={unifiedData}
          isLoading={isLoading}
          searchPlaceholder="Buscar movimentações..."
        />
      </div>

      {/* ── Mobile: compact card list ── */}
      <div className="sm:hidden px-4">
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Buscar movimentações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <p className="text-[12px] text-muted-foreground mt-2 tabular-nums">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border p-4 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-muted rounded-lg" />
                  <div className="h-4 w-16 bg-muted rounded-lg" />
                </div>
                <div className="h-5 w-3/4 bg-muted rounded-lg" />
                <div className="h-3 w-1/2 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ArrowLeftRight className="h-9 w-9 mx-auto opacity-30 mb-3" />
            <p className="text-[17px] font-medium">Nenhuma movimentação</p>
            <p className="text-[14px] opacity-70 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {filtered.map((mov: any, i: number) => {
                const cfg = tipoConfig[mov.tipo] || tipoConfig.ENTRADA
                const Icon = cfg.icon
                const total = (mov.preco_unitario ?? 0) * (mov.quantidade ?? 0)
                return (
                  <motion.div
                    key={mov.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="rounded-2xl bg-card border"
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                        style={{ backgroundColor: `${cfg.tint}14` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: cfg.tint }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold truncate leading-snug">
                          {mov.material?.nome || '—'}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {cfg.label} · {formatDate(mov.created_at)}
                        </p>
                      </div>
                      {total > 0 && (
                        <span
                          className="text-[15px] font-bold tabular-nums flex-shrink-0"
                          style={{ color: mov.tipo === 'SAIDA' ? '#FF3B30' : '#34C759' }}
                        >
                          {mov.tipo === 'SAIDA' ? '−' : '+'}
                          {formatCurrency(total)}
                        </span>
                      )}
                    </div>

                    {/* Detail rows */}
                    <div className="border-t border-border/40 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">Qtd.</span>
                        <span className="font-medium tabular-nums">
                          {formatNumber(mov.quantidade)}
                        </span>
                      </div>
                      {mov.almoxarifado?.nome && (
                        <div className="flex items-start justify-between text-[13px] gap-2">
                          <span className="text-muted-foreground flex-shrink-0">Almoxarifado</span>
                          <span className="font-medium text-right truncate">
                            {mov.almoxarifado.nome}
                          </span>
                        </div>
                      )}
                      {mov.almoxarifado?.obra?.nome && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground">Obra</span>
                          <span className="font-medium">{mov.almoxarifado.obra.nome}</span>
                        </div>
                      )}
                      {mov.fornecedor?.nome && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground">Fornecedor</span>
                          <span className="font-medium">{mov.fornecedor.nome}</span>
                        </div>
                      )}
                      {mov.status_transferencia && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={statusAprovacao[mov.status_transferencia]?.variant ?? 'secondary'}>
                            {statusAprovacao[mov.status_transferencia]?.label ?? mov.status_transferencia}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
