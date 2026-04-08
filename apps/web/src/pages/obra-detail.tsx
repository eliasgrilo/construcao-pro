import { Button } from '@/components/ui/button'
import { parseCurrency } from '@/components/ui/currency-input'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useCreateManutencao,
  useCreateMovimentacaoSaida,
  useFinanceiroContas,
  useObra,
  useObraAlmoxarifados,
  useObraCustos,
  useObraEstoque,
  useObraLancamentosBurocracia,
  useObraManutencaoAtiva,
  useObraManutencoes,
  useObraMovimentacoes,
  useRegisterObraVenda,
  useUpdateObra,
} from '@/hooks/use-supabase'
import { formatCurrency } from '@/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, ArrowLeftRight, Plus } from 'lucide-react'
import { ObraDetailDialogsHub } from './obra-detail-dialogs-hub'
import { ObraDetailHeaderLayout } from './obra-detail-header'
import { Empty, ObraDetailMovimentacaoItem } from './obra-detail-parts'
import {
  canSubmitVendaValidation,
  getInitialTab,
  getIsoDateWithOffset,
  processarVendaTransaction,
  useObraDetailsDerived,
} from './obra-detail-state'
import { ObraDetailTabBar } from './obra-detail-tab-bar'
import type {
  Almoxarifado,
  BaixaTarget,
  ContaFinanceira,
  DeleteEstoqueTarget,
  EstoqueItem,
  Tab,
} from './obra-detail-types'

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

// Tab components are lazy-loaded — each tab is its own chunk, fetched only on first visit
const ObraDetailAlmoxarifadosTab = lazy(() =>
  import('./obra-detail-almoxarifados-tab').then((m) => ({
    default: m.ObraDetailAlmoxarifadosTab,
  })),
)
const ObraDetailBurocraciaTab = lazy(() =>
  import('./obra-detail-burocracia-tab').then((m) => ({ default: m.ObraDetailBurocraciaTab })),
)
const ObraDetailCustosTab = lazy(() =>
  import('./obra-detail-custos-tab').then((m) => ({ default: m.ObraDetailCustosTab })),
)
const ObraDetailEstoqueTab = lazy(() =>
  import('./obra-detail-estoque-tab').then((m) => ({ default: m.ObraDetailEstoqueTab })),
)
const ObraDetailManutencaoTab = lazy(() =>
  import('./obra-detail-manutencao-tab').then((m) => ({ default: m.ObraDetailManutencaoTab })),
)

export {
  Empty,
  ObraDetailAlmoxarifadoCard,
  ObraDetailAlmoxarifadoItem,
  ObraDetailVendaPreview,
} from './obra-detail-parts'
export { burocCatConfig, burocMigrationSql } from './obra-detail-types'
export type {
  Almoxarifado,
  BaixaTarget,
  BurocaciaCategoria,
  CompraRecente,
  ContaFinanceira,
  DeleteEstoqueTarget,
  EstoqueItem,
  Fornecedor,
  Material,
  MaterialEstoque,
  ObraCustos,
  ObraLancamentoBurocracia,
} from './obra-detail-types'

export function ObraDetailPage() {
  const { obraId } = useParams({ strict: false }) as { obraId: string }
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasObraAccess } = usePermissions()
  const [activeTab, setActiveTab] = useState<Tab>(() => getInitialTab(obraId))
  const tabInitialized = useRef(false)

  /* Dialogs */
  const [movDialog, setMovDialog] = useState(false)
  const [movTipo, setMovTipo] = useState('ENTRADA')
  const [movMaterialId, setMovMaterialId] = useState('')
  const [movAlmoxId, setMovAlmoxId] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const budgetRef = useRef<HTMLInputElement>(null)

  const [editingTerreno, setEditingTerreno] = useState(false)
  const [terrenoInput, setTerrenoInput] = useState('')
  const terrenoRef = useRef<HTMLInputElement>(null)

  /* ── Inline nome editing ── */
  const [editingNome, setEditingNome] = useState(false)
  const [nomeInput, setNomeInput] = useState('')
  const nomeRef = useRef<HTMLInputElement>(null)

  /* ── Venda Dialog ── */
  const [vendaDialog, setVendaDialog] = useState(false)
  const [vendaInput, setVendaInput] = useState('')
  const [vendaContaId, setVendaContaId] = useState<string>('')
  const [vendaSubconta, setVendaSubconta] = useState<'CAIXA' | 'APLICADO' | 'APLICACAO'>('CAIXA')
  const [vendaSubmitting, setVendaSubmitting] = useState(false)
  const [vendaFormaPagamento, setVendaFormaPagamento] = useState('')
  const [vendaParcelas, setVendaParcelas] = useState('')
  const [vendaTaxaCartao, setVendaTaxaCartao] = useState('')
  const [vendaSplitEnabled, setVendaSplitEnabled] = useState(false)
  const [vendaSplitContaId, setVendaSplitContaId] = useState('')
  const [vendaSplitValor, setVendaSplitValor] = useState('')
  const [vendaConta1Valor, setVendaConta1Valor] = useState('')
  const todayInit = getIsoDateWithOffset()
  const d30Init = getIsoDateWithOffset(30)
  const [vendaDataPagamento, setVendaDataPagamento] = useState(todayInit)
  const [vendaDataPrimeiraParcela, setVendaDataPrimeiraParcela] = useState(d30Init)
  const vendaInputRef = useRef<HTMLInputElement>(null)

  /* ── Rich Entrada Dialog ── */
  const [entradaDialog, setEntradaDialog] = useState(false)
  const [entAlmoxId, setEntAlmoxId] = useState('')

  /* ── Dar Baixa (Saída rápida) ── */
  const [baixaTarget, setBaixaTarget] = useState<BaixaTarget | null>(null)

  /* ── Zerar estoque (registra saída total) ── */
  const [deleteEstoqueTarget, setDeleteEstoqueTarget] = useState<DeleteEstoqueTarget | null>(null)

  /* ── Manutenção ── */
  const [manutencaoDialogOpen, setManutencaoDialogOpen] = useState(false)
  const [manutencaoAutoAdd, setManutencaoAutoAdd] = useState(false)

  /* Queries */
  const { data: obra, isLoading: obraLoading } = useObra(obraId)
  const { data: almoxarifados = [] } = useObraAlmoxarifados(obraId)
  const { data: estoque = [], isLoading: estoqueLoading } = useObraEstoque(obraId)
  const { data: movimentacoes = [] } = useObraMovimentacoes(obraId)
  const { data: custos } = useObraCustos(obraId)

  /* Financeiro — contas disponíveis para destino da venda */
  const { data: contasFinanceiras = [] } = useFinanceiroContas()

  /* Manutenção */
  const { data: manutencaoAtiva = null, isLoading: manutencaoLoading } =
    useObraManutencaoAtiva(obraId)
  const { data: manutencaoHistorico = [], isLoading: historicoLoading } = useObraManutencoes(obraId)

  /* Burocracia */
  const {
    data: lancamentosBurocracia = [],
    isLoading: burocLoading,
    isError: burocError,
  } = useObraLancamentosBurocracia(obraId)

  /* Mutations */
  const updateOrcamento = useUpdateObra()
  const createSaida = useCreateMovimentacaoSaida()
  const registerObraVenda = useRegisterObraVenda()
  const createManutencao = useCreateManutencao()

  /* Scroll to top on page mount */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  /* Redireciona para aba manutenção na primeira carga se obra estiver em MANUTENCAO */
  useEffect(() => {
    if (!tabInitialized.current && obra?.status) {
      tabInitialized.current = true
      if ((obra.status as string) === 'MANUTENCAO') {
        setActiveTab('manutencao')
      }
    }
  }, [obra?.status])

  const handleAutoIniciarManutencao = async () => {
    try {
      await createManutencao.mutateAsync({
        obra_id: obraId,
        status_anterior: obra?.status ?? 'ATIVA',
      })
      setManutencaoAutoAdd(true)
      toast({
        title: 'Manutenção iniciada',
        description: 'Descreva o problema encontrado.',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Erro ao iniciar manutenção', variant: 'error' })
    }
  }

  /* ── Custos tab: derived data ── */
  const { investimentoCategoria, comprasRecentes, materiaisEstoque, materiaisEstoqueTotal } =
    useObraDetailsDerived(custos, movimentacoes, estoque)

  const bTotalGeral = useMemo(
    () => lancamentosBurocracia.reduce((sum, lancamento) => sum + (lancamento.valor ?? 0), 0),
    [lancamentosBurocracia],
  )

  const getVendaArgs = () => ({
    vendaFormaPagamento,
    vendaParcelas,
    vendaTaxaCartao,
    vendaContaId,
    vendaSubconta,
    nomeObra: obra?.nome || 'Obra',
    obraId,
    dataPagamento: vendaDataPagamento,
    dataPrimeiraParcela: vendaDataPrimeiraParcela,
  })

  const getVendaSplitArgs = () => ({
    ...getVendaArgs(),
    vendaSplitContaId,
  })

  const resetVendaState = () => {
    setVendaInput('')
    setVendaContaId('')
    setVendaSubconta('CAIXA')
    setVendaFormaPagamento('')
    setVendaParcelas('')
    setVendaSplitEnabled(false)
    setVendaSplitContaId('')
    setVendaSplitValor('')
    setVendaConta1Valor('')
    setVendaDataPagamento(getIsoDateWithOffset())
    setVendaDataPrimeiraParcela(getIsoDateWithOffset(30))
  }

  const handleConfirmarVenda = async () => {
    const venda = parseCurrency(vendaInput)
    const ready = canSubmitVendaValidation(
      vendaInput,
      vendaSplitEnabled,
      vendaConta1Valor,
      vendaSplitValor,
      vendaContaId,
      vendaSplitContaId,
      vendaFormaPagamento,
      vendaParcelas,
      vendaTaxaCartao,
      vendaSubmitting,
    )

    if (!ready) return

    setVendaSubmitting(true)
    try {
      await processarVendaTransaction(
        venda,
        vendaSplitEnabled,
        vendaConta1Valor,
        vendaSplitValor,
        obraId,
        getVendaArgs(),
        getVendaSplitArgs(),
        registerObraVenda,
      )

      setVendaDialog(false)
      resetVendaState()

      toast({
        title: 'Venda registrada',
        description: `${obra?.nome} vendida por ${formatCurrency(venda)}`,
        variant: 'success',
      })
    } catch (e) {
      console.error('[venda] RPC error:', e)
      const msg =
        e instanceof Error && e.message
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : typeof e === 'string' && e
              ? e
              : 'Verifique os dados e tente novamente.'
      toast({
        title: 'Erro ao registrar venda',
        description: msg,
        variant: 'error',
      })
    } finally {
      setVendaSubmitting(false)
    }
  }

  if (obraLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <div className="h-8 w-56 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  // Obra-level access enforcement — restricted users can't view unassigned obras
  if (!hasObraAccess(obraId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-[20px] font-bold tracking-tight">Acesso Restrito</h2>
          <p className="text-[14px] text-muted-foreground mt-1">
            Você não tem permissão para acessar esta obra.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: '/obras' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Obras
        </Button>
      </div>
    )
  }

  return (
    <div className="pb-10">
      {/* ─── Header ─── */}
      <ObraDetailHeaderLayout
        navigate={navigate}
        editingNome={editingNome}
        nomeRef={nomeRef}
        nomeInput={nomeInput}
        setNomeInput={setNomeInput}
        setEditingNome={setEditingNome}
        obra={obra}
        obraId={obraId}
        updateOrcamento={updateOrcamento}
        toast={toast}
        setVendaInput={setVendaInput}
        setVendaContaId={setVendaContaId}
        setVendaSubconta={setVendaSubconta}
        setVendaFormaPagamento={setVendaFormaPagamento}
        setVendaParcelas={setVendaParcelas}
        setVendaSplitEnabled={setVendaSplitEnabled}
        setVendaSplitContaId={setVendaSplitContaId}
        setVendaSplitValor={setVendaSplitValor}
        setVendaConta1Valor={setVendaConta1Valor}
        setVendaDialog={setVendaDialog}
        vendaInputRef={vendaInputRef}
        setManutencaoDialogOpen={setManutencaoDialogOpen}
        manutencaoAtiva={manutencaoAtiva}
        editingBudget={editingBudget}
        budgetRef={budgetRef}
        budgetInput={budgetInput}
        setBudgetInput={setBudgetInput}
        setEditingBudget={setEditingBudget}
        custos={custos}
        setActiveTab={setActiveTab}
        editingTerreno={editingTerreno}
        setEditingTerreno={setEditingTerreno}
        terrenoInput={terrenoInput}
        setTerrenoInput={setTerrenoInput}
        terrenoRef={terrenoRef}
      />

      {/* ─── Tabs ─── */}
      <ObraDetailTabBar activeTab={activeTab} setActiveTab={setActiveTab} obraId={obraId} />

      {/* ─── Content ─── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="px-4 md:px-8 pt-6 pb-24"
      >
        {/* ════════ CUSTOS ════════ */}
        {activeTab === 'custos' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
            }
          >
            <ObraDetailCustosTab
              obraId={obraId}
              custos={custos}
              investimentoCategoria={investimentoCategoria}
              comprasRecentes={comprasRecentes}
              materiaisEstoque={materiaisEstoque}
              materiaisEstoqueTotal={materiaisEstoqueTotal}
            />
          </Suspense>
        )}
        {/* ════════ ALMOXARIFADOS ════════ */}
        {activeTab === 'almoxarifados' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
            }
          >
            <ObraDetailAlmoxarifadosTab
              obraId={obraId}
              almoxarifados={almoxarifados as Almoxarifado[]}
              estoque={estoque as EstoqueItem[]}
              setEntAlmoxId={setEntAlmoxId}
              setEntradaDialog={setEntradaDialog}
              setBaixaTarget={setBaixaTarget}
              setMovTipo={setMovTipo}
              setMovAlmoxId={setMovAlmoxId}
              setMovMaterialId={setMovMaterialId}
              setMovDialog={setMovDialog}
              setDeleteEstoqueTarget={setDeleteEstoqueTarget}
            />
          </Suspense>
        )}
        {/* ════════ ESTOQUE ════════ */}
        {activeTab === 'estoque' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
            }
          >
            <ObraDetailEstoqueTab
              obraId={obraId}
              estoque={estoque as EstoqueItem[]}
              isLoading={estoqueLoading}
              setBaixaTarget={setBaixaTarget}
            />
          </Suspense>
        )}
        {/* ════════ BUROCRACIA ════════ */}
        {activeTab === 'burocracia' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
            }
          >
            <ObraDetailBurocraciaTab
              obraId={obraId}
              burocLoading={burocLoading}
              burocError={burocError}
              lancamentosBurocracia={lancamentosBurocracia}
              bTotalGeral={bTotalGeral}
            />
          </Suspense>
        )}
        {/* ════════ MANUTENÇÃO ════════ */}
        {activeTab === 'manutencao' && (
          <Suspense
            fallback={
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
            }
          >
            <ObraDetailManutencaoTab
              obraId={obraId}
              manutencaoAtiva={manutencaoAtiva}
              manutencaoLoading={manutencaoLoading}
              historico={manutencaoHistorico}
              historicoLoading={historicoLoading}
              onIniciarManutencao={handleAutoIniciarManutencao}
              autoOpenAddInput={manutencaoAutoAdd}
              onAutoOpenDone={() => setManutencaoAutoAdd(false)}
            />
          </Suspense>
        )}
        {/* ════════ MOVIMENTAÇÕES ════════ */}
        {activeTab === 'movimentacoes' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold">Movimentações desta obra</h2>
              <Button size="sm" onClick={() => setMovDialog(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nova Movimentação
              </Button>
            </div>
            {movimentacoes.length === 0 ? (
              <Empty
                icon={ArrowLeftRight}
                text="Nenhuma movimentação"
                sub="Registre entradas e saídas de materiais."
              />
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <ul className="divide-y divide-border/50">
                  {movimentacoes.map((mov) => (
                    <ObraDetailMovimentacaoItem key={mov.id} mov={mov} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <ObraDetailDialogsHub
        vendaDialog={vendaDialog}
        setVendaDialog={setVendaDialog}
        vendaInput={vendaInput}
        setVendaInput={setVendaInput}
        vendaContaId={vendaContaId}
        setVendaContaId={setVendaContaId}
        vendaSubconta={vendaSubconta}
        setVendaSubconta={setVendaSubconta}
        vendaFormaPagamento={vendaFormaPagamento}
        setVendaFormaPagamento={setVendaFormaPagamento}
        vendaParcelas={vendaParcelas}
        setVendaParcelas={setVendaParcelas}
        vendaTaxaCartao={vendaTaxaCartao}
        setVendaTaxaCartao={setVendaTaxaCartao}
        vendaSplitEnabled={vendaSplitEnabled}
        setVendaSplitEnabled={setVendaSplitEnabled}
        vendaSplitContaId={vendaSplitContaId}
        setVendaSplitContaId={setVendaSplitContaId}
        vendaSplitValor={vendaSplitValor}
        setVendaSplitValor={setVendaSplitValor}
        vendaConta1Valor={vendaConta1Valor}
        setVendaConta1Valor={setVendaConta1Valor}
        vendaDataPagamento={vendaDataPagamento}
        setVendaDataPagamento={setVendaDataPagamento}
        vendaDataPrimeiraParcela={vendaDataPrimeiraParcela}
        setVendaDataPrimeiraParcela={setVendaDataPrimeiraParcela}
        vendaInputRef={vendaInputRef}
        handleConfirmarVenda={handleConfirmarVenda}
        vendaSubmitting={vendaSubmitting}
        contasFinanceiras={contasFinanceiras as ContaFinanceira[]}
        custos={custos ?? null}
        manutencaoDialogOpen={manutencaoDialogOpen}
        setManutencaoDialogOpen={setManutencaoDialogOpen}
        obraId={obraId}
        statusAnterior={obra?.status ?? 'ATIVA'}
        onManutencaoSuccess={() => setActiveTab('manutencao')}
        baixaTarget={baixaTarget}
        setBaixaTarget={setBaixaTarget}
        darBaixaMutation={{
          isPending: createSaida.isPending,
          mutateAsync: (params) =>
            createSaida.mutateAsync({
              p_material_id: params.material_id,
              p_quantidade: params.quantidade,
              p_preco_unitario: params.custo_unitario ?? 0,
              p_almoxarifado_id: params.almoxarifado_id,
              p_observacao: params.observacao ?? undefined,
            }),
        }}
        entradaDialog={entradaDialog}
        setEntradaDialog={setEntradaDialog}
        entAlmoxId={entAlmoxId}
        movDialog={movDialog}
        setMovDialog={setMovDialog}
        movAlmoxId={movAlmoxId}
        movMaterialId={movMaterialId}
        movTipo={movTipo}
      />
    </div>
  )
}
