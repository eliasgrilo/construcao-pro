# Complete Apple-Quality Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every bug, scroll issue, modal problem, performance bottleneck, and logic flaw across the entire app. Redesign Venda dialog from zero.

**Architecture:** Fix root causes in shared components (Modal, scroll lock, realtime), then fix page-specific bugs, then redesign Venda wizard, then optimize performance.

**Tech Stack:** React, TypeScript, Tailwind v4, Framer Motion, TanStack Query, Supabase, Custom Modal component

---

## Phase 1: Core Infrastructure Fixes

### Task 1: Fix Modal — Duplicate X Button When `noPadding`

**Problem:** Modal.tsx ALWAYS renders its own header with X close button (line 168-194). When dialogs use `noPadding` and provide their own custom header (e.g. venda-dialog, manutencao-dialog), users see TWO X buttons.

**Files:**
- Modify: `apps/web/src/components/Modal/Modal.tsx:166-196`

**Fix:** When `noPadding` is true AND no `title` is provided, skip rendering the default header entirely. The child component owns its layout.

---

### Task 2: Fix Body Scroll Lock Leaking

**Problem:** When modals are opened/closed rapidly or during animations, `lockCount` can leak (stay > 0), making the entire page unscrollable. This explains "tabs travadas" (stuck tabs) and "não conseguindo descer as páginas no mobile".

**Files:**
- Modify: `apps/web/src/hooks/use-body-scroll-lock.ts`
- Modify: `apps/web/src/components/Modal/Modal.tsx` (safety reset on close)

**Fix:**
1. Add a MutationObserver or periodic check that resets scroll lock if no modals are in DOM
2. On Modal unmount, always decrement and release if count reaches 0
3. Add `forceReleaseScrollLock()` call on route change

---

### Task 3: Fix Burocracia Modal — Horizontal Scroll

**Problem:** The "Novo Lançamento" dialog in burocracia tab scrolls horizontally on mobile. DialogContent has `!overflow-hidden` but the inner scroll area lacks `overflow-x: hidden`.

**Files:**
- Modify: `apps/web/src/pages/obra-detail-burocracia-tab.tsx:389,424`

**Fix:** Add `overflow-x-hidden` to the scrollable body div at line 424.

---

## Phase 2: Venda Dialog — Complete Redesign

### Task 4: Redesign Venda Dialog — 3-Step Apple Wizard

**Problem:** Current modal freezes the app. User wants: payment dates for both accounts, credit card tax auto-saves with parcelas showing automatically, Apple-level polish.

**New 3-Step Flow:**

**Step 1: Valor de Venda**
- Big currency input (current design, keep)
- Cost breakdown + profit preview
- Split toggle (dividir entre contas)
- If split: Conta 1 value + Conta 2 value inputs

**Step 2: Destino & Pagamento**
- Conta 1 selection + subconta (Caixa/Aplicações)
- Conta 1 payment date (date picker, default today)
- Conta 1 payment method (always À Vista for split, any method for single)
- If split: Conta 2 selection
- Conta 2 payment method
- If credit card: Taxa toggle (sem/com juros) → auto-show parcelas when taxa set
- Conta 2 first installment date (date picker, default 30 days from now)

**Step 3: Confirmar**
- Full summary card with all details
- Profit/loss projection
- Installment schedule with dates
- Single "Confirmar Venda" CTA

**Files:**
- Rewrite: `apps/web/src/pages/obra-detail-venda-dialog.tsx`
- Modify: `apps/web/src/pages/obra-detail-venda-utils.ts` (add date params)
- Modify: `apps/web/src/pages/obra-detail.tsx` (state management for new fields)
- Modify: `apps/web/src/hooks/use-supabase.ts` (pass dates to mutations)

---

## Phase 3: Performance

### Task 5: Debounce Realtime Invalidations

**Problem:** `use-realtime.ts:42` calls `invalidateQueries()` with NO filter on reconnect — refetches EVERYTHING. Individual table listeners also cascade.

**Files:**
- Modify: `apps/web/src/hooks/use-realtime.ts`

**Fix:**
1. On reconnect: only invalidate the specific tables being listened to, not all queries
2. Add 500ms debounce to prevent rapid-fire invalidations
3. Remove dashboard from estoque listener cascade

---

### Task 6: Targeted Query Invalidations

**Problem:** 107 `invalidateQueries` calls in use-supabase.ts, many overly broad. Dashboard invalidated 16 times.

**Files:**
- Modify: `apps/web/src/hooks/use-supabase.ts`

**Fix:**
1. Dashboard: only invalidate on mutations that actually change aggregate data (not on every estoque/material change)
2. Use exact queryKey matching where possible
3. Group related invalidations to avoid redundant refetches

---

## Phase 4: Full Page Audit

### Task 7: Fix Every Page — Complete Scan

Audit every page for: broken buttons, half-loaded content, scroll issues, loading states, error handling.

**Pages to audit:**
- financeiro.tsx
- obras.tsx
- materiais.tsx
- fornecedores.tsx
- estoque.tsx
- movimentacoes.tsx
- notas-fiscais.tsx
- documentacao.tsx
- obra-detail.tsx (all 6 tabs)
- conta-detail.tsx
- dashboard.tsx

**For each page verify:**
1. All buttons work and have loading/disabled states
2. All modals open/close cleanly without freezing
3. Scroll works on mobile (no body lock leaks)
4. Error states show toast, not silent failures
5. Empty states render correctly
6. Data loads without unnecessary delays

---

### Task 8: TypeScript Check + Deploy

**Steps:**
1. Run `npx tsc --noEmit` — fix all errors
2. Run `npm run build` — verify clean build
3. Deploy to https://construcao-pro.vercel.app

---
