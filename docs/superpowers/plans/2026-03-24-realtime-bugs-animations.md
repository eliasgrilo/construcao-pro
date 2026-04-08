# Realtime Full Coverage + Bug & Animation Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate Supabase Realtime for all 22 business-critical tables, eliminate all `@ts-ignore`/`as any` violations, remove a GPU layer regression, and update stale database types — turning ConstruçãoPro into a fully live, type-safe, 60fps application.

**Architecture:** Single Supabase channel `'app-realtime-sync'` expanded from 10 to 22 table subscriptions via a new SQL migration that enables REPLICA IDENTITY FULL and publication enrollment. All `as any` casts are removed by first regenerating `database.ts` from the live Supabase schema, then surgically replacing each cast site with the now-available types.

**Tech Stack:** React 18, Supabase JS v2, TanStack Query v5, Framer Motion v11, TypeScript 5.5, Biome (lint/format), Vite 6. No unit test suite — verification is `tsc --noEmit` + `biome check` + `vite build`.

**Spec:** `docs/superpowers/specs/2026-03-24-realtime-bugs-animations-design.md`

---

## Verification Commands (run after each task)

```bash
# From apps/web directory:
cd /Users/grilo/Code/construcao-pro/.claude/worktrees/practical-blackburn/apps/web

# TypeScript check (zero errors required)
npx tsc --noEmit 2>&1 | head -30

# Biome lint (zero violations required)
npm run lint 2>&1 | tail -20

# Production build (must succeed)
npm run build 2>&1 | tail -10
```

---

## File Map

| File | Action | Task |
|------|--------|------|
| `supabase/migrations/20260324000000_enable_realtime_all_tables.sql` | CREATE | 1 |
| `apps/web/src/types/database.ts` | REPLACE (MCP regen) | 2 |
| `apps/web/src/components/Modal/Modal.tsx` | EDIT lines 113–120 | 3 |
| `apps/web/src/components/layout/app-layout.tsx` | EDIT line 105 | 4 |
| `apps/web/src/hooks/use-realtime.ts` | EDIT — expand channel | 5 |
| `apps/web/src/hooks/use-supabase.ts` | EDIT — remove as any | 6 |
| `apps/web/src/pages/notas-fiscais.tsx` | EDIT — remove (supabase as any) | 7 |
| `apps/web/src/pages/dashboard.tsx` | EDIT — replace AnyDashboardProp | 8 |

---

## Task 1: SQL Migration — Enable Realtime for All Tables

**Files:**
- Create: `supabase/migrations/20260324000000_enable_realtime_all_tables.sql`

**Context:** Supabase Realtime uses PostgreSQL's logical replication. For a table to send `postgres_changes` events to clients, it must be (a) enrolled in the `supabase_realtime` publication and (b) have `REPLICA IDENTITY FULL` set so UPDATE/DELETE events carry full row data. Neither has been done for any table in this project.

- [ ] **Step 1.1: Create the migration file**

```sql
-- supabase/migrations/20260324000000_enable_realtime_all_tables.sql
-- ─────────────────────────────────────────────────────────────────
-- REPLICA IDENTITY FULL: UPDATE and DELETE events carry the full old row.
-- Required for postgres_changes to be useful beyond INSERT-only monitoring.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE obras                       REPLICA IDENTITY FULL;
ALTER TABLE almoxarifados               REPLICA IDENTITY FULL;
ALTER TABLE categorias                  REPLICA IDENTITY FULL;
ALTER TABLE materiais                   REPLICA IDENTITY FULL;
ALTER TABLE estoques                    REPLICA IDENTITY FULL;
ALTER TABLE movimentacoes               REPLICA IDENTITY FULL;
ALTER TABLE fornecedores                REPLICA IDENTITY FULL;
ALTER TABLE notas_fiscais               REPLICA IDENTITY FULL;
ALTER TABLE itens_nf                    REPLICA IDENTITY FULL;
ALTER TABLE financeiro_contas           REPLICA IDENTITY FULL;
ALTER TABLE financeiro_movimentacoes    REPLICA IDENTITY FULL;
ALTER TABLE financeiro_meta             REPLICA IDENTITY FULL;
ALTER TABLE documento_categorias        REPLICA IDENTITY FULL;
ALTER TABLE documentos                  REPLICA IDENTITY FULL;
ALTER TABLE obra_lancamentos_burocracia REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao             REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao_item        REPLICA IDENTITY FULL;
ALTER TABLE tarefas                     REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar                REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar_parcelas       REPLICA IDENTITY FULL;
ALTER TABLE contas_receber              REPLICA IDENTITY FULL;
ALTER TABLE contas_receber_parcelas     REPLICA IDENTITY FULL;

-- ─────────────────────────────────────────────────────────────────
-- Enroll all 22 business-critical tables in the supabase_realtime
-- publication. Tables excluded: usuarios, usuario_obras, audit_logs,
-- nf_match_memoria, produto_fornecedor (write-only), obra_venda_parcelas
-- (no client-side query found).
-- ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE obras;
ALTER PUBLICATION supabase_realtime ADD TABLE almoxarifados;
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE materiais;
ALTER PUBLICATION supabase_realtime ADD TABLE estoques;
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE fornecedores;
ALTER PUBLICATION supabase_realtime ADD TABLE notas_fiscais;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_nf;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_contas;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE documento_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_lancamentos_burocracia;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_manutencao;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_manutencao_item;
ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_pagar;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_pagar_parcelas;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_receber;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_receber_parcelas;
```

- [ ] **Step 1.2: Apply migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with:
- `project_id`: `vjiabffqqwxuqrybvgat`
- `name`: `enable_realtime_all_tables`
- `query`: (the SQL above)

Expected result: migration applied successfully, no errors.

- [ ] **Step 1.3: Verify via Supabase MCP `execute_sql`**

Run this query to confirm enrollment:
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Expected: 22 rows including all tables listed above.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260324000000_enable_realtime_all_tables.sql
git commit -m "feat(db): enable realtime publication + REPLICA IDENTITY FULL for 22 tables"
```

---

## Task 2: Regenerate database.ts (Prerequisite for Tasks 6, 7)

**Files:**
- Replace: `apps/web/src/types/database.ts`

**Context:** The current `database.ts` has 14 tables. The live Supabase schema has 28 tables. Tables like `contas_pagar`, `financeiro_contas`, `financeiro_movimentacoes`, `contas_receber`, `contas_receber_parcelas`, `documento_categorias`, `obra_manutencao`, `obra_manutencao_item`, `tarefas`, `documentos`, `produto_fornecedor`, `obra_lancamentos_burocracia`, `financeiro_meta`, and `nf_match_memoria` are absent from the current types. After regeneration, all `as any` casts for these tables can be removed.

- [ ] **Step 2.1: Regenerate types via Supabase MCP**

Use the Supabase MCP tool `generate_typescript_types` with:
- `project_id`: `vjiabffqqwxuqrybvgat`

Copy the entire output string.

- [ ] **Step 2.2: Replace database.ts**

Overwrite `apps/web/src/types/database.ts` entirely with the generated content. The new file will contain all 28 tables with complete `Row`, `Insert`, `Update`, and `Relationships` types.

- [ ] **Step 2.3: Verify TypeScript still compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: same or fewer errors than before (the new types should only add, never break existing references). If new errors appear, they are caused by existing code misusing the now-correctly-typed tables — note them and proceed.

- [ ] **Step 2.4: Commit**

```bash
git add apps/web/src/types/database.ts
git commit -m "chore(types): regenerate database.ts — adds 14 missing tables"
```

---

## Task 3: Fix Modal.tsx — Remove @ts-ignore (2 instances)

**Files:**
- Modify: `apps/web/src/components/Modal/Modal.tsx` lines 113–120

**Context:** `assignRefs` uses two `@ts-ignore` suppressions to write to ref `.current`. The suppression is needed because `useDragToDismiss` returns `{ ref: RefObject<HTMLDivElement> }` (readonly `.current`), but both refs are created with `useRef(null)` inside their respective hooks — making them `MutableRefObject` at runtime. The `@ts-ignore` hides the type mismatch; the correct fix is an explicit cast to `MutableRefObject` which accurately reflects the runtime type.

- [ ] **Step 3.1: Replace the assignRefs function**

In `apps/web/src/components/Modal/Modal.tsx`, find and replace the `assignRefs` function (lines 113–120):

```tsx
// BEFORE:
const assignRefs = (node: HTMLDivElement | null) => {
  if (swipeToDismiss && dragRef) {
    // @ts-ignore
    dragRef.current = node
  }
  // @ts-ignore
  containerRef.current = node
}

// AFTER:
const assignRefs = (node: HTMLDivElement | null) => {
  if (swipeToDismiss) {
    ;(dragRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
}
```

Note: The `if (swipeToDismiss && dragRef)` guard is simplified to `if (swipeToDismiss)` — `dragRef` is always an object (the ref itself), never nullish.

- [ ] **Step 3.2: Verify no TypeScript errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep Modal
```

Expected: no output (no errors in Modal.tsx).

- [ ] **Step 3.3: Verify Biome passes**

```bash
cd apps/web && npm run lint -- --reporter=compact 2>&1 | grep Modal
```

Expected: no output (no violations in Modal.tsx).

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/src/components/Modal/Modal.tsx
git commit -m "fix(modal): replace @ts-ignore with MutableRefObject type assertion"
```

---

## Task 4: Fix app-layout.tsx — Remove Static willChange

**Files:**
- Modify: `apps/web/src/components/layout/app-layout.tsx` line 105

**Context:** `willChange: 'opacity'` on the `motion.div` that wraps every page tells the browser to create and maintain a GPU compositor layer for every page's entire content tree permanently — including when nothing is animating. Framer Motion already manages `will-change` internally during animations. This static declaration prevents layer promotion/demotion and causes cumulative GPU memory pressure, especially noticeable on mobile.

- [ ] **Step 4.1: Remove willChange from the motion.div**

In `apps/web/src/components/layout/app-layout.tsx`, find the `motion.div` inside `<AnimatePresence>`:

```tsx
// BEFORE (line ~105):
style={{ willChange: 'opacity', minHeight: '100%' }}

// AFTER:
style={{ minHeight: '100%' }}
```

- [ ] **Step 4.2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep app-layout
```

Expected: no output.

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/src/components/layout/app-layout.tsx
git commit -m "perf(layout): remove static willChange — Framer Motion manages GPU layers automatically"
```

---

## Task 5: Expand use-realtime.ts — 12 New Table Subscriptions

**Files:**
- Replace: `apps/web/src/hooks/use-realtime.ts`

**Context:** The existing hook subscribes to 10 tables in a single channel. We add 12 new handlers following the identical debounce pattern. Each new handler maps to specific React Query cache keys that the invalidation must target.

- [ ] **Step 5.1: Replace use-realtime.ts entirely**

```ts
import { supabase } from '@/lib/supabase'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

// Debounce helper — collapses rapid-fire invalidations into one
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function useRealtimeSync() {
  const qc = useQueryClient()
  const setStatus = useRealtimeStore((s) => s.setStatus)
  const statusRef = useRef(useRealtimeStore.getState().status)

  // Keep ref in sync so the subscribe callback can read latest status
  useEffect(() => {
    return useRealtimeStore.subscribe((state) => {
      statusRef.current = state.status
    })
  }, [])

  // Refresh all queries when user returns to the app (mobile resume).
  // This is critical on iOS where the app can be suspended for minutes.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        qc.invalidateQueries()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [qc])

  useEffect(() => {
    // ─── Existing invalidators (10 tables) ───────────────────────
    const invalidateFinContas = debounce(
      () => qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
      500,
    )
    const invalidateFinMov = debounce(
      () => qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes'] }),
      500,
    )
    const invalidateContasPagar = debounce(
      () => qc.invalidateQueries({ queryKey: ['contas_pagar'] }),
      500,
    )
    const invalidateEstoque = debounce(() => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
    }, 500)
    const invalidateObras = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'custo-por-obra'] })
    }, 500)
    const invalidateDocumentos = debounce(() => {
      qc.invalidateQueries({ queryKey: ['documentos'] })
    }, 500)
    const invalidateMateriais = debounce(() => {
      qc.invalidateQueries({ queryKey: ['materiais'] })
    }, 500)
    const invalidateTarefas = debounce(() => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    }, 500)
    const invalidateNFs = debounce(() => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
    }, 500)
    const invalidateFornecedores = debounce(() => {
      qc.invalidateQueries({ queryKey: ['fornecedores'] })
    }, 500)

    // ─── New invalidators (12 tables) ────────────────────────────
    const invalidateAlmoxarifados = debounce(() => {
      qc.invalidateQueries({ queryKey: ['almoxarifados'] })
      // obras list embeds almoxarifado count via .select('*, almoxarifados(count)')
      qc.invalidateQueries({ queryKey: ['obras'] })
    }, 500)
    const invalidateMovimentacoes = debounce(() => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'movimentacoes-recentes'] })
    }, 500)
    const invalidateItensNf = debounce(() => {
      qc.invalidateQueries({ queryKey: ['notas-fiscais'] })
    }, 500)
    const invalidateDocumentoCategorias = debounce(() => {
      qc.invalidateQueries({ queryKey: ['documentos', 'categorias'] })
      qc.invalidateQueries({ queryKey: ['documentos', 'lista'] })
    }, 500)
    const invalidateFinanceiroMeta = debounce(() => {
      qc.invalidateQueries({ queryKey: ['financeiro', 'meta'] })
    }, 500)
    const invalidateBurocracia = debounce(() => {
      // Predicate: matches ['obra-lancamentos-burocracia', anyObraId]
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'obra-lancamentos-burocracia',
      })
    }, 500)
    const invalidateManutencao = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obra_manutencao'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    }, 500)
    const invalidateManutencaoItem = debounce(() => {
      qc.invalidateQueries({ queryKey: ['obra_manutencao'] })
    }, 500)
    const invalidateContasPagarParent = debounce(() => {
      qc.invalidateQueries({ queryKey: ['contas_pagar'] })
    }, 500)
    const invalidateContasReceber = debounce(() => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
    }, 500)
    const invalidateContasReceberParcelas = debounce(() => {
      qc.invalidateQueries({ queryKey: ['contas_receber'] })
      qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] })
    }, 500)
    const invalidateCategorias = debounce(() => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['categorias', 'with-count'] })
    }, 500)

    const channel = supabase
      .channel('app-realtime-sync')
      // ─── Existing 10 subscriptions ────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_contas' }, () =>
        invalidateFinContas(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financeiro_movimentacoes' },
        () => invalidateFinMov(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contas_pagar_parcelas' },
        () => invalidateContasPagar(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoques' }, () =>
        invalidateEstoque(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obras' }, () =>
        invalidateObras(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos' }, () =>
        invalidateDocumentos(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materiais' }, () =>
        invalidateMateriais(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () =>
        invalidateTarefas(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_fiscais' }, () =>
        invalidateNFs(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fornecedores' }, () =>
        invalidateFornecedores(),
      )
      // ─── New 12 subscriptions ──────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'almoxarifados' }, () =>
        invalidateAlmoxarifados(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () =>
        invalidateMovimentacoes(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_nf' }, () =>
        invalidateItensNf(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documento_categorias' },
        () => invalidateDocumentoCategorias(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_meta' }, () =>
        invalidateFinanceiroMeta(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obra_lancamentos_burocracia' },
        () => invalidateBurocracia(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obra_manutencao' }, () =>
        invalidateManutencao(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obra_manutencao_item' },
        () => invalidateManutencaoItem(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_pagar' }, () =>
        invalidateContasPagarParent(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_receber' }, () =>
        invalidateContasReceber(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contas_receber_parcelas' },
        () => invalidateContasReceberParcelas(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () =>
        invalidateCategorias(),
      )
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          // Just reconnected — invalidate all active queries to ensure fresh data
          if (statusRef.current === 'RECONNECTING' || statusRef.current === 'DISCONNECTED') {
            qc.invalidateQueries()
          }
          setStatus('CONNECTED')
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('RECONNECTING')
        } else if (channelStatus === 'CLOSED') {
          setStatus('DISCONNECTED')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc, setStatus])
}
```

- [ ] **Step 5.2: Verify TypeScript and Biome**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep use-realtime
cd apps/web && npm run lint -- --reporter=compact 2>&1 | grep use-realtime
```

Expected: no output for either command.

- [ ] **Step 5.3: Commit**

```bash
git add apps/web/src/hooks/use-realtime.ts
git commit -m "feat(realtime): expand channel to cover all 22 business-critical tables"
```

---

## Task 6: Remove as any Casts in use-supabase.ts

**Files:**
- Modify: `apps/web/src/hooks/use-supabase.ts`

**Context:** After database.ts regeneration (Task 2), tables `financeiro_contas`, `financeiro_movimentacoes`, `contas_pagar`, `contas_pagar_parcelas`, `contas_receber`, `contas_receber_parcelas` are now fully typed. Remove all `.from('table_name' as any)` patterns for these tables, plus remove corresponding `as any as InterfaceName` return casts. Some `as any` for RPC parameter objects may remain if the RPC return type doesn't fully match — note these with a comment instead of suppressing blindly.

- [ ] **Step 6.1: Fix financeiro_contas table references**

Search for all occurrences of `.from('financeiro_contas' as any)` (lines 1110, 1132, 1150, 1170 approx) and change to `.from('financeiro_contas')`.

For each `return data as any as FinanceiroConta` pattern, use a direct type cast via the generated type:

```ts
// Before:
.from('financeiro_contas' as any)
// ...
return (data || []) as any as FinanceiroConta[]

// After:
.from('financeiro_contas')
// ...
return (data || []) as unknown as FinanceiroConta[]
```

Note: `as unknown as T` is the correct TS-safe bridge when the Supabase query return type is `T | null` but the caller expects `T[]`. This is NOT an `any` cast — `unknown` forces explicit acknowledgment of the type gap.

Remove the `// biome-ignore lint/suspicious/noExplicitAny: DB type not mapped` comments that accompanied these casts.

- [ ] **Step 6.2: Fix financeiro_movimentacoes table references**

Same pattern — replace `.from('financeiro_movimentacoes' as any)` with `.from('financeiro_movimentacoes')` (lines 1190, 1244, 1260, 1281 approx). Remove associated `biome-ignore` comments.

- [ ] **Step 6.3: Fix contas_pagar table references**

Replace `.from('contas_pagar' as any)` with `.from('contas_pagar')` (lines 1436, 1466, 1491, 1506, 1523 approx). Remove associated `biome-ignore` comments.

For return type casts like `return cp as unknown as ContaPagar` — the `as unknown as T` bridge is acceptable here since Supabase's `.single()` returns `T | null` but the caller has already checked `if (cpErr) throw cpErr`.

- [ ] **Step 6.4: Fix contas_pagar_parcelas table references**

Same as above — `.from('contas_pagar_parcelas' as any)` → `.from('contas_pagar_parcelas')`. Lines 1491, 1601 approx.

- [ ] **Step 6.5: Fix contas_receber and contas_receber_parcelas table references**

`.from('contas_receber' as any)` → `.from('contas_receber')` (lines 1681, 1708 approx).
`.from('contas_receber_parcelas' as any)` → `.from('contas_receber_parcelas')`.

- [ ] **Step 6.6: Verify no regressions — run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

If new TypeScript errors appear, fix them at the point of error — do NOT add new `as any` casts. Use `as unknown as T` where a type-safe bridge is needed.

- [ ] **Step 6.7: Verify Biome**

```bash
cd apps/web && npm run lint -- --reporter=compact 2>&1 | grep use-supabase
```

Expected: no output (no violations).

- [ ] **Step 6.8: Commit**

```bash
git add apps/web/src/hooks/use-supabase.ts
git commit -m "fix(types): remove as-any casts in use-supabase.ts — tables now in generated types"
```

---

## Task 7: Fix notas-fiscais.tsx — Remove All (supabase as any) Casts

**Files:**
- Modify: `apps/web/src/pages/notas-fiscais.tsx`

**Context:** `notas-fiscais.tsx` has 20 occurrences of `(supabase as any).from(...)` spread across tables including `itens_nf`, `notas_fiscais`, `materiais`, `contas_pagar`, `produto_fornecedor`, and others. After database.ts regeneration (Task 2), all of these tables are typed. The fix is uniform: remove the `as any` prefix from every occurrence.

- [ ] **Step 7.1: Replace all (supabase as any) occurrences**

Use the editor's find-and-replace to change every `(supabase as any).from(` to `supabase.from(` across the entire file.

The 20 occurrences are at approximately lines: 270, 295, 315, 322, 331, 2254, 2358, 2752, 2777, 2786, 2789, 2856, 2870, 2895, 2911, 3034, 3073, 3079, 3318, 3347.

- [ ] **Step 7.2: Check for TypeScript errors from the replacements**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep notas-fiscais
```

For any errors that appear, apply the minimum fix at the exact error site:
- If a table's `.select()` return type is too wide → narrow with `as unknown as ExpectedType[]`
- If an `.insert()` payload type doesn't match → add explicit `satisfies` or narrow the input

Do NOT re-introduce `as any`. Use `as unknown as T` as the bridge.

- [ ] **Step 7.3: Verify Biome**

```bash
cd apps/web && npm run lint -- --reporter=compact 2>&1 | grep notas-fiscais
```

Expected: no output.

- [ ] **Step 7.4: Commit**

```bash
git add apps/web/src/pages/notas-fiscais.tsx
git commit -m "fix(types): remove (supabase as any) casts in notas-fiscais.tsx"
```

---

## Task 8: Fix dashboard.tsx — Replace AnyDashboardProp

**Files:**
- Modify: `apps/web/src/pages/dashboard.tsx`

**Context:** `type AnyDashboardProp = any` is declared at line 58 and used 46 more times. All usages are internal dashboard components. The fix requires defining a proper interface per component. The import `ObraRow` is already available from `@/hooks/use-supabase`. The `Tarefa`, `ObraManutencao`, `ObraManutencaoItem` types are also exported from there.

- [ ] **Step 8.1: Delete the AnyDashboardProp type alias (lines 58-59)**

Remove these two lines entirely:
```ts
// biome-ignore lint/suspicious/noExplicitAny: Dashboard UI specific prop abstraction layer
type AnyDashboardProp = any
```

- [ ] **Step 8.2: Add per-component prop interfaces above DashboardSaldo**

Insert the following interfaces after the `const clr = ...` declaration (line 62):

```ts
// ─── Dashboard-internal prop interfaces ─────────────────────────
interface DashboardSaldoProps {
  totalDisponivel: number
  contasLoading: boolean
  totalCaixa: number
  totalAplicado: number
}

interface DashboardStats {
  custoTotal: number
  orcamentoTotal: number
  obrasAtivas: number
  totalObras: number
}

interface DashboardOrcamentoProps {
  pct: number
  s: DashboardStats | undefined
  obrasData: Array<{ status: string }> | undefined
  onNavigateObras: () => void
}

interface DashboardInsightsProps {
  setChecklistOpen: (v: boolean) => void
  pendingCount: number
  clr: typeof clr
  onNavigateObras: () => void
  terrenosStandby: number
  totalTerrenos: number
}

interface DashboardChecklistResumoPendingPreviewProps {
  tasks: Tarefa[]
  clr: typeof clr
}

interface DashboardChecklistResumoHeaderProps {
  pendingCount: number
  doneCount: number
  clr: typeof clr
  tasks: Tarefa[]
}

interface DashboardChecklistResumoProps {
  tasks: Tarefa[]
  pendingCount: number
  doneCount: number
  clr: typeof clr
  checklistState: ReturnType<typeof useDashboardTarefasState>
}

interface DashboardObrasAtivasListProps {
  obras: ObraRow[]
  navigate: ReturnType<typeof useNavigate>
}

interface DashboardAtividadeRecenteListProps {
  movs: Record<string, unknown>[]
  navigate: ReturnType<typeof useNavigate>
  tipos: Record<string, { label: string; color: string; Icon: React.ComponentType }>
}

interface DashboardAlertasEstoqueListEmptyProps {
  clr: typeof clr
}

interface DashboardAlertasEstoqueListHeaderProps {
  alertas: Record<string, unknown>[]
  clr: typeof clr
  estoqueExpanded: boolean
}

interface DashboardAlertasEstoqueListProps {
  alertas: Record<string, unknown>[]
  clr: typeof clr
  estoqueExpanded: boolean
  setEstoqueExpanded: (v: boolean) => void
}
```

- [ ] **Step 8.3: Update component signatures to use the new interfaces**

Replace `AnyDashboardProp` in each function signature with its proper interface:

| Component/Function | Replace with |
|---|---|
| `DashboardSaldo({ ... }: AnyDashboardProp)` | `DashboardSaldoProps` |
| `DashboardOrcamento({ ... }: AnyDashboardProp)` | `DashboardOrcamentoProps` |
| `DashboardInsights({ ... }: AnyDashboardProp)` | `DashboardInsightsProps` |
| `DashboardChecklistResumoPendingPreview({ ... }: AnyDashboardProp)` | `DashboardChecklistResumoPendingPreviewProps` |
| `DashboardChecklistResumoHeader({ ... }: AnyDashboardProp)` | `DashboardChecklistResumoHeaderProps` |
| `DashboardChecklistResumo({ ... }: AnyDashboardProp)` | `DashboardChecklistResumoProps` |
| `DashboardObrasAtivasList({ ... }: AnyDashboardProp)` | `DashboardObrasAtivasListProps` |
| `DashboardAtividadeRecenteList({ ... }: AnyDashboardProp)` | `DashboardAtividadeRecenteListProps` |
| `DashboardAlertasEstoqueListEmpty({ ... }: AnyDashboardProp)` | `DashboardAlertasEstoqueListEmptyProps` |
| `DashboardAlertasEstoqueListHeader({ ... }: AnyDashboardProp)` | `DashboardAlertasEstoqueListHeaderProps` |
| `DashboardAlertasEstoqueList({ ... }: AnyDashboardProp)` | `DashboardAlertasEstoqueListProps` |

- [ ] **Step 8.4: Fix remaining AnyDashboardProp usages inside function bodies**

After fixing the signatures, the remaining `AnyDashboardProp` usages are inside function bodies for inline `.map()` callbacks and the `useDashboardTarefasState` hook parameters. Replace each:

```ts
// Line ~910 — filter callback:
obrasData?.filter((o: AnyDashboardProp) => o.status === st.key)
// → Since obrasData is now Array<{ status: string }>, the inline type is already inferred.
//   Remove the explicit cast:
obrasData?.filter((o) => o.status === st.key)

// Lines ~1203-1208 — useDashboardTarefasState params:
function useDashboardTarefasState(
  contextObra: AnyDashboardProp,
  createTarefa: AnyDashboardProp,
  updateTarefa: AnyDashboardProp,
  deleteTarefa: AnyDashboardProp,
  tasks: AnyDashboardProp[],
  toast: AnyDashboardProp,
)
// →
function useDashboardTarefasState(
  contextObra: { id: string; nome: string } | null,
  createTarefa: ReturnType<typeof useCreateTarefa>,
  updateTarefa: ReturnType<typeof useUpdateTarefa>,
  deleteTarefa: ReturnType<typeof useDeleteTarefa>,
  tasks: Tarefa[],
  toast: (opts: { title: string; variant?: string }) => void,
)

// Line ~1235 — tasks.find callback:
const t = tasks.find((x: AnyDashboardProp) => x.id === id)
// → Remove explicit cast (TypeScript infers from Tarefa[]):
const t = tasks.find((x) => x.id === id)

// Line ~1257 — startEdit callback:
const startEdit = useCallback((t: AnyDashboardProp) => {
// → Use Tarefa type:
const startEdit = useCallback((t: Tarefa) => {

// Lines ~1359, 1394 — obras.map / movs.map:
obras.map((obra: AnyDashboardProp) => ...)
(movs as AnyDashboardProp[]).map((mov: AnyDashboardProp, i: number) => ...)
// → With typed arrays, the callbacks are inferred — remove explicit casts
obras.map((obra) => ...)
movs.map((mov, i) => ...)

// Line ~2337 — DashboardChecklistContextDropdown:
activeObras: AnyDashboardProp[]
// → Use ObraRow[]:
activeObras: ObraRow[]
```

For any remaining `AnyDashboardProp` usages not covered above, apply the same pattern: remove the `AnyDashboardProp` annotation and let TypeScript infer from context, or add the narrowest accurate type.

- [ ] **Step 8.5: Verify TypeScript with zero new errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep dashboard
```

If errors appear, resolve each individually at the error site. Do NOT re-introduce `any`. If a prop shape is genuinely heterogeneous (multiple different structures), use a discriminated union or `unknown` with a type guard.

- [ ] **Step 8.6: Verify Biome**

```bash
cd apps/web && npm run lint -- --reporter=compact 2>&1 | grep dashboard
```

Expected: no output.

- [ ] **Step 8.7: Commit**

```bash
git add apps/web/src/pages/dashboard.tsx
git commit -m "fix(types): replace AnyDashboardProp = any with proper per-component interfaces"
```

---

## Task 9: Final Verification — Full Build

- [ ] **Step 9.1: Full TypeScript check (entire project)**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

Expected: 0 errors. If errors exist, fix each one — no suppressions.

- [ ] **Step 9.2: Full Biome check**

```bash
cd apps/web && npm run lint 2>&1
```

Expected: 0 violations. If violations exist, fix each one.

- [ ] **Step 9.3: Production build**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 9.4: Verify zero @ts-ignore and no raw `as any` aliases**

```bash
grep -rn "@ts-ignore\|: any\b\|= any\b" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v "biome-ignore\|// " | head -20
```

Expected: no output (zero remaining `@ts-ignore` or unguarded `any` types).

- [ ] **Step 9.5: Final commit and push**

```bash
git add -A
git status  # verify only expected files changed
git commit -m "chore: final verification pass — zero TS errors, zero Biome violations, build succeeds"
```

---

## Summary

| Task | What it fixes | Risk |
|------|--------------|------|
| 1 | Realtime silently dead — SQL layer | Zero — additive migration |
| 2 | Stale database.ts — 14 missing tables | Zero — additive types |
| 3 | Modal @ts-ignore × 2 | Zero — equivalent runtime behavior |
| 4 | willChange GPU layer regression | Zero — invisible to users |
| 5 | 12 tables missing from realtime hook | Zero — additive channel handlers |
| 6 | ~15 as any in use-supabase.ts | Low — type-safe bridges replace casts |
| 7 | 20 (supabase as any) in notas-fiscais.tsx | Low — TypeScript now verifies calls |
| 8 | AnyDashboardProp = any (47 usages) | Medium — requires per-component interface definitions |
