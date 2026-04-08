import { Input } from '@/components/ui/input'
import type { FinanceiroMovimentacaoWithConta, MovimentacaoRow } from '@/hooks/use-supabase'
import {
  useAllFinanceiroMovimentacoes,
  useDashboardCustoPorObra,
  useMovimentacoes,
} from '@/hooks/use-supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Home, Landmark, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  FinanceiroCard,
  ImovelCard,
  MovCard,
  MovimentacoesEmptyState,
  type ObraVenda,
  SectionBlock,
  SkeletonCards,
  StatCard,
  TABS,
  type TabKey,
  clr,
  listVariants,
} from './movimentacoes-parts'

export function MovimentacoesPage() {
  const { data: movsData, isLoading: isLoadingMovs } = useMovimentacoes()
  const { data: finMovsData, isLoading: isLoadingFin } = useAllFinanceiroMovimentacoes()
  const { data: custoPorObraData } = useDashboardCustoPorObra()

  const [activeTab, setActiveTab] = useState<TabKey>('TODAS')
  const [search, setSearch] = useState('')

  const isLoading = isLoadingMovs || isLoadingFin

  const movs = movsData ?? []
  const finMovs = finMovsData ?? []
  const obras = useMemo(
    () => (custoPorObraData ?? []).filter((o) => o.valor_venda > 0) as ObraVenda[],
    [custoPorObraData],
  )

  // ── Grouped stock movements ──────────────────────────────────────────────
  const entradas = useMemo(() => movs.filter((m) => m.tipo === 'ENTRADA'), [movs])
  const saidas = useMemo(() => movs.filter((m) => m.tipo === 'SAIDA'), [movs])
  const transferencias = useMemo(() => movs.filter((m) => m.tipo === 'TRANSFERENCIA'), [movs])

  // ── Search helpers ───────────────────────────────────────────────────────
  const q = search.toLowerCase().trim()

  const matchMov = (m: MovimentacaoRow) =>
    !q ||
    [m.material?.nome, m.almoxarifado?.obra?.nome, m.fornecedor?.nome, m.observacao]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))

  const matchFin = (m: FinanceiroMovimentacaoWithConta) =>
    !q ||
    [m.motivo, m.financeiro_contas?.banco]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))

  const matchObra = (o: ObraVenda) =>
    !q || [o.obra, o.endereco].some((v) => v?.toLowerCase().includes(q))

  // ── Visible (filtered) lists ─────────────────────────────────────────────
  const visEntradas = useMemo(() => entradas.filter(matchMov), [entradas, q])
  const visSaidas = useMemo(() => saidas.filter(matchMov), [saidas, q])
  const visTransferencias = useMemo(() => transferencias.filter(matchMov), [transferencias, q])
  const visFinanceiro = useMemo(() => finMovs.filter(matchFin), [finMovs, q])
  const visImoveis = useMemo(() => obras.filter(matchObra), [obras, q])

  // ── Tab counts ───────────────────────────────────────────────────────────
  const counts = useMemo<Record<TabKey, number>>(
    () => ({
      TODAS: movs.length + finMovs.length + obras.length,
      ENTRADAS: entradas.length,
      SAIDAS: saidas.length,
      TRANSFERENCIAS: transferencias.length,
      IMOVEIS: obras.length,
      FINANCEIRO: finMovs.length,
    }),
    [movs, finMovs, obras, entradas, saidas, transferencias],
  )

  // ── Summary totals ───────────────────────────────────────────────────────
  const totalEntradas = useMemo(
    () => entradas.reduce((s, m) => s + (m.preco_unitario ?? 0) * m.quantidade, 0),
    [entradas],
  )
  const totalSaidas = useMemo(
    () => saidas.reduce((s, m) => s + (m.preco_unitario ?? 0) * m.quantidade, 0),
    [saidas],
  )
  const totalImoveis = useMemo(() => obras.reduce((s, o) => s + o.valor_venda, 0), [obras])
  const saldoFinanceiro = useMemo(() => {
    const entrada = finMovs.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0)
    const saida = finMovs.filter((m) => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0)
    return entrada - saida
  }, [finMovs])

  // ── Rendered card lists per tab ───────────────────────────────────────────
  function renderEntradasList(items: MovimentacaoRow[]) {
    if (items.length === 0)
      return (
        <MovimentacoesEmptyState
          icon={<ArrowDownRight className="h-10 w-10" />}
          message="Nenhuma entrada encontrada"
        />
      )
    return (
      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((m) => (
          <MovCard key={m.id} mov={m} />
        ))}
      </motion.div>
    )
  }

  function renderSaidasList(items: MovimentacaoRow[]) {
    if (items.length === 0)
      return (
        <MovimentacoesEmptyState
          icon={<ArrowUpRight className="h-10 w-10" />}
          message="Nenhuma saída encontrada"
        />
      )
    return (
      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((m) => (
          <MovCard key={m.id} mov={m} />
        ))}
      </motion.div>
    )
  }

  function renderTransferenciasList(items: MovimentacaoRow[]) {
    if (items.length === 0)
      return (
        <MovimentacoesEmptyState
          icon={<ArrowLeftRight className="h-10 w-10" />}
          message="Nenhuma transferência encontrada"
        />
      )
    return (
      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((m) => (
          <MovCard key={m.id} mov={m} />
        ))}
      </motion.div>
    )
  }

  function renderImoveisList(items: ObraVenda[]) {
    if (items.length === 0)
      return (
        <MovimentacoesEmptyState
          icon={<Home className="h-10 w-10" />}
          message="Nenhuma venda de imóvel registrada"
        />
      )
    return (
      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((o) => (
          <ImovelCard key={o.id} obra={o} />
        ))}
      </motion.div>
    )
  }

  function renderFinanceiroList(items: FinanceiroMovimentacaoWithConta[]) {
    if (items.length === 0)
      return (
        <MovimentacoesEmptyState
          icon={<Landmark className="h-10 w-10" />}
          message="Nenhuma movimentação financeira encontrada"
        />
      )
    return (
      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
        {items.map((m) => (
          <FinanceiroCard key={m.id} mov={m} />
        ))}
      </motion.div>
    )
  }

  const todasIsEmpty =
    visImoveis.length === 0 &&
    visEntradas.length === 0 &&
    visSaidas.length === 0 &&
    visTransferencias.length === 0 &&
    visFinanceiro.length === 0

  return (
    <div className="pb-16">
      {/* ── Page header ── */}
      <div className="px-4 md:px-8 pt-10 pb-6">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Movimentações</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Entradas, saídas, transferências e vendas de imóveis
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div className="px-4 md:px-8 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Entradas" value={formatCurrency(totalEntradas)} color={clr.green} />
          <StatCard label="Saídas" value={formatCurrency(totalSaidas)} color={clr.red} />
          <StatCard label="Vendas" value={formatCurrency(totalImoveis)} color={clr.purple} />
          <StatCard
            label="Saldo Financeiro"
            value={formatCurrency(saldoFinanceiro)}
            color={saldoFinanceiro >= 0 ? clr.green : clr.red}
          />
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-4 md:px-8 mb-5">
        <Input
          placeholder="Buscar movimentações..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      {/* ── Tabs (segmented control) ── */}
      <div className="px-4 md:px-8 mb-6">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div
            role="tablist"
            aria-label="Filtrar movimentações"
            className="inline-flex items-center bg-muted rounded-[12px] p-1 gap-0.5 min-w-max"
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-[9px] text-[13px] font-medium whitespace-nowrap"
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="mov-tab-pill"
                    className="absolute inset-0 rounded-[9px] bg-background shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    'relative flex items-center gap-1.5 transition-colors duration-150',
                    activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.color && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tab.color }}
                    />
                  )}
                  {tab.label}
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      activeTab === tab.key ? 'text-muted-foreground' : 'text-muted-foreground/50',
                    )}
                  >
                    {counts[tab.key]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 md:px-8">
        {isLoading ? (
          <SkeletonCards />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── TODAS: sectioned view ── */}
              {activeTab === 'TODAS' &&
                (todasIsEmpty ? (
                  <MovimentacoesEmptyState
                    icon={<ArrowLeftRight className="h-10 w-10" />}
                    message="Nenhuma movimentação encontrada"
                  />
                ) : (
                  <>
                    {visImoveis.length > 0 && (
                      <SectionBlock
                        label="Vendas de Imóveis"
                        count={visImoveis.length}
                        color={clr.purple}
                      >
                        {renderImoveisList(visImoveis)}
                      </SectionBlock>
                    )}

                    {visEntradas.length > 0 && (
                      <SectionBlock
                        label="Entradas de Materiais"
                        count={visEntradas.length}
                        color={clr.green}
                      >
                        {renderEntradasList(visEntradas)}
                      </SectionBlock>
                    )}

                    {visSaidas.length > 0 && (
                      <SectionBlock
                        label="Saídas de Materiais"
                        count={visSaidas.length}
                        color={clr.red}
                      >
                        {renderSaidasList(visSaidas)}
                      </SectionBlock>
                    )}

                    {visTransferencias.length > 0 && (
                      <SectionBlock
                        label="Transferências"
                        count={visTransferencias.length}
                        color={clr.blue}
                      >
                        {renderTransferenciasList(visTransferencias)}
                      </SectionBlock>
                    )}

                    {visFinanceiro.length > 0 && (
                      <SectionBlock
                        label="Movimentações Financeiras"
                        count={visFinanceiro.length}
                        color={clr.orange}
                      >
                        {renderFinanceiroList(visFinanceiro)}
                      </SectionBlock>
                    )}
                  </>
                ))}

              {/* ── Individual tab views ── */}
              {activeTab === 'ENTRADAS' && renderEntradasList(visEntradas)}
              {activeTab === 'SAIDAS' && renderSaidasList(visSaidas)}
              {activeTab === 'TRANSFERENCIAS' && renderTransferenciasList(visTransferencias)}
              {activeTab === 'IMOVEIS' && renderImoveisList(visImoveis)}
              {activeTab === 'FINANCEIRO' && renderFinanceiroList(visFinanceiro)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
