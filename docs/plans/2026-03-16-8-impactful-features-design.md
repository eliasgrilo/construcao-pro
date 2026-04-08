# Design: 8 Impactful Features — construcao-pro

**Date:** 2026-03-16
**Status:** Approved

---

## 1. Realtime Reconnection Handling

**Goal:** Users always know if data is live or stale.

**Design:**
- Extend `useRealtimeSync` to accept a `subscribe()` status callback
- Track status in a Zustand slice or React context: `CONNECTED | RECONNECTING | DISCONNECTED`
- `RealtimeStatusBanner` component in `AppLayout` — appears at top when not CONNECTED
- On reconnect (SUBSCRIBED after error): `qc.invalidateQueries()` — full refetch
- No polling, purely event-driven via Supabase channel status

---

## 2. ErrorBoundary Per Page

**Goal:** One page crashing cannot take down the whole app.

**Design:**
- Current: single `QueryErrorBoundary` wraps all pages in `AuthGuard`
- New: each route component wraps its page in its own `<ErrorBoundary>` with page-scoped reset
- Route-level boundaries isolate crashes: financeiro crash doesn't affect estoque
- Reuse existing `ErrorBoundary` + `QueryErrorBoundary` components

---

## 3. Pagination (Client-Side)

**Goal:** Lists stay fast as data grows, without backend schema changes.

**Design:**
- Client-side pagination via TanStack Table `getPaginationRowModel()`
- 25 rows/page default, user-selectable (10/25/50)
- `PaginationBar` component: previous/next, page indicator, row count
- Apply to: `financeiro` movimentações, `estoque`, `fornecedores`, `materiais`
- `DataTable` component already uses TanStack Table — add `enablePagination` prop

---

## 4. Undo for Destructive Actions

**Goal:** Accidental deletes in a financial app are costly — give 5s to cancel.

**Design:**
- `useUndoableDelete(mutationFn)` hook: returns `{ deleteWithUndo }`
- Immediately shows "Item excluído — Desfazer" toast with countdown progress
- Mutation fires after 5s timeout; if user clicks Desfazer, `clearTimeout` is called
- Applies to: delete movimentação, delete conta, delete estoque item
- Toast uses existing `useToast`, extend with `action` button slot

---

## 5. Form Draft Persistence

**Goal:** Accidental page refresh doesn't lose form progress.

**Design:**
- `useFormDraft<T>(key: string, defaultValues: T)` hook
- Debounced (500ms) `sessionStorage.setItem` on `watch()` changes
- Loads from sessionStorage on mount; clears on successful submit
- Apply to: Nova Movimentação, Nova Conta, Nova Conta a Pagar dialogs
- Keys: `draft:movimentacao`, `draft:conta`, `draft:conta-pagar`

---

## 6. Empty States

**Goal:** Empty lists communicate context, not silence.

**Design:**
- `<EmptyState icon title description action? />` reusable component
- Page-specific messaging with relevant icon and optional CTA button
- Applies to: all tables/lists when `data.length === 0`
- Financeiro: "Nenhuma movimentação este mês — Adicionar movimentação"
- Estoque: "Nenhum item em estoque — Registrar entrada"
- Fornecedores: "Nenhum fornecedor cadastrado — Novo fornecedor"

---

## 7. CSV Export

**Goal:** Export financeiro data — #1 request in B2B financial apps.

**Design:**
- Pure client-side: no new dependencies, build CSV string from array
- Export all visible movimentações (respects active filters)
- Columns: Data, Descrição, Tipo, Valor, Conta, Obra
- Filename: `movimentacoes-YYYY-MM-DD.csv`
- "Exportar CSV" button in financeiro page header, next to filters
- UTF-8 BOM for Excel compatibility on Windows

---

## 8. Filters and Search

**Goal:** Financeiro and estoque become usable at scale.

**Design:**
- `FilterBar` component: text search + date range + type filter (entrada/saída/transferência)
- State: `useFilterState` hook with `useMemo` filtering
- Financeiro: filter by período (from/to), tipo, and text search on descrição
- Estoque: filter by obra, material name text search
- Filter state persists in URL search params via TanStack Router for shareability
- Reset button clears all filters

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Pagination | Client-side | No schema changes; data already loaded; upgrade path to server-side later |
| Undo | Delay-based | No optimistic UI complexity; works with existing mutation hooks |
| Draft persistence | sessionStorage | Tab-scoped, no cross-tab interference, auto-clears on browser close |
| Filters | URL params | Shareable, survives page refresh, integrates with TanStack Router |
| CSV | No library | UTF-8 BOM + manual serialization is 10 lines; zero bundle impact |
| Realtime status | Channel callback | Official Supabase pattern, no polling |
