# NF-e: AI Name Correction + produto_fornecedor Table

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered product name correction UI to the review step, and create the `produto_fornecedor` junction table so the same product can be linked to multiple supplier codes.

**Architecture:**
- AI names: `cleanProductName()` already exists — add per-item Sparkles button + bulk "Corrigir todos" button; loading state via `cleaningNameIndices: Set<number>`
- `produto_fornecedor`: new junction table `(material_id, fornecedor_id, cprod, gtin)` with a unique constraint per `(material_id, fornecedor_id)`; lookup upgraded to check this table before Gemini; import step upserts a record after material creation

**Tech Stack:** React/TypeScript, Supabase, Gemini API (VITE_GEMINI_KEY)

---

### Task 1: AI Name Correction — State + Handler

**Files:**
- Modify: `apps/web/src/pages/notas-fiscais.tsx`

**What to add (after `reviewEditedNames` state, ~line 1832):**

```typescript
const [cleaningNameIndices, setCleaningNameIndices] = useState<Set<number>>(new Set())
const [cleaningAllNames, setCleaningAllNames] = useState(false)
```

**Add handler after existing state declarations (~line 1835):**

```typescript
const handleCleanNameAI = useCallback(async (itemIndex: number, rawName: string) => {
  setCleaningNameIndices((prev) => new Set([...prev, itemIndex]))
  try {
    const cleaned = await cleanProductName(rawName)
    setReviewEditedNames((prev) => {
      const next = new Map(prev)
      next.set(itemIndex, cleaned)
      return next
    })
  } finally {
    setCleaningNameIndices((prev) => {
      const next = new Set(prev)
      next.delete(itemIndex)
      return next
    })
  }
}, [])

const handleCleanAllNamesAI = useCallback(async () => {
  if (!parsed) return
  const newItems = matchStates.filter((s) => s.matchStatus !== 'confirmed')
  if (newItems.length === 0) return
  setCleaningAllNames(true)
  try {
    await Promise.all(
      newItems.map((s) => handleCleanNameAI(s.index, reviewEditedNames.get(s.index) ?? s.item.descricao))
    )
  } finally {
    setCleaningAllNames(false)
  }
}, [parsed, matchStates, reviewEditedNames, handleCleanNameAI])
```

**Also clear in `resetUpload`:**
```typescript
setCleaningNameIndices(new Set())
setCleaningAllNames(false)
```

---

### Task 2: AI Name Correction — Review Step UI

**Files:**
- Modify: `apps/web/src/pages/notas-fiscais.tsx` (review step, ~line 3345)

**Replace the new products section header to add bulk button:**

Find the section header that contains `produtos novos serão cadastrados` and add a "Corrigir todos" button next to it.

**Per-item: add Sparkles button** inside each product row (inside the `flex items-center gap-2 mb-1` div), after the EAN/código badge:

```tsx
<button
  type="button"
  disabled={cleaningNameIndices.has(s.index)}
  onClick={() => handleCleanNameAI(s.index, reviewEditedNames.get(s.index) ?? s.item.descricao)}
  className="ml-auto p-1 rounded-[8px] hover:bg-[#007AFF12] transition-colors disabled:opacity-40"
  title="Corrigir nome com IA"
>
  {cleaningNameIndices.has(s.index)
    ? <RefreshCw className="h-3 w-3 animate-spin" style={{ color: '#007AFF' }} />
    : <Sparkles className="h-3 w-3" style={{ color: '#007AFF' }} />}
</button>
```

**Bulk button** — add above the product list (inside the new products card header, after the title):

```tsx
{GEMINI_KEY && (
  <button
    type="button"
    disabled={cleaningAllNames}
    onClick={handleCleanAllNamesAI}
    className="ml-auto flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40"
    style={{ backgroundColor: '#007AFF15', color: '#007AFF' }}
  >
    {cleaningAllNames
      ? <RefreshCw className="h-3 w-3 animate-spin" />
      : <Sparkles className="h-3 w-3" />}
    {cleaningAllNames ? 'Corrigindo...' : 'Corrigir todos'}
  </button>
)}
```

---

### Task 3: produto_fornecedor Migration

**Files:**
- Create: `supabase/migrations/20260317010000_produto_fornecedor.sql`

```sql
-- produto_fornecedor: links one internal material to multiple supplier product codes
-- This allows the same Coca-Cola 2L (one material_id) to be matched from 3 different
-- suppliers, each with their own <cProd> code in their XML.

CREATE TABLE IF NOT EXISTS produto_fornecedor (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   uuid NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  cprod         text,           -- supplier's internal product code from <cProd>
  gtin          text,           -- barcode / EAN from <cEAN> or <cEANTrib>
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_produto_fornecedor UNIQUE (material_id, fornecedor_id)
);

-- Index for fast lookup by GTIN (most common lookup path)
CREATE INDEX IF NOT EXISTS idx_pf_gtin ON produto_fornecedor(gtin) WHERE gtin IS NOT NULL;
-- Index for lookup by fornecedor + cprod
CREATE INDEX IF NOT EXISTS idx_pf_fornecedor_cprod ON produto_fornecedor(fornecedor_id, cprod) WHERE cprod IS NOT NULL;

-- RLS: same user_id scoping as materiais (users can only see their own)
ALTER TABLE produto_fornecedor ENABLE ROW LEVEL SECURITY;

-- Inherit auth from materiais via JOIN — simplest approach that doesn't need extra column
CREATE POLICY "produto_fornecedor_select" ON produto_fornecedor
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "produto_fornecedor_insert" ON produto_fornecedor
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "produto_fornecedor_update" ON produto_fornecedor
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );

CREATE POLICY "produto_fornecedor_delete" ON produto_fornecedor
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM materiais m
      WHERE m.id = produto_fornecedor.material_id
    )
  );
```

---

### Task 4: Lookup Refactor — Check produto_fornecedor Before Gemini

**Files:**
- Modify: `apps/web/src/pages/notas-fiscais.tsx` (inside `processItem`, ~line 2061)

**After the memory cache check (step 1) and before the Gemini call (step 2), add step 1.5:**

```typescript
// ── 1.5 produto_fornecedor lookup — zero network, DB-backed ───────────────
// Check by GTIN first (universal), then by fornecedor+cProd (supplier-specific)
if (matchedFornecedorId || item.gtin || item.cProd) {
  let pfQuery = (supabase as any)
    .from('produto_fornecedor')
    .select('material_id, materiais(id, nome, codigo, unidade, codigo_barras)')

  if (item.gtin) {
    pfQuery = pfQuery.eq('gtin', item.gtin)
  } else if (matchedFornecedorId && item.cProd) {
    pfQuery = pfQuery.eq('fornecedor_id', matchedFornecedorId).eq('cprod', item.cProd)
  }

  const { data: pfHit } = await pfQuery.maybeSingle()
  if (pfHit?.material_id) {
    const mat = pfHit.materiais as { id: string; nome: string } | null
    setMatchStates((prev) =>
      prev.map((s) =>
        s.index === i
          ? {
              ...s,
              matchStatus: 'confirmed' as MatchStatus,
              confirmedMaterialId: pfHit.material_id,
              confirmedMaterialNome: mat?.nome ?? item.descricao,
              isLocalMatch: true,
            }
          : s,
      ),
    )
    // Refresh memory cache so next import is instant
    saveMemoryCloud(item_key(item), {
      id_interno: pfHit.material_id,
      nome_interno: mat?.nome ?? item.descricao,
    })
    return
  }
}
```

---

### Task 5: On Import — Upsert produto_fornecedor

**Files:**
- Modify: `apps/web/src/pages/notas-fiscais.tsx` (inside `handleImport`, after material creation, ~line 2524)

**After `saveMemoryCloud(...)`, add:**

```typescript
// Upsert produto_fornecedor so this material is recognized on future imports
// from the same (or any) supplier with the same GTIN or cProd
if (resolvedMaterialId && (item.gtin || item.cProd)) {
  try {
    await (supabase as any)
      .from('produto_fornecedor')
      .upsert(
        {
          material_id: resolvedMaterialId,
          fornecedor_id: matchedFornecedorId ?? null,
          cprod: item.cProd ?? null,
          gtin: item.gtin ?? null,
        },
        { onConflict: 'material_id,fornecedor_id', ignoreDuplicates: false },
      )
  } catch {
    // Non-critical: proceed without recording the mapping
  }
}
```

---

### Task 6: Commit & Push

```bash
# From worktree
git add apps/web/src/pages/notas-fiscais.tsx supabase/migrations/20260317010000_produto_fornecedor.sql docs/plans/
git commit -m "feat(nfe): AI name correction UI + produto_fornecedor junction table"

# Merge to main + push
cd /Users/elias/Code/construcao-pro
git merge claude/jovial-keller --no-ff -m "feat(nfe): AI name correction + produto_fornecedor"
git push origin main
```
