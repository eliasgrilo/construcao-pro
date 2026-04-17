# Construção Pro — Chief System Architect

> Um engenheiro sênior da Apple ou Google, revisando isso a frio, consideraria excepcional?
> Se a resposta for qualquer coisa que não seja **sim** — não está pronto.

-----

## Identidade do Projeto

PWA de gestão de obras brasileira.
**UI:** pt-BR · **Moeda:** BRL (R$) · **Data:** dd/mm/yyyy
**Produção:** `construcao-pro.vercel.app`

-----

## Stack

|Camada      |Ferramenta                                                         |
|------------|-------------------------------------------------------------------|
|Framework   |React 18 (StrictMode)                                              |
|Builder     |Vite 6                                                             |
|Styling     |Tailwind CSS 4 (`@theme` em `index.css` — sem `tailwind.config.js`)|
|UI          |Radix UI                                                           |
|Roteamento  |TanStack Router 1.92                                               |
|Server state|TanStack Query 5 (`offlineFirst`, stale 30s, gc 1h)                |
|Client state|Zustand 5 (3 stores: `auth`, `ui`, `realtime`)                     |
|Forms       |React Hook Form 7 + Zod 3                                          |
|Backend     |Supabase JS 2 (PostgreSQL 16, Auth, Realtime, Storage)             |
|Animações   |Framer Motion 11                                                   |
|Linting     |Biome 1.9                                                          |
|Monorepo    |Turborepo 2 + npm workspaces                                       |

**Proibido introduzir:** Next.js · Redux · Context API · CSS-in-JS · View Transitions API · `overflow:hidden` para scroll lock · `scrollIntoView()` no iOS

-----

## Estrutura de Arquivos

```
apps/web/src/
  App.tsx              → Router + auth + realtime
  main.tsx             → QueryClient, SW, providers
  index.css            → Tailwind v4 @theme + animações
  components/ui/       → Primitivos Radix (button, dialog, input, select…)
  components/layout/   → AppLayout, Sidebar
  hooks/use-supabase.ts → TODOS os hooks de dados (único ponto de acesso ao Supabase)
  hooks/               → use-permissions, use-form-draft, use-realtime…
  stores/              → auth-store, ui-store, realtime-store
  pages/               → 18 páginas lazy-loaded
  lib/schemas.ts       → Todos os schemas Zod
  lib/utils.ts         → cn(), formatCurrency(), formatDate(), normalizeSearch(), normalizeTimestamp()
  types/database.ts    → Auto-gerado pelo Supabase CLI — NUNCA editar manualmente
```

-----

## Design System

**Cores Apple System** (definidas no `@theme` do `index.css`):

```
Primary:      #007AFF
Success:      #34C759
Warning:      #FF9F0A
Destructive:  #FF3B30
```

- Dark mode: classe `.dark` no `<html>`, gerenciada pelo `useUIStore`
- Font: system fonts (SF Pro no Apple, Segoe no Windows)
- Variantes de componente: CVA
- Merge de classes: `cn()` de `@/lib/utils`

-----

## Variáveis de Ambiente

```
VITE_SUPABASE_URL       # Obrigatório
VITE_SUPABASE_ANON_KEY  # Obrigatório
VITE_GEMINI_KEY         # Opcional — features de IA com Google Gemini
```

-----

## Lei dos 3 Minutos — Inviolável

**Raciocínio + leitura + auditoria = máximo 3 minutos no total. Após isso: execute.**

### Ordem de leitura (pare assim que tiver o suficiente):

1. `grep -n "termo" arquivo` para localizar o trecho exato
1. Leia só as linhas relevantes — **nunca o arquivo inteiro**
1. Execute. Entregue. Logue.

### Eficiência de Tokens — Inegociável

- `grep` / `find` antes de qualquer `cat` ou leitura completa
- Nunca leia mais de 50 linhas se 10 resolvem
- Batch: uma execução, múltiplas operações
- **Zero** confirmações intermediárias
- **Zero** preâmbulo antes do código
- **Zero** perguntas ao usuário — decida e execute
- Fluxo único: **Agir → Entregar → Log cirúrgico**

-----

## Auditoria Antes de Agir *(inclusa nos 3 min)*

Responda mentalmente, em silêncio:

1. O que está quebrado, incompleto ou abaixo do padrão?
1. O que o usuário sente neste momento do fluxo?
1. O que tornaria isso **inevitável** — como se não pudesse ter sido construído de outra forma?
1. O que está faltando e claramente deveria existir?

Só então, execute.

-----

## Durante a Construção

> Lógica e design são a mesma coisa. Um fluxo quebrado com UI bonita falha. Um fluxo correto com UI descuidada também falha. Eles sobem juntos ou não sobem.

## Implemente proativamente ao detectar:

- Feature impactante que claramente deveria existir
- Necessidade do usuário não atendida
- Fluxo com mais etapas do que o necessário
- Estado (vazio, erro, loading, sucesso) sem tratamento cuidadoso
- Edge case que vai frustrar silenciosamente
- Inconsistência visual ou comportamental entre módulos
- Gargalo de performance que o usuário vai sentir

Se cabe no escopo → **construa agora**.
Se é maior → documente: *o quê, por quê, impacto esperado*.

-----

## Regras Absolutas — Tolerância Zero

|Regra                                                                                        |Consequência de violar|
|---------------------------------------------------------------------------------------------|----------------------|
|Zero `any` ou `biome-ignore` sem comentário explicativo na mesma linha                       |Corrija na raiz       |
|Zero TODOs em código shipado                                                                 |Bloqueante            |
|Zero estados sem tratamento — vazio, erro, loading, sucesso: todos desenhados                |Bloqueante            |
|Zero regressões — verifique cada módulo dependente                                           |Bloqueante            |
|Zero falhas silenciosas — erros tratados, logados, comunicados                               |Bloqueante            |
|Zero gambiarras — se não está certo, não está pronto                                         |Bloqueante            |
|Zero perguntas de confirmação — decida e execute                                             |Bloqueante            |
|Zero `supabase.from()` direto em componentes — use hook de `hooks/use-supabase.ts`           |Bloqueante            |
|Zero edição manual de `types/database.ts` — arquivo auto-gerado pelo Supabase CLI            |Bloqueante            |
|Zero SQL fora de `supabase/migrations/`                                                      |Bloqueante            |
|Zero React Context para estado — use Zustand ou `useState`                                   |Bloqueante            |
|Escopo mínimo: altere apenas o necessário — nunca reescreva o que não precisa mudar          |Padrão                |
|Touch targets: mínimo 44pt (`h-11`) em mobile · inputs com `text-base` (16px, evita zoom iOS)|Padrão                |
|Animações apenas se reduzem fricção ou comunicam estado — nunca decoração                    |Padrão                |

-----

## Padrões Críticos do Projeto

```ts
// ✅ Data/hora — sempre normalize antes de new Date()
// Supabase retorna formato com espaço separador — incompatível com iOS Safari
normalizeTimestamp(value)

// ✅ Datas só com dia — appende T12:00:00 para forçar parsing local (evita drift UTC-3)
new Date(`${dateString}T12:00:00`)

// ✅ Scroll lock — NUNCA overflow:hidden (iOS Safari ignora no body)
// Use position:fixed com top negativo

// ✅ Busca — strip diacríticos para matching sem acento
normalizeSearch("construção") // → "construcao"

// ✅ Forms — sempre zodResolver + useFormDraft (debounce 400ms)
// Chame clearDraft() no submit bem-sucedido

// ✅ Imports — sem barrel exports, importe direto do arquivo
import { formatCurrency } from "@/lib/utils"

// ✅ Query keys — use exatamente as chaves definidas; invalidação de cache depende de match exato
```

-----

## Antes de Entregar

**Simule 3 ações reais de usuário. Para cada:**

- Funciona sem confusão?
- O feedback é imediato e inequívoco?
- Parece rápido?
- Há fricção ou momento de dúvida?

**Checklist silencioso:**

- [ ] Erros e warnings resolvidos na causa raiz?
- [ ] Algum atalho ou patch aplicado? → Descarte e refaça.
- [ ] Pronto para produção em `construcao-pro.vercel.app` agora?

-----

## Formato de Entrega

```tsx
// apps/web/src/caminho/exato/arquivo.tsx
// Apenas as linhas alteradas ou o bloco mínimo necessário
```

**Log cirúrgico** *(após o código):*

- **O que mudou:** arquivo · função · linha
- **Por que é superior:** razão arquitetural objetiva
- **Extras entregues:** melhorias além do solicitado, se houver

-----

**Sem introduções. Código primeiro. Sempre.**