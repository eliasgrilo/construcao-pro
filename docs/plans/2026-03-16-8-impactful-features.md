# 8 Impactful Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver 8 production-quality features: realtime reconnection, per-page error boundaries, undo for deletes, form draft persistence, improved empty states, CSV export, filters/search on financeiro, and paginated movimentações list.

**Architecture:** All changes are purely frontend (no DB migrations). Features are layered on top of existing hooks, components, and patterns. Toast is extended with an action button slot to enable undo. Filters live in URL search params for shareability.

**Tech Stack:** React 18, TanStack Query, TanStack Router, Framer Motion, Supabase Realtime, Zustand, Zod, react-hook-form, Tailwind v4

---

## Task 1: Extend Toast with Action Button

The undo feature requires a toast with a "Desfazer" button. The current `Toast` interface has no action slot.

**Files:**
- Modify: `apps/web/src/components/ui/toast.tsx`

**Step 1: Add `action` field to Toast interface and render it**

In `toast.tsx`, extend the `Toast` interface and render the action in the toast body:

```tsx
// In the Toast interface (line 6), add:
interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  duration?: number
  action?: { label: string; onClick: () => void }  // <-- add this
}
```

In the JSX (after the description block, before the close button), add:
```tsx
{t.action && (
  <button
    type="button"
    onClick={() => {
      t.action!.onClick()
      removeToast(t.id)
    }}
    className="flex-shrink-0 self-center text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors px-1 py-0.5 rounded"
  >
    {t.action.label}
  </button>
)}
```

Place it between the description div and the close button, so layout is: icon | text | action-btn | close-btn.

**Step 2: Commit**

```bash
git add apps/web/src/components/ui/toast.tsx
git commit -m "feat(toast): add optional action button slot for undo support"
```

---

## Task 2: Undo for Destructive Actions (`useUndoableDelete`)

Creates a hook that delays a mutation by 5 seconds, letting users cancel via toast.

**Files:**
- Create: `apps/web/src/hooks/use-undoable-delete.ts`
- Modify: `apps/web/src/pages/financeiro.tsx` (deleteConta)
- Modify: `apps/web/src/pages/conta-detail.tsx` (deleteMovimentacao)

**Step 1: Create the hook**

```typescript
// apps/web/src/hooks/use-undoable-delete.ts
import { useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/toast'

/**
 * Wraps any async delete fn with a 5-second undo window.
 * Shows a toast immediately; mutation fires after the delay
 * unless the user clicks "Desfazer".
 */
export function useUndoableDelete<TId = string>(
  deleteFn: (id: TId) => Promise<void>,
  messages: {
    pending: string   // "Movimentação excluída"
    undone?: string   // "Exclusão cancelada" (optional)
    error?: string    // "Erro ao excluir" (optional)
  },
  delayMs = 5000,
) {
  const { toast } = useToast()
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const deleteWithUndo = useCallback(
    (id: TId) => {
      const key = String(id)

      // Cancel any pending delete for same id (double-click guard)
      const existing = timersRef.current.get(key)
      if (existing) {
        clearTimeout(existing)
        timersRef.current.delete(key)
      }

      let cancelled = false

      toast({
        title: messages.pending,
        duration: delayMs,
        action: {
          label: 'Desfazer',
          onClick: () => {
            cancelled = true
            clearTimeout(timersRef.current.get(key))
            timersRef.current.delete(key)
            if (messages.undone) {
              toast({ title: messages.undone, variant: 'default', duration: 2500 })
            }
          },
        },
      })

      const timer = setTimeout(async () => {
        timersRef.current.delete(key)
        if (cancelled) return
        try {
          await deleteFn(id)
        } catch {
          if (messages.error) {
            toast({ title: messages.error, variant: 'error' })
          }
        }
      }, delayMs)

      timersRef.current.set(key, timer)
    },
    [deleteFn, messages, delayMs, toast],
  )

  return { deleteWithUndo }
}
```

**Step 2: Apply to `deleteConta` in `financeiro.tsx`**

Find `handleDeleteConta` (line ~1555) and `confirmDeleteConta`. Replace the confirm-dialog flow with undo toast.

Import the hook at the top:
```tsx
import { useUndoableDelete } from '@/hooks/use-undoable-delete'
```

Inside `FinanceiroPage`, replace the deleteConta usage:
```tsx
// Remove: deleteContaId state, confirmDeleteConta fn, handleDeleteConta (old)
// Replace with:
const { deleteWithUndo: deleteContaWithUndo } = useUndoableDelete(
  (id: string) => deleteConta.mutateAsync(id),
  {
    pending: 'Conta excluída',
    undone: 'Exclusão cancelada',
    error: 'Erro ao excluir conta',
  },
)

const handleDeleteConta = (id: string, e: React.MouseEvent) => {
  e.stopPropagation()
  deleteContaWithUndo(id)
}
```

Remove the `<AlertDialog>` confirm modal for deleteConta (find it by searching `deleteContaId`).

**Step 3: Apply to `deleteMovimentacao` in `conta-detail.tsx`**

Import and apply similarly:
```tsx
import { useUndoableDelete } from '@/hooks/use-undoable-delete'

// inside ContaDetailPage:
const { deleteWithUndo: deleteMovWithUndo } = useUndoableDelete(
  (id: string) => deleteMovimentacao.mutateAsync(id),
  {
    pending: 'Movimentação excluída',
    undone: 'Exclusão cancelada',
    error: 'Erro ao excluir movimentação',
  },
)
```

Replace the existing `handleDeleteMov` calls that call `deleteMovimentacao.mutate` with `deleteMovWithUndo(mov.id)`.

**Step 4: Commit**

```bash
git add apps/web/src/hooks/use-undoable-delete.ts \
        apps/web/src/pages/financeiro.tsx \
        apps/web/src/pages/conta-detail.tsx
git commit -m "feat: undo for destructive delete actions with 5s toast window"
```

---

## Task 3: Realtime Reconnection Banner

Show a non-intrusive banner when the WebSocket drops, auto-dismiss when it reconnects.

**Files:**
- Modify: `apps/web/src/hooks/use-realtime.ts`
- Create: `apps/web/src/components/realtime-status-banner.tsx`
- Modify: `apps/web/src/components/layout/app-layout.tsx`

**Step 1: Track connection status in `use-realtime.ts`**

Replace the current export with one that also exposes status:

```typescript
// apps/web/src/hooks/use-realtime.ts
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export type RealtimeStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'

export function useRealtimeSync() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('CONNECTED')

  useEffect(() => {
    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_contas' }, () =>
        qc.invalidateQueries({ queryKey: ['financeiro', 'contas'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_movimentacoes' }, () =>
        qc.invalidateQueries({ queryKey: ['financeiro', 'movimentacoes'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_pagar_parcelas' }, () =>
        qc.invalidateQueries({ queryKey: ['contas_pagar'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoques' }, () => {
        qc.invalidateQueries({ queryKey: ['estoque'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          // Just reconnected — refetch everything stale
          if (status === 'RECONNECTING' || status === 'DISCONNECTED') {
            qc.invalidateQueries()
          }
          setStatus('CONNECTED')
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('DISCONNECTED')
        } else if (channelStatus === 'CLOSED') {
          setStatus('RECONNECTING')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc]) // NOTE: `status` is intentionally NOT in deps — we read it via closure for the reconnect refetch

  return { status }
}
```

**Step 2: Create `RealtimeStatusBanner`**

```tsx
// apps/web/src/components/realtime-status-banner.tsx
import type { RealtimeStatus } from '@/hooks/use-realtime'
import { AnimatePresence, motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

interface RealtimeStatusBannerProps {
  status: RealtimeStatus
}

export function RealtimeStatusBanner({ status }: RealtimeStatusBannerProps) {
  const visible = status !== 'CONNECTED'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center justify-center gap-2 text-[12px] font-medium px-4"
            style={{
              height: 36,
              backgroundColor: status === 'DISCONNECTED' ? '#FF3B3015' : '#FF950015',
              color: status === 'DISCONNECTED' ? '#FF3B30' : '#FF9500',
            }}
          >
            {status === 'DISCONNECTED' ? (
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            ) : (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Wifi className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              </motion.div>
            )}
            <span>
              {status === 'DISCONNECTED'
                ? 'Sem conexão — dados podem estar desatualizados'
                : 'Reconectando…'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 3: Update `App.tsx` to thread status to AppLayout**

In `App.tsx`, `useRealtimeSync()` is already called. Update it to capture status and pass down. Since `AppLayout` is used inside each route's `AuthGuard`, pass the status via a context or prop.

Simplest approach — a small context:

Create `apps/web/src/stores/realtime-store.ts`:
```typescript
import { create } from 'zustand'
import type { RealtimeStatus } from '@/hooks/use-realtime'

interface RealtimeStore {
  status: RealtimeStatus
  setStatus: (s: RealtimeStatus) => void
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  status: 'CONNECTED',
  setStatus: (status) => set({ status }),
}))
```

Update `use-realtime.ts` to use this store instead of local state:
```typescript
import { useRealtimeStore } from '@/stores/realtime-store'
// ... replace useState with:
const setStatus = useRealtimeStore((s) => s.setStatus)
const status = useRealtimeStore((s) => s.status)
```

In `app-layout.tsx`, read from the store and render the banner:
```tsx
import { RealtimeStatusBanner } from '@/components/realtime-status-banner'
import { useRealtimeStore } from '@/stores/realtime-store'

// Inside AppLayout, before Sidebar, add:
const realtimeStatus = useRealtimeStore((s) => s.status)

// In JSX, add banner at the very top of the layout:
// (above the mobile top bar and main content)
<RealtimeStatusBanner status={realtimeStatus} />
```

The banner should appear at the top of the page (sticky, above content) on both mobile and desktop.

**Step 4: Commit**

```bash
git add apps/web/src/hooks/use-realtime.ts \
        apps/web/src/stores/realtime-store.ts \
        apps/web/src/components/realtime-status-banner.tsx \
        apps/web/src/components/layout/app-layout.tsx
git commit -m "feat(realtime): reconnection detection + animated status banner"
```

---

## Task 4: Per-Page Error Boundaries

Currently one `QueryErrorBoundary` wraps all pages — a crash in financeiro kills the whole app.

**Files:**
- Modify: `apps/web/src/App.tsx`

**Step 1: Wrap each page individually**

In `App.tsx`, the `AuthGuard` currently wraps all children in a single `QueryErrorBoundary`. Instead, move the boundary inside each route component:

```tsx
// Change AuthGuard to remove QueryErrorBoundary:
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) return <AppLoader />
  if (!isAuthenticated) return <Navigate to="/login" />

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  )
}
```

Then wrap each route's component in its own `QueryErrorBoundary`:
```tsx
const financeiroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/financeiro',
  component: () => (
    <AuthGuard>
      <QueryErrorBoundary>
        <FinanceiroPage />
      </QueryErrorBoundary>
    </AuthGuard>
  ),
})
```

Do this for every protected route: obras, obraDetail, materiais, estoque, movimentacoes, notasFiscais, fornecedores, fornecedorDetail, financeiro, contaDetail, documentacao, configuracoes.

This way, if financeiro crashes, estoque, obras etc. still work.

**Step 2: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: per-page QueryErrorBoundary — isolate page crashes"
```

---

## Task 5: Form Draft Persistence (`useFormDraft`)

Prevents losing form data on accidental navigation/refresh.

**Files:**
- Create: `apps/web/src/hooks/use-form-draft.ts`
- Modify: `apps/web/src/pages/financeiro.tsx` (NovaConta form + ContaPagarModal)
- Modify: `apps/web/src/pages/conta-detail.tsx` (NovaMovimentacao form)

**Step 1: Create `useFormDraft` hook**

```typescript
// apps/web/src/hooks/use-form-draft.ts
import { useEffect, useRef } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'

/**
 * Persists form state to sessionStorage.
 * Call after useForm() — pass the form instance and a unique storage key.
 * Draft loads on mount, saves on change (debounced 400ms), clears on submit.
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  key: string,
) {
  const storageKey = `draft:${key}`
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<T>
      form.reset(draft as T, { keepDefaultValues: true })
    } catch {
      sessionStorage.removeItem(storageKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]) // run once on mount

  // Save on change (debounced)
  useEffect(() => {
    const { unsubscribe } = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(values))
        } catch {
          // sessionStorage full — ignore
        }
      }, 400)
    })
    return () => {
      unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, storageKey])

  const clearDraft = () => sessionStorage.removeItem(storageKey)

  return { clearDraft }
}
```

**Step 2: Apply to `NovaConta` form in `financeiro.tsx`**

Find `NovaContaModal` — it uses `useForm`. After the `useForm(...)` call:
```tsx
import { useFormDraft } from '@/hooks/use-form-draft'

// inside NovaContaModal, after useForm():
const { clearDraft } = useFormDraft(form, 'nova-conta')

// In the onSuccess callback, add clearDraft():
onSuccess: () => {
  clearDraft()
  setModalOpen(false)
  resetForm()
  // ...existing logic
}
```

**Step 3: Apply to `ContaPagarModal` in `financeiro.tsx`**

Same pattern — after `cpForm = useForm(...)`:
```tsx
const { clearDraft: clearCpDraft } = useFormDraft(cpForm, 'conta-pagar')

// in handleAddContaPagar success:
clearCpDraft()
```

**Step 4: Apply to `NovaMovimentacao` form in `conta-detail.tsx`**

```tsx
const { clearDraft } = useFormDraft(form, 'nova-movimentacao')
// clearDraft() on successful submit
```

**Step 5: Commit**

```bash
git add apps/web/src/hooks/use-form-draft.ts \
        apps/web/src/pages/financeiro.tsx \
        apps/web/src/pages/conta-detail.tsx
git commit -m "feat: auto-save form drafts to sessionStorage — survive page refresh"
```

---

## Task 6: Filters + Search for Financeiro Movimentações

Add period filter, type filter, and text search to the `FinanceiroMovimentacoesList` component.

**Files:**
- Modify: `apps/web/src/pages/financeiro.tsx`

**Step 1: Add filter state and filtered data to `FinanceiroMovimentacoesList`**

The component currently receives `todasMovs` and renders all of them. Add local state for filters and a `useMemo` to filter:

```tsx
function FinanceiroMovimentacoesList({
  movsLoading,
  todasMovs,
  contas,
}: {
  movsLoading: boolean
  todasMovs: FinanceiroMovimentacaoWithConta[]
  contas: FinanceiroConta[]
}) {
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'>('TODOS')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredMovs = useMemo(() => {
    return todasMovs.filter((m) => {
      if (tipoFilter !== 'TODOS' && m.tipo !== tipoFilter) return false
      if (dateFrom && m.data < dateFrom) return false
      if (dateTo && m.data > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        const motivo = (m.motivo ?? '').toLowerCase()
        const banco = (m.financeiro_contas?.banco ?? '').toLowerCase()
        if (!motivo.includes(q) && !banco.includes(q)) return false
      }
      return true
    })
  }, [todasMovs, search, tipoFilter, dateFrom, dateTo])

  // ... rest of component uses filteredMovs instead of todasMovs
```

**Step 2: Add the FilterBar UI**

Add above the card list (after the header row):

```tsx
{/* Filter bar */}
{!movsLoading && todasMovs.length > 0 && (
  <div className="flex flex-wrap gap-2 mb-4">
    {/* Text search */}
    <div className="relative flex-1 min-w-[180px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar movimentação…"
        className="w-full h-9 rounded-xl border bg-card pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </div>

    {/* Type filter */}
    <select
      value={tipoFilter}
      onChange={(e) => setTipoFilter(e.target.value as typeof tipoFilter)}
      className="h-9 rounded-xl border bg-card px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
    >
      <option value="TODOS">Todos os tipos</option>
      <option value="ENTRADA">Entradas</option>
      <option value="SAIDA">Saídas</option>
      <option value="TRANSFERENCIA">Transferências</option>
    </select>

    {/* Date from */}
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className="h-9 rounded-xl border bg-card px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
      aria-label="Data inicial"
    />

    {/* Date to */}
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
      className="h-9 rounded-xl border bg-card px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
      aria-label="Data final"
    />

    {/* Clear filters (only show when any filter active) */}
    {(search || tipoFilter !== 'TODOS' || dateFrom || dateTo) && (
      <button
        type="button"
        onClick={() => { setSearch(''); setTipoFilter('TODOS'); setDateFrom(''); setDateTo('') }}
        className="h-9 rounded-xl border bg-card px-3 text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
      >
        <X className="h-3.5 w-3.5" />
        Limpar
      </button>
    )}
  </div>
)}
```

**Step 3: Update count label and empty state**

Update the count label to show filtered count, and add a message when filters return no results:

```tsx
{!movsLoading && filteredMovs.length !== todasMovs.length && (
  <span className="text-[13px] text-muted-foreground font-medium tabular-nums">
    {filteredMovs.length} de {todasMovs.length} {todasMovs.length === 1 ? 'registro' : 'registros'}
  </span>
)}
```

When `filteredMovs.length === 0` and `todasMovs.length > 0`, show:
```tsx
<div className="flex flex-col items-center justify-center py-14 gap-3">
  <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#8E8E9314' }}>
    <Search className="h-7 w-7 text-muted-foreground/30" />
  </span>
  <p className="text-[17px] font-semibold">Nenhum resultado</p>
  <p className="text-[14px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
    Tente ajustar os filtros de busca
  </p>
</div>
```

**Step 4: Commit**

```bash
git add apps/web/src/pages/financeiro.tsx
git commit -m "feat(financeiro): filters + search on movimentações (tipo, período, texto)"
```

---

## Task 7: CSV Export

Export visible (filtered) movimentações to CSV with one click.

**Files:**
- Create: `apps/web/src/lib/export-csv.ts`
- Modify: `apps/web/src/pages/financeiro.tsx`

**Step 1: Create `export-csv.ts`**

```typescript
// apps/web/src/lib/export-csv.ts

/**
 * Escapes a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ]
  // UTF-8 BOM for Excel on Windows
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type MovimentacaoExportRow = {
  data: string
  motivo: string
  tipo: string
  valor: number
  banco: string
  subconta: string
}

export function exportMovimentacoesCsv(rows: MovimentacaoExportRow[]): void {
  const headers = ['Data', 'Descrição', 'Tipo', 'Valor (R$)', 'Conta', 'Subconta']
  const data = rows.map((r) => [
    r.data,
    r.motivo,
    r.tipo === 'ENTRADA' ? 'Entrada' : r.tipo === 'SAIDA' ? 'Saída' : 'Transferência',
    r.valor,
    r.banco,
    r.subconta === 'CAIXA' ? 'Em Caixa' : 'Aplicações',
  ])
  const filename = `movimentacoes-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(buildCsv(headers, data), filename)
}
```

**Step 2: Add Export button to `FinanceiroMovimentacoesList`**

Import in financeiro.tsx:
```tsx
import { exportMovimentacoesCsv } from '@/lib/export-csv'
import { Download } from 'lucide-react'
```

In the header row of `FinanceiroMovimentacoesList`, add an export button next to the count:
```tsx
<div className="flex items-center gap-3">
  {!movsLoading && todasMovs.length > 0 && (
    <span className="text-[13px] text-muted-foreground font-medium tabular-nums">
      {filteredMovs.length} {filteredMovs.length === 1 ? 'registro' : 'registros'}
    </span>
  )}
  {!movsLoading && filteredMovs.length > 0 && (
    <button
      type="button"
      onClick={() =>
        exportMovimentacoesCsv(
          filteredMovs.map((m) => ({
            data: m.data,
            motivo: m.motivo ?? '',
            tipo: m.tipo,
            valor: Number(m.valor),
            banco: m.financeiro_contas?.banco ?? '',
            subconta: m.subconta,
          })),
        )
      }
      className="flex items-center gap-1.5 h-8 rounded-lg px-3 text-[12px] font-medium text-muted-foreground border hover:text-foreground hover:bg-accent/50 transition-colors"
      title="Exportar CSV"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Exportar CSV</span>
    </button>
  )}
</div>
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/export-csv.ts apps/web/src/pages/financeiro.tsx
git commit -m "feat(financeiro): export filtered movimentações to CSV"
```

---

## Task 8: Enhanced Empty States

Standardize and improve empty states across key pages with contextual messaging and CTAs.

**Files:**
- Create: `apps/web/src/components/ui/empty-state.tsx`
- Modify: `apps/web/src/pages/estoque.tsx`
- Modify: `apps/web/src/pages/fornecedores.tsx`
- Modify: `apps/web/src/pages/obras.tsx`

**Step 1: Create `EmptyState` component**

```tsx
// apps/web/src/components/ui/empty-state.tsx
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#8E8E9314' }}
        aria-hidden="true"
      >
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </span>
      <div className="text-center max-w-[260px]">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 h-10 rounded-xl bg-primary px-5 text-[14px] font-semibold text-white transition-all active:scale-[0.97] hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
```

**Step 2: Apply to `estoque.tsx`**

Find where the estoque list renders empty — replace the inline empty div with:
```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Package } from 'lucide-react'

// When estoque data is empty:
<EmptyState
  icon={Package}
  title="Estoque vazio"
  description="Registre uma entrada de material para começar a controlar o estoque"
  action={{ label: '+ Registrar entrada', onClick: () => setShowEntradaModal(true) }}
/>
```

**Step 3: Apply to `fornecedores.tsx`**

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Building2 } from 'lucide-react'

<EmptyState
  icon={Building2}
  title="Nenhum fornecedor"
  description="Adicione fornecedores para associá-los a notas fiscais e materiais"
  action={{ label: '+ Novo fornecedor', onClick: () => setModalOpen(true) }}
/>
```

**Step 4: Apply to `obras.tsx`**

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { HardHat } from 'lucide-react'

<EmptyState
  icon={HardHat}
  title="Nenhuma obra cadastrada"
  description="Crie sua primeira obra para começar a gerenciar custos, materiais e equipes"
  action={{ label: '+ Nova obra', onClick: () => setModalOpen(true) }}
/>
```

**Step 5: Commit**

```bash
git add apps/web/src/components/ui/empty-state.tsx \
        apps/web/src/pages/estoque.tsx \
        apps/web/src/pages/fornecedores.tsx \
        apps/web/src/pages/obras.tsx
git commit -m "feat: standardized EmptyState component with CTA — estoque, fornecedores, obras"
```

---

## Final Verification

**Step 1: TypeScript check**
```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 2: Build check**
```bash
cd apps/web && npm run build
```
Expected: successful build.

**Step 3: Commit design docs**
```bash
git add docs/
git commit -m "docs: design doc for 8 impactful features"
```

---

## Summary of Changes

| Feature | Files | Impact |
|---------|-------|--------|
| Toast action button | `toast.tsx` | Enables undo pattern |
| Undo for deletes | `use-undoable-delete.ts`, `financeiro.tsx`, `conta-detail.tsx` | Safety net for financial data |
| Realtime reconnection | `use-realtime.ts`, `realtime-store.ts`, `realtime-status-banner.tsx`, `app-layout.tsx` | Always-on data freshness |
| Per-page error boundaries | `App.tsx` | Fault isolation |
| Form draft persistence | `use-form-draft.ts`, `financeiro.tsx`, `conta-detail.tsx` | Zero lost work |
| Filters + search | `financeiro.tsx` | Usable at scale |
| CSV export | `export-csv.ts`, `financeiro.tsx` | High-demand B2B feature |
| Enhanced empty states | `empty-state.tsx`, 3 pages | Clarity for new users |
