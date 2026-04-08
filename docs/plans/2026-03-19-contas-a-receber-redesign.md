# Contas a Receber — Redesign Completo

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o `ContasAReceberSection` atual (que filtra movimentações) por um sistema dedicado com tabela própria, CRUD completo e design Apple de nível máximo.

**Architecture:** Criar `contas_receber` + `contas_receber_parcelas` (espelhando `contas_pagar`). Adicionar hooks + schema. Redesenhar o componente UI com resumo, seções por urgência e modais iOS.

**Tech Stack:** Supabase (PostgreSQL), TanStack Query, Framer Motion, Zod, React Hook Form, Lucide Icons, Tailwind v4.

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260319010000_add_contas_receber.sql`

**Step 1: Create the migration**

```sql
-- contas_receber — tabela-pai + parcelas (espelha contas_pagar)

CREATE TABLE IF NOT EXISTS contas_receber (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   TEXT        NOT NULL,
  cliente     TEXT,
  obra_id     UUID        REFERENCES obras(id) ON DELETE SET NULL,
  observacoes TEXT,
  valor_total NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON contas_receber
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contas_receber_parcelas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_receber_id  UUID        NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
  numero_parcela    INTEGER     NOT NULL DEFAULT 1,
  total_parcelas    INTEGER     NOT NULL DEFAULT 1,
  valor             NUMERIC     NOT NULL DEFAULT 0,
  vencimento        DATE        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status IN ('PENDENTE','RECEBIDO','ATRASADO')),
  recebido_em       DATE,
  conta_bancaria_id UUID        REFERENCES financeiro_contas(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contas_receber_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON contas_receber_parcelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast status queries
CREATE INDEX IF NOT EXISTS idx_crp_status ON contas_receber_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_crp_vencimento ON contas_receber_parcelas(vencimento);
```

**Step 2: Apply via MCP**

Use `mcp__e7606b83-725f-4940-9910-77250c4e7efb__apply_migration` with the SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/20260319010000_add_contas_receber.sql
git commit -m "feat(db): add contas_receber + contas_receber_parcelas tables"
```

---

### Task 2: Schema (schemas.ts)

**Files:**
- Modify: `apps/web/src/lib/schemas.ts`

**Add after `createContaPagarSchema`:**

```typescript
// ─── Financeiro — Conta a Receber ────────────────────────
export const createContaReceberSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória (mín. 2 caracteres)'),
  cliente: z.preprocess(emptyToUndefined, z.string().optional()),
  obraId: z.preprocess(emptyToUndefined, z.string().optional()),
  observacoes: z.preprocess(emptyToUndefined, z.string().optional()),
  valor: z
    .number({ invalid_type_error: 'Informe o valor' })
    .positive('Valor deve ser maior que zero'),
  vencimento: z.string().min(1, 'Data de vencimento obrigatória'),
  nParcelas: z.number().int().min(1).max(60).default(1),
})
export type CreateContaReceberInput = z.infer<typeof createContaReceberSchema>
```

---

### Task 3: Hooks (use-supabase.ts)

**Files:**
- Modify: `apps/web/src/hooks/use-supabase.ts`

**Add after the Contas a Pagar section (after `usePagarParcela`):**

```typescript
// ═══════════════════════════════════════════════════════════
// Contas a Receber — tabela-pai + parcelas
// ═══════════════════════════════════════════════════════════

export interface ContaReceber {
  id: string
  descricao: string
  cliente: string | null
  obra_id: string | null
  observacoes: string | null
  valor_total: number
  created_at: string
}

export interface ContaReceberParcela {
  id: string
  conta_receber_id: string
  numero_parcela: number
  total_parcelas: number
  valor: number
  vencimento: string
  status: 'PENDENTE' | 'RECEBIDO' | 'ATRASADO'
  recebido_em: string | null
  conta_bancaria_id: string | null
  created_at: string
  contas_receber?: ContaReceber
}

export function useContasReceberParcelas() {
  return useQuery({
    queryKey: ['contas_receber', 'parcelas'],
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('contas_receber_parcelas' as any)
        .select('*, contas_receber(*)')
        .order('vencimento', { ascending: true })
      if (error) throw error
      return (data || []) as unknown as ContaReceberParcela[]
    },
  })
}

export function useCreateContaReceber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      descricao: string
      cliente: string | null
      obra_id: string | null
      observacoes: string | null
      valor_total: number
      parcelas: Array<{
        numero_parcela: number
        total_parcelas: number
        valor: number
        vencimento: string
      }>
    }) => {
      const { data: cr, error: crErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('contas_receber' as any)
        .insert({
          descricao: body.descricao,
          cliente: body.cliente,
          obra_id: body.obra_id,
          observacoes: body.observacoes,
          valor_total: body.valor_total,
        })
        .select()
        .single()
      if (crErr) throw crErr
      // biome-ignore lint/suspicious/noExplicitAny: Runtime cast
      const contaReceberId = (cr as any).id as string
      const parcelasPayload = body.parcelas.map((p) => ({
        conta_receber_id: contaReceberId,
        numero_parcela: p.numero_parcela,
        total_parcelas: p.total_parcelas,
        valor: p.valor,
        vencimento: p.vencimento,
        status: 'PENDENTE',
      }))
      const { error: pErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('contas_receber_parcelas' as any)
        .insert(parcelasPayload)
      if (pErr) throw pErr
      return cr as unknown as ContaReceber
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas_receber'] }),
  })
}

export function useDeleteContaReceber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('contas_receber' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas_receber'] }),
  })
}

export function useReceberParcela() {
  const qc = useQueryClient()
  return useMutation({
    onMutate: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataRecebimento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      await qc.cancelQueries({ queryKey: ['contas_receber'] })
      await qc.cancelQueries({ queryKey: ['financeiro', 'contas'] })

      const prevParcelas = qc.getQueryData<ContaReceberParcela[]>(['contas_receber', 'parcelas'])
      const prevContas = qc.getQueryData<FinanceiroConta[]>(['financeiro', 'contas'])

      // Optimistically mark as RECEBIDO
      qc.setQueryData<ContaReceberParcela[]>(
        ['contas_receber', 'parcelas'],
        (old) =>
          old?.map((p) =>
            p.id === body.parcelaId
              ? { ...p, status: 'RECEBIDO' as const, recebido_em: body.dataRecebimento, conta_bancaria_id: body.contaBancariaId }
              : p,
          ) ?? [],
      )

      // Optimistically credit conta valor_caixa
      qc.setQueryData<FinanceiroConta[]>(
        ['financeiro', 'contas'],
        (old) =>
          old?.map((c) =>
            c.id === body.contaBancariaId ? { ...c, valor_caixa: c.valor_caixa + body.valor } : c,
          ) ?? [],
      )

      return { prevParcelas, prevContas }
    },

    onError: (_err, _body, ctx) => {
      if (ctx?.prevParcelas !== undefined)
        qc.setQueryData(['contas_receber', 'parcelas'], ctx.prevParcelas)
      if (ctx?.prevContas !== undefined)
        qc.setQueryData(['financeiro', 'contas'], ctx.prevContas)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes', 'all'] })
    },

    mutationFn: async (body: {
      parcelaId: string
      contaBancariaId: string
      valor: number
      dataRecebimento: string
      descricao: string
      numeroParcela: number
      totalParcelas: number
    }) => {
      // 1. Mark parcela RECEBIDO
      const { error: pErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('contas_receber_parcelas' as any)
        .update({
          status: 'RECEBIDO',
          recebido_em: body.dataRecebimento,
          conta_bancaria_id: body.contaBancariaId,
        })
        .eq('id', body.parcelaId)
      if (pErr) throw pErr

      // 2. Credit financial account
      const { data: contaData, error: contaErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('financeiro_contas' as any)
        .select('valor_caixa')
        .eq('id', body.contaBancariaId)
        .single()
      if (contaErr) throw contaErr
      // biome-ignore lint/suspicious/noExplicitAny: Runtime cast
      const saldoAtual = Number((contaData as any)?.valor_caixa ?? 0)

      const { error: updErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('financeiro_contas' as any)
        .update({ valor_caixa: saldoAtual + body.valor })
        .eq('id', body.contaBancariaId)
      if (updErr) throw updErr

      // 3. Create ENTRADA movement
      const parcelaLabel =
        body.totalParcelas > 1 ? ` (${body.numeroParcela}/${body.totalParcelas})` : ''
      const { error: movErr } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: DB type not mapped
        .from('financeiro_movimentacoes' as any)
        .insert({
          conta_id: body.contaBancariaId,
          tipo: 'ENTRADA',
          subconta: 'CAIXA',
          motivo: `Recebimento: ${body.descricao}${parcelaLabel}`,
          valor: body.valor,
          data: body.dataRecebimento,
          transferencia_destino_id: null,
        })
      if (movErr) throw movErr
    },
  })
}
```

---

### Task 4: Redesign ContasAReceberSection (financeiro.tsx)

**Files:**
- Modify: `apps/web/src/pages/financeiro.tsx`

**Design direction:** Apple Wallet/Finance premium. Green as primary accent for receivables (money coming IN). Sections: Atrasadas (red), Vence Hoje (orange), Próximas (blue by month), Recebidas (muted).

**Components to build:**
1. `NovaContaReceberModal` — iOS sheet with descricao, cliente, valor, nParcelas, vencimento, obra picker
2. `ReceberParcelaModal` — choose conta bancária + data
3. `ContasAReceberSection` — full redesign with summary chips + grouped list + empty state

**Key UI details:**
- Summary row at top: 3 chips (Pendente total, Atrasado total, Recebido total)
- Each row: calendar day badge (colored by urgency), descricao/cliente, parcela fraction, valor, countdown badge, "Receber" button
- Atrasadas section has red left-border accent
- Delete button on swipe/hover (calls useDeleteContaReceber)
- Skeleton loading state
- "Tudo em dia" empty state when no pending items

---

### Task 5: Wire into financeiro main component

**Files:**
- Modify: `apps/web/src/pages/financeiro.tsx` (main export)

**Import new hooks:**
```typescript
import {
  type ContaReceberParcela,
  useContasReceberParcelas,
  useCreateContaReceber,
  useDeleteContaReceber,
  useReceberParcela,
} from '@/hooks/use-supabase'
import {
  type CreateContaReceberInput,
  createContaReceberSchema,
} from '@/lib/schemas'
```

**Add to main component body:**
```typescript
const { data: receberParcelas = [], isLoading: receberLoading } = useContasReceberParcelas()
const createContaReceberMutation = useCreateContaReceber()
const deleteContaReceberMutation = useDeleteContaReceber()
const receberParcelaMutation = useReceberParcela()
```

**Replace `<ContasAReceberSection todasMovs={todasMovs} />` with:**
```tsx
<ContasAReceberSection
  parcelas={receberParcelas}
  contas={contas}
  isLoading={receberLoading}
  createMutation={createContaReceberMutation}
  deleteMutation={deleteContaReceberMutation}
  receberMutation={receberParcelaMutation}
  obras={obras}
/>
```

---

### Task 6: TypeScript + Build + Deploy

**Steps:**
1. `cd /path/to/worktree && npx tsc --noEmit` — fix any TS errors
2. `npm run build` — verify no build errors
3. Apply Supabase migration via MCP
4. Commit all changes
5. Deploy to Vercel via MCP
