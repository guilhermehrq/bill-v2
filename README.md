# FinPessoal

Plataforma web de controle financeiro pessoal — inspirada em Organizze e Mobills, com diferenciais técnicos e de UX. Uso individual inicialmente, arquitetura multi-usuário desde o dia 1.

Fase atual: **0 — fundação** (bootstrap local concluído). Próxima fase: **1 — Schema + Auth**.

## Documentos de especificação

Fontes de verdade para requisitos e arquitetura:

- [`prompt-claude-code-max-finanpessoal-v2.md`](./prompt-claude-code-max-finanpessoal-v2.md) — requisitos, stack, fases, critérios de pronto.
- [`adr-finpessoal-v2.md`](./adr-finpessoal-v2.md) — decisões arquiteturais (imutáveis sem autorização).
- [`wireframes-finpessoal-v2.md`](./wireframes-finpessoal-v2.md) — especificação visual de 18 telas.

## Stack

| Camada        | Tecnologia                                  |
| ------------- | ------------------------------------------- |
| Runtime       | Node.js 20 LTS                              |
| Framework     | Next.js 15 (App Router) + TypeScript strict |
| UI            | Tailwind CSS v4 + shadcn/ui + lucide-react  |
| Forms         | react-hook-form + zod                       |
| Data fetching | TanStack Query + Server Actions             |
| Estado local  | Zustand                                     |
| DB            | PostgreSQL via Supabase                     |
| ORM           | Drizzle ORM + drizzle-kit                   |
| Auth          | Supabase Auth                               |
| Storage       | Supabase Storage                            |
| Datas         | date-fns (pt-BR)                            |
| Dinheiro      | centavos (BIGINT) + dinero.js v2            |
| Testes        | Vitest (unit) + Playwright (e2e)            |
| Qualidade     | ESLint + Prettier + Husky + lint-staged     |
| Deploy        | Vercel + Supabase Cloud                     |

Ver ADRs em [`adr-finpessoal-v2.md`](./adr-finpessoal-v2.md) para o racional de cada escolha.

## Pré-requisitos

- **Node.js 20** (ver `.nvmrc`). Com [nvm](https://github.com/nvm-sh/nvm): `nvm use`.
- **pnpm 10+** (ver `packageManager` em `package.json`).
- Conta no [Supabase](https://supabase.com) (quando for integrar cloud).

## Setup

```bash
pnpm install
cp .env.example .env.local
# preencher chaves do Supabase quando o projeto for criado
pnpm dev
```

App sobe em `http://localhost:3000`.

## Scripts

| Comando            | Ação                                |
| ------------------ | ----------------------------------- |
| `pnpm dev`         | Servidor de desenvolvimento         |
| `pnpm build`       | Build de produção                   |
| `pnpm start`       | Rodar build                         |
| `pnpm lint`        | ESLint                              |
| `pnpm typecheck`   | `tsc --noEmit`                      |
| `pnpm test`        | Vitest run-once                     |
| `pnpm test:watch`  | Vitest watch                        |
| `pnpm test:e2e`    | Playwright E2E                      |
| `pnpm db:push`     | Aplicar schema via drizzle-kit      |
| `pnpm db:studio`   | Drizzle Studio                      |
| `pnpm db:generate` | Gerar migrations a partir do schema |
| `pnpm format`      | Prettier em tudo                    |

## Estrutura

```
src/
├── app/                 # App Router
│   ├── (auth)/          # rotas públicas (login, signup) — Fase 1
│   ├── (app)/           # rotas autenticadas — Fase 1+
│   ├── api/             # route handlers (webhooks, cron) — Fase 1+
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/              # shadcn/ui
├── features/            # lógica de domínio por feature (vazia até Fase 1)
├── lib/
│   ├── money.ts         # helpers de dinheiro (centavos ↔ BRL)
│   ├── dates.ts         # helpers de datas (pt-BR)
│   ├── utils.ts         # cn() e utilidades gerais
│   └── supabase/        # clients (browser, server, admin)
├── db/
│   ├── index.ts         # Drizzle client
│   └── schema/          # schema das tabelas (Fase 1)
└── server/              # Server Actions (Fase 1+)

supabase/
├── config.toml
└── migrations/          # SQL migrations aplicadas via drizzle-kit ou supabase CLI
```

## Variáveis de ambiente

Ver `.env.example`. As chaves essenciais são `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` e `DIRECT_URL`.

Quando criar o projeto Supabase:

1. Copiar URL, anon key e service_role key de **Project Settings → API**.
2. Copiar `DATABASE_URL` (pooled) e `DIRECT_URL` (direct) de **Project Settings → Database → Connection string**.
3. Rodar `pnpm db:push` para aplicar a migration inicial (`supabase/migrations/0000_init_extensions.sql`).

## Convenções do projeto

Seguindo prompt §11:

- **Commits em português**, conventional commits: `feat(escopo): descrição`, `fix(escopo): descrição`, etc.
  Exemplos: `feat(contas): adicionar CRUD`, `fix(fatura): corrigir cálculo de ciclo`.
- **UI em português (pt-BR)**: labels, mensagens, toasts, datas, moeda.
- **Código em inglês**: nomes de variáveis, funções, tipos, comentários, docstrings.
- **Um commit por entidade ou feature** — evitar commits enormes.
- **Respeitar os ADRs** — mudanças requerem um novo ADR superseding o anterior, com autorização explícita.
- **Nunca use `any`** em TypeScript — use `unknown` + narrowing (enforçado via ESLint).
- **Valores monetários sempre em centavos** (BIGINT no DB, `number` em JS via `dinero.js`).
- **Datas de transação** como `DATE` sem timezone; timestamps de sistema como `TIMESTAMPTZ`.
- **RLS ativa em todas as tabelas** — nunca bypass via `service_role` no client.

## Fase 0 — o que foi feito neste bootstrap

- Next.js 15 + TS strict (com `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- Tailwind v4 + shadcn/ui (tema slate + tokens semânticos do wireframe §1: `income`, `expense`, `pending`, `info`, `brand`).
- Font Inter via `next/font/google`.
- Drizzle + Supabase clients (browser, server, admin).
- ESLint com regras reforçadas: `no-explicit-any: error`, bloqueio de `dayjs|moment|luxon|prisma`.
- Prettier + Husky + lint-staged.
- Vitest + smoke test de `money.ts`.
- Playwright configurado (sem specs ainda).
- GitHub Actions CI (lint, typecheck, test, build paralelos).
- Migration inicial `0000_init_extensions.sql` (pgcrypto, pg_trgm).

## O que vem na Fase 1

Schema completo (§4 do prompt) + Auth flows + RLS + triggers + seeds de categorias pt-BR + layout autenticado (sidebar + topbar).

Ver §9 do prompt para o plano de entrega completo.
