# ConstruçãoPro

Frontend de gestão de obras com foco em estoque, financeiro, fornecedores, documentação e NF-e.

## Estrutura Real do Workspace

```text
construcao-pro-main/
├── apps/
│   └── web/              # app React + Vite em produção
├── packages/
│   ├── ui/               # utilitários de UI compartilhados
│   └── database/         # scripts auxiliares de banco/RPC
├── package.json          # workspaces npm + scripts Turbo
├── turbo.json
└── biome.json
```

## Stack Atual

- `apps/web`: React 18, TypeScript 5, Vite 6, TanStack Router/Query, Supabase, Framer Motion, React Hook Form, Zod, Zustand.
- `packages/ui`: utilitários leves de UI compartilhados.
- `packages/database`: scripts de suporte para rollback harness e testes locais de Postgres.

## Requisitos

- Node.js 22+
- npm 10+

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm -w @construcao-pro/web run dev
```

App web: [http://localhost:5173](http://localhost:5173)

## Gates de Qualidade

```bash
npm -w @construcao-pro/web run lint
npm -w @construcao-pro/web run test
npm -w @construcao-pro/web run build
```

## Scripts Úteis do Monorepo

```bash
npm run dev
npm run build
npm run lint
npm run format
npm run db:rollback-harness
```

## Observações

- Este workspace não contém um `apps/api` executável.
- O frontend usa Supabase diretamente como backend operacional.
- `packages/database` hoje é suporte operacional, não um pacote npm publicado.
