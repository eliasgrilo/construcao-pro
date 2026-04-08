# Obra Detail Bug Sweep Plan

## Why This Rewrite Exists

The previous version of this document mixed planning, pasted code, implementation detail,
and deployment notes into a single 1154-line file. That made the plan hard to scan,
hard to update, and easy to drift from the codebase.

This rewrite keeps the intent and the bug list, but removes inline code dumps.
Future plan documents should stay concise, point to real files, and describe decisions
instead of embedding full implementations.

## Goal

Fix the confirmed obra-detail, dashboard, and manutencao defects with minimal blast radius,
better UX consistency, and no regressions in stock, maintenance, or cost flows.

## Success Criteria

- "Novo Item" opens a real entrada dialog and persists data successfully.
- "Nova Movimentacao" opens a real movement dialog and supports entrada, saida, and transferencia.
- Maintenance can be concluded when there are zero problems.
- Maintenance can be started with or without registering a problem immediately.
- Dashboard maintenance counts ignore orphaned sessions.
- Almoxarifado cards clearly identify the obra context.
- Cost charts render reliably and support a small date-range filter.
- The obra-detail summary card matches the dashboard visual language.
- Dialogs remain centered and layered correctly on desktop and mobile.
- Heavy queries avoid unnecessary refetch churn.

## Constraints

- Prefer extraction over adding more state to giant page files.
- Keep business rules close to the flow they affect.
- Preserve current Supabase hooks unless a bug requires query changes.
- Do not paste long code blocks into planning docs.

## Primary Files

| File | Responsibility |
| --- | --- |
| `apps/web/src/pages/obra-detail.tsx` | page shell, dialogs, shared obra-detail state |
| `apps/web/src/pages/obra-detail-manutencao-tab.tsx` | maintenance flow and problem list |
| `apps/web/src/pages/obra-detail-almoxarifados-tab.tsx` | almoxarifado cards and context |
| `apps/web/src/pages/obra-detail-custos-tab.tsx` | charts and investment summaries |
| `apps/web/src/pages/dashboard.tsx` | maintenance widget aggregation |
| `apps/web/src/components/ui/dialog.tsx` | dialog portal, layering, positioning |
| `apps/web/src/hooks/use-supabase.ts` | query configuration and mutations |

## Root Causes

1. Dialog state existed in the parent page without the matching rendered dialogs.
2. Some business rules treated "zero items" as blocked instead of resolved.
3. Dashboard aggregation trusted maintenance rows without validating the obra status.
4. Maintenance start assumed obra data was already loaded.
5. Apple-quality UX work was inconsistent across maintenance, charts, and summary cards.
6. The plan itself had become a code dump instead of a decision document.

## Workstreams

### 1. Stock Dialog Extraction

Create standalone dialog components for:

- entrada
- movimentacao

Expected result:

- `obra-detail.tsx` owns only open/close state and prefilled identifiers
- each dialog owns its own form state, validation, reset, and mutation feedback
- dead inline helpers are removed from the page shell

Acceptance checks:

- "Novo Item" opens the entrada dialog
- "Nova Movimentacao" opens the movement dialog
- submit buttons disable correctly while pending
- closing the dialog clears stale draft state

### 2. Maintenance Logic Fixes

Fix the maintenance flow in two places:

- zero problems must still allow completion
- the start dialog must offer both "start and describe" and "start without problem"

Also harden the auto-start path:

- if obra data is not loaded yet, fall back to a safe status value
- only update the obra status when it is not already in maintenance

Acceptance checks:

- concluding with zero problems works
- starting maintenance without immediate problem entry works
- starting maintenance and opening the problem input still works

### 3. Dashboard Count Integrity

The maintenance widget should count only maintenance sessions whose related obra
is currently in `MANUTENCAO`.

Acceptance checks:

- orphaned maintenance sessions do not inflate the dashboard count
- distinct obras are still deduplicated correctly

### 4. UX and Disambiguation Cleanup

Polish the obvious friction points:

- restyle the inline maintenance problem input for desktop quality
- show obra name on almoxarifado cards when available
- align the obra-detail summary card with the dashboard card language

Acceptance checks:

- desktop add-problem UI feels intentional and readable
- repeated almoxarifado names are distinguishable
- summary card communicates budget, spend, and category split more clearly

### 5. Cost Chart Stability

Fix the charts with the smallest possible surface area:

- set explicit donut sizing so the Recharts pie does not disappear on compact cards
- add a simple range filter to the monthly evolution chart

Acceptance checks:

- the donut renders reliably at small size
- the range pills switch between `1M`, `3M`, `6M`, and `Tudo`

### 6. Dialog Infrastructure

Audit the shared dialog primitive for:

- fixed overlay
- centered content
- stable z-index
- mobile-safe width and padding

Acceptance checks:

- dialogs do not render "stuck at the top"
- overlay and content stack above the page consistently

### 7. Query Performance

Add `staleTime` to heavier read paths that do not require immediate refetching,
especially obra detail aggregates and dashboard summaries.

Acceptance checks:

- repeated tab navigation does not spam identical network reads
- data still refreshes often enough for the operational workflow

## Execution Order

1. Extract missing dialogs first because they unblock broken buttons.
2. Fix maintenance logic next because it affects both correctness and flow completion.
3. Repair dashboard counting to remove misleading aggregate numbers.
4. Apply UX polish only after the underlying flows behave correctly.
5. Finish with chart stability, dialog infrastructure, and query tuning.

## Verification Matrix

| Area | What to verify |
| --- | --- |
| Entrada | open dialog, choose material, save, see success feedback |
| Movimentacao | test entrada, saida, transferencia with valid and invalid states |
| Manutencao | start with problem, start without problem, conclude with zero problems |
| Dashboard | active maintenance count matches obras really in maintenance |
| Almoxarifados | duplicated names still show obra context |
| Custos | donut renders, monthly filter changes visible data |
| Dialogs | open from desktop and mobile widths, confirm centering |
| Performance | repeated visits reuse cache within the stale window |

## Cleanup Rules

- Remove dead state after each extraction instead of carrying compatibility baggage.
- Keep dialog-local form state inside the dialog component.
- Prefer tight type aliases over broad `any` casts.
- Leave comments only where the business rule is not obvious from the code.

## Risks

| Risk | Mitigation |
| --- | --- |
| Extracted dialogs drift from parent state | keep parent API minimal: `open`, `onOpenChange`, ids |
| Maintenance status updates double-fire | centralize current status fallback before mutation |
| Dashboard fix hides valid sessions | filter only by explicit obra status, not by naming heuristics |
| Performance tuning causes stale UX | limit stale windows to short operational intervals |

## Out of Scope

- Large-scale page redesign outside the affected sections
- Rewriting all Supabase hooks
- Changing deployment topology
- Copying implementation into this document

## Definition of Done

- TypeScript passes
- build passes
- affected flows are manually smoke-tested
- obsolete page-level dialog state is removed
- no new giant plan sections are added to this file

## Notes for Future Plans

Keep future execution plans small and composable:

- capture the bug
- name the root cause
- list the files
- define acceptance checks
- link to code or PRs instead of pasting full components

The plan should explain what we are changing and why. The repository should hold the code.
