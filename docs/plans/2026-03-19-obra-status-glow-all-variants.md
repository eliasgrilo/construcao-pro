# Design: Vibrant Glow for All Obra Status Variants

**Date:** 2026-03-19

## Problem

In `obra-detail.tsx`, the `ObraStatusDropdown` trigger button applies a vibrant glow effect and a pulsing dot **only** when the current status is `ATIVA` (green). All other statuses (Finalizada, Manutenção, Pausada, Vendido, Terreno) render with a static dot and no glow.

## Goal

When any status is the currently selected status, the trigger button should show:
- A vibrant `box-shadow` glow in the status's own color
- A pulsing dot animation (same `scale + opacity` keyframes already used for Ativa)

## Design

### Files changed
- `apps/web/src/pages/obra-detail.tsx` — `ObraStatusDropdown` component (~lines 538–573)

### Implementation

Replace the hardcoded `success`-only guard with a generic glow derived from `current.color`:

```ts
// Compute glow style for any selected status
const glowStyle = current?.color
  ? {
      boxShadow: `0 0 0 1px ${current.color}40, 0 0 14px ${current.color}72, 0 0 28px ${current.color}1f`,
    }
  : undefined
```

Apply `glowStyle` to the button's `style` prop (replacing the existing `success`-only condition).

Extend the dot pulse animation from `success`-only to always:
```tsx
animate={{ scale: [1, 1.5, 1], opacity: [1, 0.55, 1] }}
transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
```

### Out of scope
- Dropdown list items styling (unchanged)
- Any other file
