# Contas a Pagar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar seção "Contas a Pagar" na página Financeiro com suporte a parcelas, categorias, vínculo com obra, e fluxo de pagamento que cria SAÍDA automática na conta bancária.

**Architecture:** Duas novas tabelas Supabase (`contas_pagar` + `contas_pagar_parcelas`). Hooks React Query em `use-supabase.ts`. UI inline em `financeiro.tsx` após seção "A Receber", com modais iOS-style e lista por urgência.

**Tech Stack:** React 18, TypeScript, Framer Motion, TanStack Query, Supabase, Tailwind v4, Lucide icons, `currency-input` utilitário já existente.

---

## Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260316010000_add_contas_pagar.sql`

**Step 1: Criar o arquivo SQL**

```sql
-- ─────────────────────────────────────────────────────────────
-- Contas a Pagar — tabela-pai + parcelas
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contas_pagar (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   TEXT        NOT NULL,
  categoria   TEXT        NOT NULL DEFAULT 'Outros',
  obra_id     UUID        REFERENCES obras(id) ON DELETE SET NULL,
  observacoes TEXT,
  valor_total NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON contas_pagar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_pagar_id  UUID        NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
  numero_parcela  INTEGER     NOT NULL DEFAULT 1,
  total_parcelas  INTEGER     NOT NULL DEFAULT 1,
  valor           NUMERIC     NOT NULL DEFAULT 0,
  vencimento      DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','ATRASADO')),
  pago_em         DATE,
  conta_bancaria_id UUID      REFERENCES financeiro_contas(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_pagar_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON contas_pagar_parcelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**Step 2: Aplicar migration via MCP Supabase** (usar `apply_migration` tool)

**Step 3: Verificar tables existem** via `list_tables`

---

## Task 2: TypeScript Interfaces + React Query Hooks

**Files:**
- Modify: `apps/web/src/hooks/use-supabase.ts` (append ao final, antes do bloco Documentos)

**Interfaces a adicionar:**

```typescript
export interface ContaPagar {
  id: string
  descricao: string
  categoria: string
  obra_id: string | null
  observacoes: string | null
  valor_total: number
  created_at: string
}

export interface ContaPagarParcela {
  id: string
  conta_pagar_id: string
  numero_parcela: number
  total_parcelas: number
  valor: number
  vencimento: string
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO'
  pago_em: string | null
  conta_bancaria_id: string | null
  created_at: string
  // join
  contas_pagar?: ContaPagar
}
```

**Hooks a adicionar:**

```typescript
// useContasPagarParcelas — todas as parcelas com a conta-pai embutida
export function useContasPagarParcelas() {
  return useQuery({
    queryKey: ['contas_pagar', 'parcelas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar_parcelas' as any)
        .select('*, contas_pagar(*)')
        .order('vencimento', { ascending: true })
      if (error) throw error
      return (data || []) as unknown as ContaPagarParcela[]
    },
  })
}

// useCreateContaPagar — cria a conta-pai + N parcelas
export function useCreateContaPagar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      descricao: string
      categoria: string
      obra_id: string | null
      observacoes: string | null
      valor_total: number
      parcelas: Array<{ numero_parcela: number; total_parcelas: number; valor: number; vencimento: string }>
    }) => {
      const { data: cp, error: cpErr } = await supabase
        .from('contas_pagar' as any)
        .insert({
          descricao: body.descricao,
          categoria: body.categoria,
          obra_id: body.obra_id,
          observacoes: body.observacoes,
          valor_total: body.valor_total,
        })
        .select()
        .single()
      if (cpErr) throw cpErr
      const contaPagarId = (cp as any).id as string
      const parcelasPayload = body.parcelas.map((p) => ({
        conta_pagar_id: contaPagarId,
        numero_parcela: p.numero_parcela,
        total_parcelas: p.total_parcelas,
        valor: p.valor,
        vencimento: p.vencimento,
      }))
      const { error: pErr } = await supabase
        .from('contas_pagar_parcelas' as any)
        .insert(parcelasPayload)
      if (pErr) throw pErr
      return cp as unknown as ContaPagar
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas_pagar'] }),
  })
}

// useDeleteContaPagar — apaga a conta-pai (cascade nas parcelas)
export function useDeleteContaPagar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_pagar' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas_pagar'] }),
  })
}

// usePagarParcela — marca parcela como PAGO e cria SAÍDA na conta bancária
export function usePagarParcela() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataPagamento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      // 1. Atualiza status da parcela
      const { error: pErr } = await supabase
        .from('contas_pagar_parcelas' as any)
        .update({ status: 'PAGO', pago_em: body.dataPagamento, conta_bancaria_id: body.contaBancariaId })
        .eq('id', body.parcelaId)
      if (pErr) throw pErr

      // 2. Lê saldo atual da conta bancária
      const { data: contaData, error: contaErr } = await supabase
        .from('financeiro_contas' as any)
        .select('valor_caixa')
        .eq('id', body.contaBancariaId)
        .single()
      if (contaErr) throw contaErr
      const saldoAtual = Number((contaData as any)?.valor_caixa ?? 0)

      // 3. Debita da conta bancária (CAIXA)
      const { error: updErr } = await supabase
        .from('financeiro_contas' as any)
        .update({ valor_caixa: saldoAtual - body.valor })
        .eq('id', body.contaBancariaId)
      if (updErr) throw updErr

      // 4. Cria movimentação SAIDA
      const parcelaLabel = body.totalParcelas > 1
        ? ` (${body.numeroParcela}/${body.totalParcelas})`
        : ''
      const { error: movErr } = await supabase
        .from('financeiro_movimentacoes' as any)
        .insert({
          conta_id: body.contaBancariaId,
          tipo: 'SAIDA',
          subconta: 'CAIXA',
          motivo: `Conta a pagar: ${body.descricao}${parcelaLabel}`,
          valor: body.valor,
          data: body.dataPagamento,
          transferencia_destino_id: null,
        })
      if (movErr) throw movErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', 'all'] })
    },
  })
}
```

---

## Task 3: UI — Seção "Contas a Pagar" em financeiro.tsx

**Files:**
- Modify: `apps/web/src/pages/financeiro.tsx`

### 3a: Imports
Adicionar ao bloco de imports do lucide-react:
`AlertCircle, Calendar, ChevronDown, ChevronRight, Clock, Layers`

Adicionar ao bloco de imports de use-supabase:
`type ContaPagar, type ContaPagarParcela, useContasPagarParcelas, useCreateContaPagar, useDeleteContaPagar, usePagarParcela`

### 3b: Estado local (dentro de FinanceiroPage)

```typescript
// ─── Contas a Pagar ───
const { data: parcelas = [], isLoading: parcelasLoading } = useContasPagarParcelas()
const createContaPagar = useCreateContaPagar()
const deleteContaPagar = useDeleteContaPagar()
const pagarParcela = usePagarParcela()

// Modal nova conta a pagar
const [cpModalOpen, setCpModalOpen] = useState(false)
const [cpDescricao, setCpDescricao] = useState('')
const [cpCategoria, setCpCategoria] = useState('Materiais')
const [cpObraId, setCpObraId] = useState<string>('')
const [cpObservacoes, setCpObservacoes] = useState('')
const [cpValor, setCpValor] = useState('')
const [cpVencimento, setCpVencimento] = useState('')
const [cpNParcelas, setCpNParcelas] = useState(1)

// Modal pagar parcela
const [pagarModal, setPagarModal] = useState<{ parcela: ContaPagarParcela } | null>(null)
const [pagarContaBancariaId, setPagarContaBancariaId] = useState<string>('')
const [pagarValor, setPagarValor] = useState('')
const [pagarData, setPagarData] = useState('')

// Deletar conta
const [deleteContaPagarId, setDeleteContaPagarId] = useState<string | null>(null)
const [cpPagasExpanded, setCpPagasExpanded] = useState(false)
```

### 3c: Handlers

```typescript
const resetCpForm = () => {
  setCpDescricao('')
  setCpCategoria('Materiais')
  setCpObraId('')
  setCpObservacoes('')
  setCpValor('')
  setCpVencimento('')
  setCpNParcelas(1)
}

const cpValorParsed = parseCurrency(cpValor)
const cpParcelaValor = cpNParcelas > 0 ? cpValorParsed / cpNParcelas : 0

// gera array de parcelas preview
const gerarParcelas = () => {
  if (!cpVencimento || cpValorParsed <= 0) return []
  return Array.from({ length: cpNParcelas }, (_, i) => {
    const d = new Date(`${cpVencimento}T00:00:00`)
    d.setMonth(d.getMonth() + i)
    return {
      numero_parcela: i + 1,
      total_parcelas: cpNParcelas,
      valor: i < cpNParcelas - 1 ? Math.floor(cpParcelaValor * 100) / 100 : cpValorParsed - Math.floor(cpParcelaValor * 100) / 100 * (cpNParcelas - 1),
      vencimento: d.toISOString().split('T')[0],
    }
  })
}

const handleAddContaPagar = async () => {
  if (!cpDescricao.trim() || cpValorParsed <= 0 || !cpVencimento) return
  try {
    await createContaPagar.mutateAsync({
      descricao: cpDescricao.trim(),
      categoria: cpCategoria,
      obra_id: cpObraId || null,
      observacoes: cpObservacoes.trim() || null,
      valor_total: cpValorParsed,
      parcelas: gerarParcelas(),
    })
    setCpModalOpen(false)
    resetCpForm()
  } catch {
    toast({ title: 'Erro ao criar conta a pagar', variant: 'error' })
  }
}

const handleOpenPagarModal = (parcela: ContaPagarParcela) => {
  setPagarModal({ parcela })
  setPagarContaBancariaId(contas[0]?.id ?? '')
  setPagarValor(formatBRL(String(parcela.valor).replace('.', ',')))
  setPagarData(new Date().toISOString().split('T')[0])
}

const handleConfirmarPagamento = async () => {
  if (!pagarModal || !pagarContaBancariaId) return
  try {
    const { parcela } = pagarModal
    await pagarParcela.mutateAsync({
      parcelaId: parcela.id,
      contaBancariaId: pagarContaBancariaId,
      valor: parseCurrency(pagarValor),
      dataPagamento: pagarData,
      descricao: parcela.contas_pagar?.descricao ?? 'Conta a pagar',
      numeroParcela: parcela.numero_parcela,
      totalParcelas: parcela.total_parcelas,
    })
    setPagarModal(null)
    toast({ title: 'Pagamento registrado', variant: 'success' })
  } catch {
    toast({ title: 'Erro ao registrar pagamento', variant: 'error' })
  }
}
```

### 3d: Lógica de agrupamento

```typescript
// Dentro do JSX (antes do return, ou como IIFE no return)
const hoje = new Date()
hoje.setHours(0, 0, 0, 0)
const hojeStr = hoje.toISOString().split('T')[0]

const parcelasAtrasadas = parcelas.filter(p => p.status === 'PENDENTE' && p.vencimento < hojeStr)
const parcelasHoje = parcelas.filter(p => p.status === 'PENDENTE' && p.vencimento === hojeStr)
const parcelasProximas = parcelas.filter(p => p.status === 'PENDENTE' && p.vencimento > hojeStr)
const parcelasPagas = parcelas.filter(p => p.status === 'PAGO')

const totalPendente = [...parcelasAtrasadas, ...parcelasHoje, ...parcelasProximas].reduce((s, p) => s + Number(p.valor), 0)
const totalAtrasado = parcelasAtrasadas.reduce((s, p) => s + Number(p.valor), 0)

const diasAte = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoje.getTime()) / 864e5)
}
```

### 3e: JSX da seção

Ver implementação completa abaixo — este é o componente principal de "Contas a Pagar".

---

## Task 4: TypeScript check

**Step 1:** `cd /path && npx tsc --noEmit`
**Step 2:** Fix any errors found

---

## Task 5: Commit to main

```bash
git add -A
git commit -m "feat(financeiro): add Contas a Pagar with installments and payment flow"
git checkout main
git merge claude/infallible-feistel --no-ff -m "feat(financeiro): add Contas a Pagar with installments and payment flow"
git branch -d claude/infallible-feistel
```
