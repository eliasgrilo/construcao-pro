/**
 * use-dashboard-ai.ts
 * AI hook + logic extraídos de dashboard-ai.tsx
 */
import {
  type FornecedorRow,
  type MaterialRow,
  type MovimentacaoRow,
  type ObraManutencao,
  type ObraManutencaoItem,
  type Tarefa,
  useFornecedores,
  useMateriais,
  useMovimentacoes,
} from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatNumber, generateId } from '@/lib/utils'
import { useCallback, useMemo, useRef, useState } from 'react'

export interface GeminiTurn {
  role: 'user' | 'model'
  parts: [{ text: string }]
}

async function callGeminiDash(systemInstruction: string, turns: GeminiTurn[]): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { mode: 'chat', systemInstruction, turns },
    })
    if (error || data?.error) return 'Erro ao consultar a IA. Tente novamente.'
    return (data?.text as string | undefined) ?? 'Sem resposta da IA.'
  } catch {
    return 'Erro ao consultar a IA. Tente novamente.'
  }
}

export interface DashAIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

export type DashAIBaseContext = {
  saldo: number
  contas: Array<{ banco: string; valor_caixa: number; valor_aplicado: number }>
  totalObras: number
  obrasAtivas: number
  custoTotal: number
  orcamentoTotal: number
  alertasCount: number
  pct: number
  obras: Array<{
    id: string
    nome?: string
    obra?: string
    endereco: string
    status: string
    custo?: number
    custo_total?: number
    orcamento: number
    valor_terreno?: number
    valor_burocracia?: number
    valor_construcao?: number
    valor_venda?: number
    percentual?: number
  }>
  tarefas: Tarefa[]
  manutencoes: ObraManutencao[]
  alertas: Record<string, unknown>[]
  recentMovs: Record<string, unknown>[]
}

function buildContextualSuggestions(ctx: DashAIBaseContext): string[] {
  const out: string[] = []
  if (ctx.alertasCount > 0)
    out.push(`Quais ${ctx.alertasCount} materiais estão com estoque crítico?`)
  const obrasAcima = ctx.obras.filter((o) => (o.percentual ?? 0) > 100)
  if (obrasAcima.length > 0)
    out.push(`Por que ${obrasAcima[0].nome ?? obrasAcima[0].obra ?? 'a obra'} passou do orçamento?`)
  if (ctx.manutencoes.length > 0) out.push('Quais problemas de manutenção preciso resolver?')
  const pendentes = ctx.tarefas.filter((t) => !t.concluida).length
  if (pendentes > 0) out.push(`Minhas ${pendentes} tarefas pendentes`)
  const defaults = [
    'Como está meu fluxo de caixa?',
    'Qual obra tem o maior custo?',
    'Estou pagando caro nos materiais?',
    'Como está meu orçamento geral?',
  ]
  for (const d of defaults) {
    if (out.length >= 4) break
    out.push(d)
  }
  return out.slice(0, 4)
}

type FullAIContext = DashAIBaseContext & {
  materiais: MaterialRow[]
  movimentacoes: MovimentacaoRow[]
  fornecedores: FornecedorRow[]
}

function buildSystemPrompt(ctx: FullAIContext): string {
  const tarefasPend = ctx.tarefas.filter((t) => !t.concluida)
  const tarefasOk = ctx.tarefas.filter((t) => t.concluida)
  const caixa = ctx.contas.reduce((s, c) => s + (Number(c.valor_caixa) || 0), 0)
  const aplicado = ctx.contas.reduce((s, c) => s + (Number(c.valor_aplicado) || 0), 0)

  const obrasLines = ctx.obras
    .map((o) => {
      const nome = o.nome ?? o.obra ?? 'Obra'
      const custo = o.custo_total ?? o.custo ?? 0
      const pct = o.percentual ?? (o.orcamento > 0 ? Math.round((custo / o.orcamento) * 100) : 0)
      const flag = pct > 100 ? ' ⚠ ACIMA DO ORÇAMENTO' : ''
      return `• ${nome} [${o.status}] — ${formatCurrency(custo)} / ${formatCurrency(o.orcamento)} (${pct}%)${flag}`
    })
    .join('\n')

  const manutLines =
    ctx.manutencoes.length === 0
      ? 'Nenhuma manutenção ativa'
      : ctx.manutencoes
          .map((m) => {
            const pend = (m.itens ?? []).filter((i: ObraManutencaoItem) => !i.resolvido)
            return `• ${m.obra?.nome ?? m.obra_id}: ${pend.length} problema(s) — ${pend.map((i: ObraManutencaoItem) => i.descricao).join(', ')}`
          })
          .join('\n')

  const alertasLines =
    ctx.alertasCount === 0
      ? 'Todos os estoques em dia'
      : ctx.alertas
          .slice(0, 12)
          .map((a) => {
            const nome = (a.material_nome ??
              (a.material as Record<string, unknown>)?.nome ??
              'Material') as string
            const obra = a.obra_nome ? ` [${a.obra_nome as string}]` : ''
            return `• ${nome}${obra}: ${formatNumber((a.quantidade as number) ?? 0)} unid (mín: ${formatNumber((a.estoque_minimo as number) ?? 0)})`
          })
          .join('\n')

  const matsLines = ctx.materiais
    .slice(0, 25)
    .map((m) => `• ${m.nome}: ${formatCurrency(m.preco_unitario ?? 0)}`)
    .join('\n')

  const comprasLines = ctx.movimentacoes
    .filter((m) => m.tipo === 'ENTRADA')
    .slice(0, 15)
    .map(
      (m) =>
        `• ${m.material?.nome ?? '?'} — ${formatCurrency(m.preco_unitario ?? 0)} — ${m.fornecedor?.nome ?? 'sem fornecedor'} — ${new Date(m.created_at).toLocaleDateString('pt-BR')}`,
    )
    .join('\n')

  const fornsLines = ctx.fornecedores
    .slice(0, 15)
    .map((f) => `• ${f.nome}${f.telefone ? ` — ${f.telefone}` : ''}`)
    .join('\n')

  const movRecentLines = ctx.recentMovs
    .slice(0, 8)
    .map((m) => {
      const tipo = (m.tipo as string) ?? ''
      const mat = (m.material_nome ??
        (m.material as Record<string, unknown>)?.nome ??
        'item') as string
      const valor = formatCurrency(
        ((m.preco_unitario as number) ?? 0) * ((m.quantidade as number) ?? 1),
      )
      const data = new Date(m.created_at as string).toLocaleDateString('pt-BR')
      return `• [${tipo}] ${mat} — ${valor} — ${data}`
    })
    .join('\n')

  return `Você é o assistente executivo do Construção Pro — plataforma de gestão de construtoras.
Responda para qualquer perfil: dono/gestor (visão executiva), gerente de obra (operacional), financeiro (contas e fluxo).
REGRAS ABSOLUTAS:
- Máximo 5 linhas. Sem introduções. Sem repetir a pergunta.
- Use os números reais dos dados. Se não tiver: "Não disponível".
- Bullet points curtos (máximo 4). Valores em R$ sempre formatados.
- Use o histórico da conversa para respostas coerentes e contextuais.

=== FINANCEIRO ===
Saldo total: ${formatCurrency(ctx.saldo)} (Caixa: ${formatCurrency(caixa)} + Aplicado: ${formatCurrency(aplicado)})
Contas (${ctx.contas.length}):
${ctx.contas.map((c) => `• ${c.banco}: ${formatCurrency(c.valor_caixa)} caixa + ${formatCurrency(c.valor_aplicado)} aplicado`).join('\n') || '• Nenhuma conta cadastrada'}

=== ORÇAMENTO GERAL ===
Realizado: ${formatCurrency(ctx.custoTotal)} / Orçado: ${formatCurrency(ctx.orcamentoTotal)} (${ctx.pct}% utilizado)
${ctx.pct > 100 ? `⚠ ORÇAMENTO ESTOURADO em ${formatCurrency(ctx.custoTotal - ctx.orcamentoTotal)}` : `Disponível: ${formatCurrency(Math.max(0, ctx.orcamentoTotal - ctx.custoTotal))}`}

=== OBRAS (${ctx.totalObras} total — ${ctx.obrasAtivas} ativas) ===
${obrasLines || '• Nenhuma obra cadastrada'}

=== TAREFAS — ${tarefasPend.length} pendentes / ${tarefasOk.length} concluídas ===
${
  tarefasPend
    .slice(0, 8)
    .map((t) => `• ${t.texto}${t.obra_nome ? ` [${t.obra_nome}]` : ''}`)
    .join('\n') || '• Nenhuma tarefa pendente'
}

=== MANUTENÇÕES EM ABERTO (${ctx.manutencoes.length}) ===
${manutLines}

=== ALERTAS DE ESTOQUE (${ctx.alertasCount}) ===
${alertasLines}

=== MATERIAIS CADASTRADOS (${ctx.materiais.length}) ===
${matsLines || '• Nenhum material cadastrado'}

=== ÚLTIMAS COMPRAS ===
${comprasLines || '• Nenhuma compra registrada'}

=== FORNECEDORES (${ctx.fornecedores.length}) ===
${fornsLines || '• Nenhum fornecedor cadastrado'}

=== ATIVIDADE RECENTE ===
${movRecentLines || '• Sem movimentações recentes'}`
}

export function useDashboardAI(baseContext: DashAIBaseContext) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DashAIMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const turnsRef = useRef<GeminiTurn[]>([])

  const { data: materiais = [] } = useMateriais({ enabled: open })
  const { data: movimentacoes = [] } = useMovimentacoes({ enabled: open })
  const { data: fornecedores = [] } = useFornecedores({ enabled: open })

  const context: FullAIContext = useMemo(
    () => ({ ...baseContext, materiais, movimentacoes, fornecedores }),
    [
      baseContext.saldo,
      baseContext.alertasCount,
      baseContext.pct,
      baseContext.totalObras,
      baseContext.obrasAtivas,
      baseContext.custoTotal,
      baseContext.orcamentoTotal,
      baseContext.obras,
      baseContext.tarefas,
      baseContext.manutencoes,
      baseContext.contas,
      baseContext.alertas,
      baseContext.recentMovs,
      materiais,
      movimentacoes,
      fornecedores,
    ],
  )

  const contextRef = useRef(context)
  contextRef.current = context

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = messagesEndRef.current?.parentElement
        if (!(container instanceof HTMLElement)) return
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      })
    })
  }, [])

  const addMessage = useCallback(
    (msg: Omit<DashAIMessage, 'id'>) => {
      const m: DashAIMessage = { ...msg, id: generateId('dash-ai') }
      setMessages((prev) => [...prev, m])
      scrollToBottom()
      return m.id
    },
    [scrollToBottom],
  )

  const buildProactiveInsight = useCallback((ctx: FullAIContext) => {
    const issues: string[] = []
    if (ctx.alertasCount > 0) issues.push(`**${ctx.alertasCount} material(is) em estoque crítico**`)
    const obrasAcima = ctx.obras.filter((o) => (o.percentual ?? 0) > 100)
    if (obrasAcima.length > 0) issues.push(`**${obrasAcima.length} obra(s) acima do orçamento**`)
    if (ctx.manutencoes.length > 0)
      issues.push(`**${ctx.manutencoes.length} manutenção(ões) em aberto**`)
    const pendentes = ctx.tarefas.filter((t) => !t.concluida).length
    if (pendentes > 0) issues.push(`**${pendentes} tarefa(s) pendente(s)**`)
    if (issues.length > 0) return `Atenção: ${issues.join(' · ')}. O que quer analisar?`
    return `Saldo ${formatCurrency(ctx.saldo)} · ${ctx.obrasAtivas} obras ativas · orçamento ${ctx.pct}% utilizado. O que quer saber?`
  }, [])

  const openChat = useCallback(() => {
    setOpen(true)
    if (messages.length === 0) {
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: buildProactiveInsight(contextRef.current),
        })
      }, 200)
    }
  }, [messages.length, addMessage, buildProactiveInsight])

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return
      const userText = text.trim()
      const ctx = contextRef.current
      setInput('')
      addMessage({ role: 'user', content: userText })
      setIsProcessing(true)

      const typingId = addMessage({ role: 'assistant', content: '...', isTyping: true })

      try {
        const systemPrompt = buildSystemPrompt(ctx)
        const newTurns: GeminiTurn[] = [
          ...turnsRef.current.slice(-8),
          { role: 'user', parts: [{ text: userText }] },
        ]
        const answer = await callGeminiDash(systemPrompt, newTurns)
        turnsRef.current = [...newTurns, { role: 'model', parts: [{ text: answer }] }]
        setMessages((prev) => prev.filter((m) => m.id !== typingId))
        addMessage({ role: 'assistant', content: answer })
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== typingId))
        addMessage({
          role: 'assistant',
          content: 'Ocorreu um erro. Verifique sua conexão e tente novamente.',
        })
      }

      setIsProcessing(false)
    },
    [addMessage, isProcessing],
  )

  const suggestions = useMemo(
    () => buildContextualSuggestions(baseContext),
    [baseContext.alertasCount, baseContext.tarefas, baseContext.manutencoes, baseContext.obras],
  )

  return {
    open,
    openChat,
    closeChat: () => setOpen(false),
    messages,
    input,
    setInput,
    isProcessing,
    handleUserMessage,
    messagesEndRef,
    suggestions,
  }
}
