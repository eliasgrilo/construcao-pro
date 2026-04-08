# Design Spec: Realtime Full Coverage + Bug & Animation Fixes
**Date:** 2026-03-24
**Status:** Approved — v2 (reviewer corrections applied)

---

## 1. Problem Statement

Three classes of defects are degrading ConstruçãoPro:

1. **Realtime is silently dead** — No SQL migration activates the `supabase_realtime` publication for any table, and `use-realtime.ts` omits 12 actively-queried tables from its channel subscription. Result: data never updates in real time across the entire app.

2. **Code quality violations** — `Modal.tsx` uses two `@ts-ignore` suppressions to force-merge refs (incorrect variable name in original workaround + readonly `current` issue). `use-supabase.ts` has ~15 `as any` casts with `biome-ignore` for tables added after `database.ts` was last generated. `dashboard.tsx` declares `type AnyDashboardProp = any`. `notas-fiscais.tsx` uses `(supabase as any).from('produto_fornecedor')`.

3. **Performance regression** — `app-layout.tsx` applies `willChange: 'opacity'` as a static inline style on every page's `motion.div`. This forces the browser to maintain permanent GPU compositor layers for all page content even when idle.

---

## 2. Scope

### In Scope
- Step 0: Regenerate `apps/web/src/types/database.ts` from live Supabase project (required prerequisite — all 28 tables are now present in the remote schema)
- SQL migration: REPLICA IDENTITY FULL + publication enrollment for 22 business-critical tables
- `use-realtime.ts`: expand single channel with 12 new `.on()` handlers covering all actively-queried tables
- `Modal.tsx`: replace two `@ts-ignore` with type-safe `MutableRefObject` assertions using correct variable names (`dragRef`, `containerRef`)
- `app-layout.tsx`: remove static `willChange: 'opacity'` from `motion.div`
- `use-supabase.ts`: replace `as any` + `biome-ignore` for `contas_pagar`, `contas_pagar_parcelas`, `contas_receber`, `contas_receber_parcelas` — now safe after database.ts regeneration
- `notas-fiscais.tsx`: replace `(supabase as any).from('produto_fornecedor')` with properly typed call
- `dashboard.tsx`: replace `AnyDashboardProp = any` with narrowed type

### Out of Scope
- Database schema changes
- New features
- UI redesign
- Framer Motion animation logic changes beyond the `willChange` fix

---

## 3. Database: Real Table Inventory

**All 28 tables in `public` schema** (confirmed via Supabase MCP `list_tables`):

| Table | Actively queried client-side? | Add to realtime? |
|---|---|---|
| `obras` | ✓ | ✓ (already subscribed) |
| `almoxarifados` | ✓ | ✓ **NEW** |
| `categorias` | ✓ | ✓ **NEW** |
| `materiais` | ✓ | ✓ (already subscribed) |
| `estoques` | ✓ | ✓ (already subscribed) |
| `movimentacoes` | ✓ | ✓ **NEW** |
| `fornecedores` | ✓ | ✓ (already subscribed) |
| `notas_fiscais` | ✓ | ✓ (already subscribed) |
| `itens_nf` | ✓ | ✓ **NEW** |
| `financeiro_contas` | ✓ | ✓ (already subscribed) |
| `financeiro_movimentacoes` | ✓ | ✓ (already subscribed) |
| `financeiro_meta` | ✓ | ✓ **NEW** |
| `documento_categorias` | ✓ | ✓ **NEW** |
| `documentos` | ✓ | ✓ (already subscribed) |
| `obra_lancamentos_burocracia` | ✓ | ✓ **NEW** |
| `obra_manutencao` | ✓ | ✓ **NEW** |
| `obra_manutencao_item` | ✓ | ✓ **NEW** |
| `tarefas` | ✓ | ✓ (already subscribed) |
| `contas_pagar` | ✓ | ✓ **NEW** |
| `contas_pagar_parcelas` | ✓ | ✓ (already subscribed) |
| `contas_receber` | ✓ | ✓ **NEW** |
| `contas_receber_parcelas` | ✓ | ✓ **NEW** |
| `produto_fornecedor` | Write-only mutations | ✗ (no standalone query) |
| `obra_venda_parcelas` | No client-side query found | ✗ |
| `nf_match_memoria` | Internal AI cache | ✗ |
| `audit_logs` | Append-only, no query | ✗ |
| `usuario_obras` | Auth/access control | ✗ |
| `usuarios` | Auth profile only | ✗ |

**22 tables will be enrolled in the publication** (10 existing + 12 new).

---

## 4. Architecture

### 4.1 Step 0: Regenerate database.ts

Before any code changes, regenerate `apps/web/src/types/database.ts` using the Supabase MCP `generate_typescript_types` tool. The live schema now includes all 28 tables with full Row/Insert/Update types. This is the prerequisite that makes all `as any` cast removals possible.

### 4.2 SQL Migration: `20260324000000_enable_realtime_all_tables.sql`

```sql
-- REPLICA IDENTITY FULL ensures UPDATE and DELETE events carry the full old row,
-- enabling future per-row cache invalidation without full list refetch.
ALTER TABLE obras                     REPLICA IDENTITY FULL;
ALTER TABLE almoxarifados             REPLICA IDENTITY FULL;
ALTER TABLE categorias                REPLICA IDENTITY FULL;
ALTER TABLE materiais                 REPLICA IDENTITY FULL;
ALTER TABLE estoques                  REPLICA IDENTITY FULL;
ALTER TABLE movimentacoes             REPLICA IDENTITY FULL;
ALTER TABLE fornecedores              REPLICA IDENTITY FULL;
ALTER TABLE notas_fiscais             REPLICA IDENTITY FULL;
ALTER TABLE itens_nf                  REPLICA IDENTITY FULL;
ALTER TABLE financeiro_contas         REPLICA IDENTITY FULL;
ALTER TABLE financeiro_movimentacoes  REPLICA IDENTITY FULL;
ALTER TABLE financeiro_meta           REPLICA IDENTITY FULL;
ALTER TABLE documento_categorias      REPLICA IDENTITY FULL;
ALTER TABLE documentos                REPLICA IDENTITY FULL;
ALTER TABLE obra_lancamentos_burocracia REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao           REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao_item      REPLICA IDENTITY FULL;
ALTER TABLE tarefas                   REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar              REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar_parcelas     REPLICA IDENTITY FULL;
ALTER TABLE contas_receber            REPLICA IDENTITY FULL;
ALTER TABLE contas_receber_parcelas   REPLICA IDENTITY FULL;

-- Enroll all 22 business-critical tables in the supabase_realtime publication.
-- Supabase creates this publication automatically; tables must opt-in explicitly.
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

### 4.3 Hook Expansion: `use-realtime.ts`

The existing single channel `'app-realtime-sync'` gains 12 new `.on('postgres_changes', ...)` handlers. Each has a dedicated debounced invalidator (500ms, matching the existing pattern) to prevent UI thrashing.

**Complete mapping of new handlers → query keys invalidated:**

| Table | Query keys to invalidate |
|---|---|
| `almoxarifados` | `['almoxarifados']`, `['obras']` (count embedded in obra detail) |
| `movimentacoes` | `['movimentacoes']`, `['estoque']`, `['dashboard', 'stats']`, `['dashboard', 'movimentacoes-recentes']` |
| `itens_nf` | `['notas-fiscais']` |
| `documento_categorias` | `['documentos', 'categorias']`, `['documentos', 'lista']` |
| `financeiro_meta` | `['financeiro', 'meta']` |
| `obra_lancamentos_burocracia` | predicate: `q.queryKey[0] === 'obra-lancamentos-burocracia'` |
| `obra_manutencao` | `['obra_manutencao']`, `['dashboard', 'stats']` |
| `obra_manutencao_item` | `['obra_manutencao']` |
| `contas_pagar` | `['contas_pagar']` |
| `contas_receber` | `['contas_receber']`, `['financeiro', 'contas']` |
| `contas_receber_parcelas` | `['contas_receber']`, `['financeiro', 'contas']` |
| `categorias` | `['categorias']`, `['categorias', 'with-count']` |

**Currently subscribed (10, unchanged):**

| Table | Existing invalidation |
|---|---|
| `financeiro_contas` | `['financeiro', 'contas']` |
| `financeiro_movimentacoes` | `['financeiro', 'movimentacoes']` |
| `contas_pagar_parcelas` | `['contas_pagar']` |
| `estoques` | `['estoque']` |
| `obras` | `['obras']`, `['dashboard', 'stats']`, `['dashboard', 'custo-por-obra']` |
| `documentos` | `['documentos']` (matches `['documentos', 'lista']` via prefix) |
| `materiais` | `['materiais']` |
| `tarefas` | `['tarefas']` |
| `notas_fiscais` | `['notas-fiscais']` |
| `fornecedores` | `['fornecedores']` |

Note: `contas_pagar_parcelas` is already in the 10 (not `contas_pagar` parent). `contas_pagar` parent needs its own handler.

### 4.4 Modal.tsx: Type-Safe Ref Merger

**Current (two `@ts-ignore` violations):**
```ts
const assignRefs = (node: HTMLDivElement | null) => {
  if (swipeToDismiss && dragRef) {
    // @ts-ignore
    dragRef.current = node   // ← dragRef is RefObject (readonly .current)
  }
  // @ts-ignore
  containerRef.current = node  // ← same issue
}
```

`useDragToDismiss` returns `ref: elementRef` where `elementRef = useRef<HTMLDivElement>(null)`. `useRef` returns `MutableRefObject<T>` in React's type system, but the return type of `useDragToDismiss` is typed as `React.RefObject<HTMLDivElement>` (readonly). The correct fix is to assert `MutableRefObject` — which is accurate since `useRef(null)` creates a mutable ref:

```ts
const assignRefs = (node: HTMLDivElement | null) => {
  if (swipeToDismiss) {
    ;(dragRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
}
```

Both `@ts-ignore` instances are removed. The variable names `dragRef` and `containerRef` are correct — the earlier spec draft used `ref` by mistake.

### 4.5 app-layout.tsx: Remove Static willChange

**Current (causes permanent GPU layers on all pages):**
```tsx
style={{ willChange: 'opacity', minHeight: '100%' }}
```

**Corrected:**
```tsx
style={{ minHeight: '100%' }}
```

Framer Motion's `LazyMotion` infrastructure automatically promotes GPU compositing layers during animation and demotes them on completion. A static `willChange: 'opacity'` bypasses this lifecycle — the layer is never released, causing cumulative GPU memory pressure on low-end devices.

### 4.6 database.ts: Replace Stale Types

`apps/web/src/types/database.ts` is replaced entirely with the output of `generate_typescript_types` (available from the Supabase MCP). The new types include complete Row/Insert/Update definitions for all 28 tables including `contas_pagar`, `contas_pagar_parcelas`, `contas_receber`, `contas_receber_parcelas`, `financeiro_contas`, `financeiro_movimentacoes`, `documento_categorias`, `obra_manutencao`, `obra_manutencao_item`, `tarefas`, `obra_lancamentos_burocracia`, `financeiro_meta`, and `produto_fornecedor`.

### 4.7 use-supabase.ts: Remove as any Casts

After database.ts is updated (Step 4.6), all `as any` casts for the previously-missing tables can be replaced with direct typed calls. For example:

```ts
// Before:
.from('contas_pagar' as any)

// After (contas_pagar is now in Database['public']['Tables']):
.from('contas_pagar')
```

The `biome-ignore lint/suspicious/noExplicitAny` suppressions accompanying these casts are removed simultaneously.

### 4.8 notas-fiscais.tsx: Fix All (supabase as any) Casts

`notas-fiscais.tsx` contains approximately 20 occurrences of `(supabase as any).from(...)` spread across tables including `itens_nf`, `notas_fiscais`, `materiais`, `contas_pagar`, `produto_fornecedor`, and others. After `database.ts` is regenerated (Step 4.1), every table referenced in these casts becomes properly typed.

**Pattern — remove the `as any` prefix uniformly:**
```ts
// Before:
await (supabase as any).from('produto_fornecedor').upsert(...)
const { data } = await (supabase as any).from('itens_nf').select(...)

// After (all tables now in typed schema):
await supabase.from('produto_fornecedor').upsert(...)
const { data } = await supabase.from('itens_nf').select(...)
```

All `(supabase as any)` occurrences in this file must be removed — not just the `produto_fornecedor` instances. The TypeScript compiler will surface any remaining type mismatches that need individual attention.

### 4.9 dashboard.tsx: Replace AnyDashboardProp

`AnyDashboardProp = any` is used as the prop type for multiple dashboard-internal components. The fix has two steps:

**Step A — Remove the global alias and biome-ignore comment** (the alias exists only to suppress one lint rule at the type declaration site, not per-usage):
```ts
// Remove entirely:
// biome-ignore lint/suspicious/noExplicitAny: Dashboard UI specific prop abstraction layer
type AnyDashboardProp = any
```

**Step B — For each component that used `AnyDashboardProp` as a prop type**: replace with the narrowest accurate type. Where the component receives a typed domain object (e.g., `ObraRow`, `Tarefa`, `ObraManutencao`), inline that type. Where the shape is genuinely heterogeneous (e.g., a callback or generic UI prop), use `unknown` with explicit type guards at the point of use, or `Record<string, unknown>` for lookup maps.

**Success criterion for this item:** The `AnyDashboardProp = any` type alias and its `biome-ignore` comment are deleted. No new `any` type aliases are introduced. TypeScript compiler must report 0 new errors after the changes. If any component prop requires a larger refactor than a type annotation change, that component is out-of-scope and noted explicitly in the PR description.

---

## 5. Files Changed

| File | Change Type |
|------|------------|
| `supabase/migrations/20260324000000_enable_realtime_all_tables.sql` | NEW |
| `apps/web/src/types/database.ts` | REGENERATED (MCP output) |
| `apps/web/src/hooks/use-realtime.ts` | EXPANDED (+12 handlers) |
| `apps/web/src/components/Modal/Modal.tsx` | BUG FIX (2 @ts-ignore removed) |
| `apps/web/src/components/layout/app-layout.tsx` | PERF FIX (willChange removed) |
| `apps/web/src/hooks/use-supabase.ts` | TYPE FIX (~15 as any removed) |
| `apps/web/src/pages/notas-fiscais.tsx` | TYPE FIX (supabase as any removed) |
| `apps/web/src/pages/dashboard.tsx` | TYPE FIX (AnyDashboardProp removed) |

---

## 6. Success Criteria

- [ ] 22 business-critical tables enrolled in `supabase_realtime` publication
- [ ] All 22 tables have `REPLICA IDENTITY FULL`
- [ ] `use-realtime.ts` single channel subscribes to all 22 tables (10 existing + 12 new)
- [ ] All 12 new handlers have correct query key invalidation (verified against use-supabase.ts)
- [ ] Zero `@ts-ignore` in `Modal.tsx`
- [ ] Zero `as any` + `biome-ignore` in `use-supabase.ts` for the 5 previously-stale tables
- [ ] `(supabase as any)` eliminated from `notas-fiscais.tsx`
- [ ] `AnyDashboardProp = any` eliminated from `dashboard.tsx`
- [ ] `willChange: 'opacity'` removed from `app-layout.tsx`
- [ ] `database.ts` contains all 28 tables with complete types
- [ ] TypeScript compiler reports 0 new errors
- [ ] Biome reports 0 new lint violations

---

## 7. Execution Order (dependency-safe)

1. Regenerate `database.ts` (prerequisite — all type fixes depend on this)
2. Apply SQL migration via Supabase MCP `apply_migration`
3. Update `use-realtime.ts` (no dependencies)
4. Fix `Modal.tsx` (no dependencies)
5. Fix `app-layout.tsx` (no dependencies)
6. Fix `use-supabase.ts` (depends on step 1)
7. Fix `notas-fiscais.tsx` (depends on step 1)
8. Fix `dashboard.tsx` (no external dependencies)

---

## 8. Risk Assessment

**Low risk overall.** All changes are additive or subtractive with no logic restructuring:
- SQL migration is append-only (REPLICA IDENTITY + publication enrollment, no schema changes)
- Hook expansion adds handlers to an existing channel — does not recreate or replace it
- `willChange` removal is invisible to users; Framer Motion manages GPU promotion natively
- Type regeneration is non-breaking — only adds types that were missing; existing code references remain valid
- `@ts-ignore` → type assertion: semantically equivalent, TypeScript verifies the assertion
