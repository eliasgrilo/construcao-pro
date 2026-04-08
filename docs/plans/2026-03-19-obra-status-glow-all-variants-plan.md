# Obra Status Glow — All Variants Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the `ObraStatusDropdown` trigger button show a vibrant color-matched glow and pulsing dot for every selected status, not just Ativa.

**Architecture:** Single file change in `apps/web/src/pages/obra-detail.tsx`. Replace the hardcoded `success`-only `boxShadow` and pulse animation guards with generic expressions derived from `current.color`. No new components, no new files.

**Tech Stack:** React, Framer Motion, Tailwind v4, inline styles for dynamic color values.

---

### Task 1: Apply glow to all status variants

**Files:**
- Modify: `apps/web/src/pages/obra-detail.tsx` — `ObraStatusDropdown` component (~lines 538–573)

**Step 1: Open the file and locate the trigger button**

Open `apps/web/src/pages/obra-detail.tsx`. Find `ObraStatusDropdown` (around line 524). The trigger `<button>` starts around line 540.

**Step 2: Replace the `style` prop on the button**

Current code (lines 555–557):
```tsx
style={current?.variant === 'success' ? {
  boxShadow: '0 0 0 1px rgba(52,199,89,0.25), 0 0 14px rgba(52,199,89,0.45), 0 0 28px rgba(52,199,89,0.12)',
} : undefined}
```

Replace with a helper computed above the `return` (after line 528 where `current` is declared):
```tsx
const hex = current?.color ?? '#8E8E93'
const glowStyle = {
  boxShadow: `0 0 0 1px ${hex}40, 0 0 14px ${hex}72, 0 0 28px ${hex}1f`,
}
```

Then on the button:
```tsx
style={glowStyle}
```

Note on hex opacity suffixes:
- `40` = 25% opacity
- `72` = 45% opacity
- `1f` = 12% opacity

These match exactly the RGBA values Ativa currently uses (`0.25`, `0.45`, `0.12`).

**Step 3: Remove the `success`-only guard on the dot pulse animation**

Current code (line 562):
```tsx
animate={current?.variant === 'success' ? { scale: [1, 1.5, 1], opacity: [1, 0.55, 1] } : {}}
```

Replace with (always animate):
```tsx
animate={{ scale: [1, 1.5, 1], opacity: [1, 0.55, 1] }}
```

The `transition` line below it is already unconditional — leave it as-is.

**Step 4: Visual verification**

Start the dev server:
```bash
cd apps/web && pnpm dev
```

1. Open any obra detail page.
2. Click the status pill — confirm the dropdown opens.
3. Select **Manutenção** → pill should turn orange with an orange glow and pulsing dot.
4. Select **Finalizada** → pill should turn gray with a gray glow and pulsing dot.
5. Select **Vendido** → purple glow.
6. Select **Ativa** → green glow (unchanged from before).

**Step 5: Commit**

```bash
git add apps/web/src/pages/obra-detail.tsx
git commit -m "feat(obra-detail): vibrant glow + pulse for all status variants"
```

---

### Task 2: Merge and deploy

**Step 1: Merge to main**

```bash
git checkout main
git merge --ff-only claude/epic-herschel
```

**Step 2: Deploy to Vercel**

Use the `vercel:deploy` skill to deploy to https://construcao-pro.vercel.app.
