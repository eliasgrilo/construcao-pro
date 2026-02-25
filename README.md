# ConstruçãoPro 🏗️

Sistema completo de gestão de inventário para construção civil com lançamento de notas fiscais.

## Stack

| Camada | Tecnologias |
|--------|------------|
| **Frontend** | React 18, TypeScript 5.5, Vite 6, Tailwind CSS v4, shadcn/ui, TanStack (Router, Query, Table), React Hook Form + Zod, Zustand, Recharts, Framer Motion |
| **Backend** | Node.js 22, Fastify 5, Prisma 5, PostgreSQL 16, Redis 7, JWT + Refresh Token, BullMQ |
| **Infra** | Turborepo, Docker Compose, GitHub Actions CI/CD |

## Pré-requisitos

- **Node.js** 22 LTS
- **Docker** & Docker Compose
- **npm** 10+

## Setup Rápido

```bash
# 1. Clone e entre no diretório
cd construcao-pro

# 2. Copie as variáveis de ambiente
cp .env.example .env

# 3. Suba PostgreSQL e Redis
docker-compose up -d

# 4. Instale dependências
npm install

# 5. Gere o Prisma Client
npx turbo db:generate

# 6. Aplique o schema no banco
npx turbo db:push

# 7. Popule com dados de demonstração
npm -w @construcao-pro/db run db:seed

# 8. Inicie em desenvolvimento
npx turbo dev
```

O frontend estará em **<http://localhost:5173>** e a API em **<http://localhost:3333>**.

## Credenciais de Demo

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | <admin@construcaopro.com> | admin123 |
| Gestor | <gestor@construcaopro.com> | gestor123 |
| Almoxarife | <almoxarife@construcaopro.com> | almox123 |

## Estrutura do Monorepo

```
construcao-pro/
├── apps/
│   ├── web/        → Frontend React + Vite
│   └── api/        → Backend Fastify + Prisma
├── packages/
│   ├── shared/     → Zod schemas + TypeScript types
│   ├── db/         → Prisma schema + migrations + seed
│   └── ui/         → Design system utilities
├── docker-compose.yml
├── turbo.json
└── biome.json
```

## Funcionalidades

- **Autenticação**: JWT + Refresh Token com rotação, RBAC com 4 níveis
- **Dashboard**: Gráficos de estoque, movimentações por mês, alertas
- **Obras**: CRUD completo de canteiros de obra
- **Materiais**: Cadastro com código de barras e categorias
- **Estoque**: Controle por obra e almoxarifado, alertas de estoque mínimo
- **Movimentações**: Entradas, saídas e transferências com aprovação em 2 níveis
- **Notas Fiscais**: Upload e parse automático de XML NF-e, vinculação ao estoque
- **Audit Log**: Histórico imutável de todas as ações
- **Dark/Light Mode**: Tema persistente com design Apple-inspired

## Comandos Úteis

```bash
npx turbo dev         # Dev mode (todos os apps)
npx turbo build       # Build de produção
npx turbo lint        # Lint com Biome
npx turbo db:studio   # Prisma Studio (GUI do banco)
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Registro |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/obras | Listar obras |
| POST | /api/obras | Criar obra |
| GET | /api/materiais | Listar materiais |
| GET | /api/estoque | Consultar estoque |
| GET | /api/estoque/alertas | Alertas de estoque baixo |
| POST | /api/movimentacoes | Registrar movimentação |
| POST | /api/notas-fiscais/upload-xml | Upload NF-e XML |
| GET | /api/dashboard/stats | Estatísticas gerais |
| GET | /api/audit-log | Consultar audit log |

## Licença

MIT
