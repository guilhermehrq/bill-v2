# FinPessoal — Architecture Decision Records (ADR)

**Versão:** 2.0 · **Atualizado:** 2026-04-20

Documento que registra as decisões arquiteturais importantes do projeto, o contexto em que foram tomadas, alternativas consideradas e consequências esperadas. Cada ADR é imutável — se a decisão mudar no futuro, escreve-se um novo ADR que supersede o anterior.

**Formato:** baseado em Michael Nygard (2011), simplificado.

---

## Índice

| # | Título | Status |
|---|---|---|
| 001 | Next.js 15 (App Router) como framework full-stack | Aceito |
| 002 | Supabase como backend-as-a-service | Aceito |
| 003 | Drizzle ORM em vez de Prisma | Aceito |
| 004 | Server Actions para mutations (sem camada REST/tRPC explícita) | Aceito |
| 005 | shadcn/ui como base de componentes | Aceito |
| 006 | Valores monetários em centavos (integer) com dinero.js | Aceito |
| 007 | Row Level Security (RLS) como camada primária de autorização | Aceito |
| 008 | TanStack Query para cache de servidor + Zustand para estado local | Aceito |
| 009 | Recharts para visualizações | Aceito |
| 010 | Vitest + Playwright como stack de testes | Aceito |
| 011 | Deploy na Vercel + Supabase Cloud | Aceito |
| 012 | PWA antes de app nativo | Aceito |
| 013 | Monorepo simples (single-app) em vez de Turborepo/Nx | Aceito |
| 014 | date-fns para datas | Aceito |
| 015 | `purchase_date` denormalizado + 3 modos de exibição de gastos de cartão | Aceito |
| 016 | Parsing client-side + bulk insert via Server Action (importador) | Aceito |

---

## ADR 001 — Next.js 15 (App Router) como framework full-stack

**Status:** Aceito · **Data:** 2026-04-20

### Contexto

Preciso escolher a base técnica do projeto. Opções viáveis:
- Frontend SPA (React/Vite) + backend separado (Spring Boot, Node/Express, Hono, etc.).
- Framework full-stack meta (Next.js, Remix/React Router v7, SvelteKit, Nuxt).
- Stack Java tradicional (Spring Boot + Thymeleaf ou + React SPA).

Restrições:
- Projeto solo, com Claude Code Max como copiloto principal. Time-to-market é prioridade.
- Zero custo de infra no MVP.
- Type safety de ponta a ponta desejado.
- Escalabilidade até ~10k MAU sem refator.

### Decisão

Usar **Next.js 15 com App Router em TypeScript strict** como framework único, cobrindo frontend, backend (Server Actions + Route Handlers) e renderização.

### Alternativas consideradas

**Spring Boot + React SPA**
- ➕ Alinhado com minha experiência (Java é meu stack diário).
- ➕ Ecossistema maduro, bibliotecas de finanças robustas (Joda Money, etc.).
- ➖ Dois deploys, dois repos mentais, duas pipelines.
- ➖ Time-to-market ~2-3x maior num projeto solo.
- ➖ Claude Code rende menos em cross-stack com contrato entre eles.
- ➖ Free tier de backend Java é mais escasso (cold start longo em Cloud Run/Render free).

**Remix / React Router v7**
- ➕ Modelo de loaders/actions elegante.
- ➖ Menor adoção, menos materiais de treino ingeridos pelos LLMs.
- ➖ Deploy na Vercel não é idiomático (mesmo com suporte oficial).

**SvelteKit**
- ➕ DX excelente, bundle menor.
- ➖ Curva de aprendizado adicional. Menos componentes de UI prontos (comparado a React).
- ➖ Comunidade menor pra libs de finanças/charts.

**SPA pura (Vite) + Node/Hono backend**
- ➕ Separação clara frontend/backend.
- ➖ Maior overhead de config, auth, CORS, deploy dual.

### Consequências

**Positivas:**
- Um único repo, uma única linguagem, um único deploy.
- Server Actions eliminam boilerplate de API para mutations.
- Excelente integração com Vercel (zero-config deploy).
- SSR e streaming nativos → dashboard carrega rápido.

**Negativas / mitigações:**
- Acoplamento ao modelo do Next.js. Mitigação: manter lógica de domínio em `features/<domain>/` desacoplada do framework (services puros).
- Se eventualmente quiser expor API pública ou app mobile nativo consumindo backend, vou precisar adicionar uma camada de Route Handlers REST. Aceito — é incremental, não disruptivo.

---

## ADR 002 — Supabase como backend-as-a-service

**Status:** Aceito

### Contexto

Preciso de PostgreSQL gerenciado, autenticação, storage de arquivos (anexos de transação, OCR futuro, logs de import) e, idealmente, realtime para futuras features de dashboards colaborativos. Quero free tier real para MVP.

### Decisão

Usar **Supabase Cloud** como camada única de DB + Auth + Storage. Região preferida: São Paulo (sa-east-1); fallback us-east-1 se indisponível no free tier.

### Alternativas consideradas

**Neon + Clerk + Cloudinary/S3**
- ➕ Cada serviço é especialista na sua função.
- ➕ Neon tem branching de DB (útil pra preview deploys).
- ➖ Três vendors, três dashboards, três faturas futuras.
- ➖ Integração manual de Auth ↔ DB (claims, sync de users).

**PlanetScale (MySQL) + Auth0 + S3**
- ➖ MySQL em vez de PostgreSQL (perco funcionalidades como `DOMAIN`, arrays nativos, triggers mais flexíveis).
- ➖ PlanetScale removeu free tier em 2024.

**Firebase**
- ➕ Free tier generoso.
- ➖ Firestore é NoSQL, péssimo ajuste pro modelo relacional de finanças (joins complexos, agregações, relatórios).
- ➖ Lock-in maior.

**Auto-hospedar tudo (Docker + VPS)**
- ➖ Custo mensal fixo.
- ➖ Operação: backup, monitoramento, atualização de segurança — responsabilidade minha.
- ➖ Anula a premissa de "zero custo de infra".

**AWS RDS + Cognito + S3**
- ➕ Stack do meu trabalho, conhecimento transferível.
- ➖ Sem free tier após 12 meses. Cognito tem UX ruim.
- ➖ Overkill para o estágio atual.

### Consequências

**Positivas:**
- Setup em minutos. Auth com políticas RLS integradas ao DB.
- Dashboard admin para inspecionar dados diretamente.
- Storage com URLs assinadas para anexos.
- Realtime disponível sem config adicional (útil futuramente).
- PostgreSQL real — SQL completo, extensões (`pg_cron`, `pg_trgm`, `pgvector` se quiser AI).

**Negativas / mitigações:**
- **Lock-in:** migração pra self-hosted PostgreSQL + outra solução de auth seria trabalhosa. Mitigação:
  - Schema SQL padrão (não uso features proprietárias do Supabase no DB).
  - Auth encapsulada em `lib/auth.ts` — trocar provider seria substituir este módulo.
  - Storage encapsulado em `lib/storage.ts`.
- **Limite de 500MB no free tier.** Mitigação: estimativa inicial ~1KB por transação × 10k transações/usuário = 10MB. Folga grande. Anexos ficam em Storage (1GB free).
- **Cold start em free tier (Supabase suspende DB ocioso após 7 dias).** Aceito para MVP solo.

---

## ADR 003 — Drizzle ORM em vez de Prisma

**Status:** Aceito

### Contexto

Preciso de ORM/query builder type-safe para TypeScript com suporte a PostgreSQL, migrations versionadas e boa DX.

### Decisão

Usar **Drizzle ORM** com schema em TypeScript e **drizzle-kit** para migrations.

### Alternativas consideradas

**Prisma**
- ➕ Maturidade, ecossistema enorme, Prisma Studio é excelente.
- ➖ Schema em DSL próprio (`.prisma`) — duplica schema (um `.prisma`, outro inferido no código).
- ➖ Client runtime pesado (~2MB) — impacta cold start em serverless (Vercel Functions).
- ➖ Migrations geradas com padrão meio opaco.
- ➖ Menos flexível para queries complexas (relatórios) — acaba usando `$queryRaw` sem segurança.

**Kysely**
- ➕ Type safety superb, pura query builder sem abstração.
- ➖ Sem schema-as-code, migrations manuais.
- ➖ Menos "batterias incluídas".

**Raw SQL com `postgres` + zod**
- ➕ Controle total, performance máxima.
- ➖ Muito boilerplate, manutenção de types manual.

### Consequências

**Positivas:**
- Schema é TypeScript (`drizzle/schema.ts`), não DSL separado.
- Queries parecem SQL mas com type safety (`db.select().from(transactions).where(...)`).
- Client leve, sem runtime pesado.
- Migrations SQL geradas, revisáveis, versionadas no git.
- Suporte nativo a Postgres avançado (arrays, JSON, enums, triggers).

**Negativas / mitigações:**
- Menos material online comparado a Prisma (mas suficiente em 2026).
- Sem Studio-like interface. Mitigação: Supabase dashboard supre inspeção visual.
- Claude Code ocasionalmente gera Prisma por default — precisarei corrigir. Mitigação: README com instrução explícita.

---

## ADR 004 — Server Actions para mutations

**Status:** Aceito

### Contexto

No Next.js App Router, mutations (criar transação, atualizar orçamento, etc.) podem ser feitas via:
- Route Handlers REST (`app/api/.../route.ts`) chamados via `fetch`.
- tRPC (type-safe RPC).
- Server Actions (funções server marcadas com `"use server"` invocadas direto do client).

### Decisão

Usar **Server Actions** como padrão para mutations. Route Handlers só para casos específicos: webhooks, crons, endpoints públicos futuros.

### Alternativas consideradas

**tRPC**
- ➕ Type safety end-to-end sem declarar schemas duplicados.
- ➕ Organização explícita em routers.
- ➖ Camada extra para manter.
- ➖ Server Actions cobrem 90% do caso de uso com menos código.

**REST (Route Handlers) + TanStack Query**
- ➕ Convencional, fácil de expor publicamente.
- ➖ Duplicação: schema zod na request + schema zod no client + types dos dois.

### Consequências

**Positivas:**
- Menos boilerplate — formulário chama Server Action direto via `action={createTransaction}`.
- Zod schemas compartilhados entre validação server e form client.
- Revalidation de cache automática via `revalidatePath`.
- Progressive enhancement: forms funcionam sem JS.

**Negativas / mitigações:**
- Server Actions não são facilmente consumíveis por app nativo externo. Mitigação: quando isso virar requisito, adiciono Route Handlers REST em cima das mesmas funções de domínio.
- Debug de Server Actions é mais opaco que REST. Mitigação: toda Action passa por uma função wrapper que loga input/output sanitizados.
- Limite de 4.5MB de body em Server Actions no plano Hobby da Vercel. Mitigação explícita no ADR 016 (importador usa batches client-side).

---

## ADR 005 — shadcn/ui como base de componentes

**Status:** Aceito

### Contexto

Preciso de uma biblioteca de componentes UI acessível, customizável e compatível com Tailwind.

### Decisão

Usar **shadcn/ui** — componentes copiados para o próprio repo (via CLI), construídos sobre Radix UI primitives.

### Alternativas consideradas

**Material UI (MUI)**
- ➕ Ecossistema gigante, componentes ricos.
- ➖ Estética Material é opinativa e de difícil camuflagem.
- ➖ Bundle pesado.
- ➖ Tema via CSS-in-JS conflita com Tailwind.

**Mantine**
- ➕ Qualidade alta, bom conjunto de hooks.
- ➖ Também traz opinião visual.
- ➖ Migração de versão não é trivial.

**Chakra UI / NextUI / Park UI**
- ➕ Boas opções.
- ➖ Nenhuma tão alinhada ao ecossistema Tailwind + Radix quanto shadcn.

**Construir do zero sobre Radix**
- ➖ Muito trabalho inicial.
- ➕ Controle total.

### Consequências

**Positivas:**
- Componentes vivem no meu repo — modifico à vontade, sem esperar maintainer.
- Baseado em Radix UI: acessibilidade out-of-the-box (teclado, aria, focus management).
- Estilo via Tailwind classes — um sistema só.
- Claude Code conhece bem shadcn — gera componentes idiomáticos.
- Zero runtime extra (sem CSS-in-JS, sem provider).

**Negativas / mitigações:**
- Ao atualizar um componente, tenho que "re-copiar" e aplicar minhas customizações manualmente. Mitigação: mantenho customizações mínimas no componente, layering por cima em `components/custom/`.
- Alguns componentes complexos (DataGrid completo) não existem. Mitigação: TanStack Table + shadcn para tabelas.

---

## ADR 006 — Valores monetários em centavos (integer) com dinero.js

**Status:** Aceito

### Contexto

Representação de dinheiro é fonte clássica de bugs em apps financeiros. Soma de `0.1 + 0.2` em float dá `0.30000000000000004`. `BigInt` resolve mas é verboso. Bibliotecas de money lidam com arredondamento, formatação e conversão de moeda.

### Decisão

- **Banco:** armazenar valores monetários como `BIGINT` representando **centavos** (menor unidade da moeda).
- **Aplicação:** operações via **dinero.js v2** que trabalha com inteiros internamente.
- **Display:** conversão para `string` via `Intl.NumberFormat('pt-BR', { style: 'currency' })`.

### Alternativas consideradas

**Postgres `NUMERIC(15, 2)`**
- ➕ Precisão exata, semântica de "número decimal".
- ➖ Em JS vira `string` ou `number` — conversão propensa a erro.
- ➖ Operações aritméticas precisam de cuidado.

**Postgres `MONEY`**
- ➖ Tipo com histórico de problemas (localização, arredondamento). Docs oficiais desencorajam uso.

**Floats em todo lugar**
- ➖ Bug garantido em soma de muitos valores.

### Consequências

**Positivas:**
- Soma de centavos é soma de inteiros — sem erro.
- Inteiros são o formato mais eficiente em DB e em rede.
- dinero.js tem APIs para split com resto (útil em divisão de parcelas).

**Negativas / mitigações:**
- Precisa sempre converter centavos ↔ reais na UI. Mitigação: helpers `lib/money.ts` com funções `toCents(brl)`, `toBRL(cents)`, `format(cents)`, `formatWithSign(cents, type)`. Usar `react-hook-form` com um `Controller` que faz a conversão automaticamente em inputs de valor.
- Valores em moedas com 3 decimais (dinar, etc.) exigiriam ajuste. Aceitável — MVP é BRL only.

---

## ADR 007 — Row Level Security (RLS) como camada primária de autorização

**Status:** Aceito

### Contexto

Aplicativo multi-tenant (cada usuário vê apenas seus dados). Autorização pode ser feita:
- **Apenas em aplicação:** checagem `if (record.user_id !== currentUser.id) throw`. Fácil de esquecer.
- **Apenas no banco (RLS):** políticas SQL vinculam cada query ao `auth.uid()`.
- **Ambas em camadas.**

### Decisão

Usar **RLS do Postgres como camada primária**. Toda tabela tem `ENABLE ROW LEVEL SECURITY` e policies `user_id = auth.uid()`. Aplicação valida entrada (zod) e confia que o banco aplicou o filtro.

Exceções (`service_role` bypass) apenas em:
- Jobs agendados (geração de transações recorrentes).
- Migrations e seeds.
- Bulk insert do importador (ADR 016) — com `user_id` injetado no server e validado por zod.
- Isso **nunca** é exposto ao client — apenas em Server Actions específicas marcadas e auditáveis.

### Alternativas consideradas

**Apenas aplicação**
- ➖ Um único esquecimento → vazamento de dados. Catastrófico.

**Apenas RLS**
- ➕ Centralizado, impossível bypassar do client.
- ➖ Queries "missam" silenciosamente (retorna vazio em vez de erro 403) — UX precisa tratar.

**Defesa em profundidade (ambas)**
- ➕ Robusto.
- ➖ Duplicação de lógica. Na prática adiciona pouco ROI sobre RLS bem escrita.

### Consequências

**Positivas:**
- Vazamento por bug de aplicação fica improvável.
- Mesma policy protege Server Actions, Route Handlers e consultas diretas no Studio.
- Claude Code ou qualquer outro agente não consegue acidentalmente escrever código que vaza dados.

**Negativas / mitigações:**
- Policies mal escritas podem bloquear queries legítimas — debugging via `EXPLAIN` + tempo extra. Mitigação: **teste automatizado** de RLS — teste que cria 2 usuários, insere dados em ambos, e garante que A não enxerga dados de B. Vai em `tests/rls.test.ts`, rodando no CI.
- Operações administrativas (estatísticas globais, por exemplo) precisam de contexto `service_role`. Isolar em módulo `server/admin/`.

---

## ADR 008 — TanStack Query + Zustand

**Status:** Aceito

### Contexto

Aplicação tem duas categorias de estado:
1. **Estado de servidor:** dados vindos do DB (transações, contas). Precisa de cache, invalidação, revalidação.
2. **Estado local de UI:** tema, drawer aberto/fechado, filtros não-persistidos, seleção múltipla, estado do wizard de import.

### Decisão

- **Servidor:** **TanStack Query** para leituras no client + revalidation via Server Actions (`revalidatePath`/`revalidateTag`).
- **UI local:** **Zustand** para estado compartilhado entre componentes distantes (ex.: filtros do extrato acessíveis do header, wizard de import isolado em store própria). Props drilling/Context React para estado local simples.

### Alternativas consideradas

**Redux Toolkit + RTK Query**
- ➕ Solução completa, bem estabelecida.
- ➖ Mais boilerplate que a combinação TanStack + Zustand.

**SWR**
- ➕ Simples.
- ➖ TanStack Query é mais poderoso (mutations otimistas, query invalidation hierárquica, devtools).

**Apenas React Context + useState**
- ➖ Re-renders desnecessários, falta de cache, sem persistência em memória entre navegações.

### Consequências

**Positivas:**
- TanStack Query cuida de: cache, dedupe de requests, background refetch, retry, devtools.
- Zustand: API minimalista, sem provider obrigatório, ~1KB.
- Ambos lidam bem com Next.js App Router.

**Negativas / mitigações:**
- Duas bibliotecas pra estado. Mitigação: distinção clara (servidor = Query, UI = Zustand). Code review garante.

---

## ADR 009 — Recharts para visualizações

**Status:** Aceito

### Contexto

Dashboard e relatórios precisam de: barras (cashflow), pizza/donut (categorias), treemap, linhas (evolução), progresso.

### Decisão

Usar **Recharts** para todos os gráficos do MVP.

### Alternativas consideradas

**Chart.js (via react-chartjs-2)**
- ➕ Bonito, performático, canvas.
- ➖ API menos idiomática em React (imperativa embaixo).

**Victory**
- ➕ Flexível.
- ➖ Menos mantida ultimamente.

**Nivo**
- ➕ Muito bonito, treemap excelente.
- ➖ Bundle pesado, ecossistema menor.

**D3 direto**
- ➕ Controle total.
- ➖ Overkill para MVP. Curva íngreme, muita verbosidade.

**Tremor**
- ➕ Componentes de dashboard prontos (KPI cards + charts).
- ➖ Tremor v3 descontinuado em 2024; v4 está em transição.

**ECharts (echarts-for-react)**
- ➕ Poderoso, muitos tipos de gráfico.
- ➖ Bundle grande, API imperativa.

### Consequências

**Positivas:**
- API declarativa React-native.
- Composável (cada eixo, linha, tooltip é um componente).
- Bundle aceitável (~100KB gzip).
- Documentação extensa, muitos exemplos.

**Negativas / mitigações:**
- Treemap é funcional mas não o mais bonito. Mitigação: Nivo pode substituir só no treemap quando houver tempo.
- Performance em datasets > 10k pontos degrada. Aceitável — finanças pessoais raramente passam disso no viewport.

---

## ADR 010 — Vitest + Playwright

**Status:** Aceito

### Contexto

Precisamos garantir que lógica financeira (fatura, amortização, soma de valores, transferências, parsing de imports) não regrida. Fluxos críticos (login, criar transação, pagar fatura, import completo) precisam de testes end-to-end.

### Decisão

- **Unit / integration:** **Vitest** (+ `@testing-library/react` para componentes).
- **E2E:** **Playwright** em Chromium + WebKit.

### Alternativas consideradas

**Jest**
- ➖ Mais lento que Vitest com ESM/TypeScript.
- ➖ Config mais pesada para Next.js 15.

**Cypress**
- ➕ Muito popular.
- ➖ Playwright tem melhor paralelização, múltiplos navegadores nativos, melhor debug em CI.

**Sem testes no MVP**
- ➖ Risco alto em lógica de dinheiro. Descartado.

### Consequências

**Positivas:**
- Vitest: rápido, config mínima, compatível direto com Vite e Next.js.
- Playwright: testes realistas, auto-wait, trace viewer excelente.
- Ambos rodam em CI (GitHub Actions).

**Negativas / mitigações:**
- Escrever e manter testes consome tempo. Mitigação: escopo apertado — testar apenas (a) helpers puros (money, dates, invoice math, parsers de preset), (b) Server Actions críticas, (c) 5-8 fluxos E2E principais incluindo import Organizze completo com fixture real. Não visar 100% cobertura.

---

## ADR 011 — Deploy na Vercel + Supabase Cloud

**Status:** Aceito

### Contexto

Preciso hospedar: frontend SSR/API (Next.js), banco PostgreSQL, auth, storage. Restrição: zero custo no MVP, deploy contínuo via git.

### Decisão

- **Frontend + API (Next.js):** **Vercel** (free Hobby tier).
- **DB + Auth + Storage:** **Supabase Cloud** (free tier).
- **CI:** **GitHub Actions** (free para repos privados até limite generoso).
- **Monitoring:** **Sentry** (free tier — 5k eventos/mês), **Vercel Analytics** (básico grátis).
- **Cron jobs:** **Vercel Cron** (free) para geração de recorrências e agregações.

### Alternativas consideradas

**Railway**
- ➕ Stack all-in-one (DB + backend).
- ➖ Plano grátis removido em 2024 — $5/mês mínimo.

**Fly.io**
- ➕ Região São Paulo disponível.
- ➖ Operação mais baixo-nível (Dockerfile, fly.toml). Bom quando há Docker; overkill aqui.

**Render**
- ➕ Boas opções.
- ➖ Serviço dorme após 15min de inatividade no free tier. Cold start ruim.

**AWS (Amplify/Lambda + RDS)**
- ➖ Free tier de 12 meses apenas. Config pesada.

**Cloudflare Pages + D1**
- ➕ Performance global excelente.
- ➖ D1 (SQLite) não é adequado para este caso (relacionamentos complexos, análises). Runtime Workers tem limitações para Next.js SSR full.

### Consequências

**Positivas:**
- Zero custo no MVP.
- Deploy em cada push na `main` — sem config adicional.
- Preview deploys por PR (Vercel).
- SSL, CDN, DNS tudo gerenciado.
- Dashboard de analytics e logs integrados.

**Negativas / mitigações:**
- Lock-in moderado na Vercel (especialmente se usar ISR, Edge, etc.). Mitigação: evitar features Vercel-only quando há equivalente Next.js padrão. Next.js em si é deployável em qualquer Node host.
- Limite de 100GB bandwidth/mês na Vercel. Mitigação: monitorar; para uso pessoal é folga enorme.
- Sentry 5k eventos/mês exige configurar sampling. Mitigação: `tracesSampleRate: 0.1`, só captura erros sérios, não info.
- Limite de 4.5MB de body em Server Actions impacta import. Resolvido no ADR 016.

---

## ADR 012 — PWA antes de app nativo

**Status:** Aceito

### Contexto

Vou consumir o app majoritariamente no celular. Opções:
- Web responsivo (acessa pelo browser).
- PWA instalável.
- App nativo (React Native, Flutter, Swift/Kotlin).

### Decisão

**Web responsivo** no MVP (Fase 1-5). **PWA** na Fase 6 (manifest, service worker, install prompt, cache de assets + últimas 500 transações, queue de mutations offline). **App nativo adiado indefinidamente** até haver clara dor que justifique.

### Alternativas consideradas

**React Native / Expo desde o dia 1**
- ➕ Feeling nativo.
- ➖ Segundo deploy, segundo código (mesmo com compartilhamento, diverge rápido).
- ➖ Publicação na App Store custa US$99/ano.
- ➖ 3-5x mais esforço para features equivalentes.

**Capacitor wrap de PWA**
- ➕ Embrulha PWA em app nativo.
- ➖ Complexidade adicional apenas para estar na loja. Não resolve uso real.

### Consequências

**Positivas:**
- Uma base de código.
- Atualizações instantâneas (sem revisão de loja).
- PWA no iOS 2026 já é bastante capaz (push notifications, install, storage).

**Negativas / mitigações:**
- PWA no iOS tem limitações (storage ~50MB, reset após 7 dias sem uso). Mitigação: todo dado importante está no servidor; PWA só faz cache de UX.
- Não aparece em lojas → discoverability zero. Não é objetivo (uso pessoal).

---

## ADR 013 — Monorepo simples (single-app)

**Status:** Aceito

### Contexto

O projeto começa com um único app web. Há tentação de já estruturar com Turborepo/Nx e `packages/` compartilhados "para o futuro".

### Decisão

**Repo simples:** um `package.json`, código em `src/`. **Sem Turborepo, sem workspaces, sem packages extraídos.**

Quando (e se) aparecer um segundo app (mobile nativo, admin interno), aí sim migro pra monorepo — é refator de 1 dia.

### Alternativas consideradas

**Turborepo desde o início**
- ➕ Pronto para escalar.
- ➖ Complexidade que não paga ROI até o segundo app existir.
- ➖ Config inicial complica onboarding.

**Nx**
- ➕ Mais poderoso que Turborepo.
- ➖ Opinativo demais. Abstrações além do necessário.

### Consequências

**Positivas:**
- Onboarding zero — clone e `npm run dev`.
- Scripts no `package.json` sem `turbo run`.
- Ferramentas (ESLint, TS) com config única.

**Negativas / mitigações:**
- Refator pra monorepo se houver crescimento. Custo aceito — não é perdido tempo.

---

## ADR 014 — date-fns para datas

**Status:** Aceito

### Contexto

Aplicativo lida com muitas datas (transações, faturas com ciclos, recorrências). Precisa de: parsing, formatação em pt-BR, aritmética (adicionar meses, dias de diferença), manipulação de intervalos.

### Decisão

Usar **date-fns** com locale `pt-BR`.

### Alternativas consideradas

**dayjs**
- ➕ API similar ao Moment, familiar.
- ➖ Mutação em alguns métodos (cuidado necessário).
- ➖ Plugins para features avançadas.

**Luxon**
- ➕ Muito boa para timezones.
- ➖ Bundle maior. Over-engineered para o caso.

**Temporal (TC39)**
- ➕ Nativo futuro.
- ➖ Ainda não shipado em browsers estáveis em 2026.

**Nativo Date + Intl**
- ➕ Zero dependência.
- ➖ API péssima. Aritmética com `setMonth`, bugs de fuso.

### Consequências

**Positivas:**
- Tree-shakable — só importa o que usa (`import { addMonths } from 'date-fns'`).
- API funcional, sem mutação.
- Locale pt-BR suporta dias úteis, mês por extenso, etc.
- Testado em produção por anos.

**Negativas / mitigações:**
- 2 alternativas comuns na stack (developers podem por engano usar `dayjs`). Mitigação: ESLint rule `no-restricted-imports` para bloquear outros pacotes de data.

---

## ADR 015 — `purchase_date` denormalizado + 3 modos de exibição de gastos de cartão

**Status:** Aceito · **Data:** 2026-04-20

### Contexto

Organizze e Mobills oferecem três modos de exibir gastos de cartão em relatórios:
1. **Data da fatura** — agrupa pela fatura onde a compra aparece.
2. **Data da compra** — agrupa pela data em que a compra foi feita (independente da fatura). Em parcelamentos, mostra o valor total no mês da compra.
3. **Data da parcela** — como compra, mas parcelamentos contam só a parcela do mês.

Sou usuário ativo do Organizze e uso "Data da compra" como default (apontado no print enviado). Perder esse controle seria regressão de UX. Os três modos precisam ser consultáveis em relatórios, dashboard e orçamentos.

Implementação possível:
- **Derivação por JOIN:** reconstrói "data da compra" em cada query via JOIN com o `installment_of_id` recursivo ou CTE.
- **Denormalização:** coluna dedicada `purchase_date` preenchida na criação da transação.

### Decisão

Adicionar coluna `purchase_date date NOT NULL` em `transactions` com as regras:
- Não parcelada → `purchase_date = date`.
- Primeira parcela → `purchase_date = date` (é a data da compra).
- Parcelas subsequentes → `purchase_date = <purchase_date da primeira parcela>`, herdada.

Garantir consistência via trigger `trg_transactions_set_purchase_date` no `INSERT`. A coluna é **imutável após criação** — editar uma transação parcelada não muda `purchase_date`.

Criar view `v_card_purchases` que agrega transações de cartão por compra (parcelamento colapsa em 1 linha com soma dos valores) para suportar o modo "data da compra" sem reprocessamento em cada query de relatório.

Preferência do usuário em `user_settings.credit_card_report_mode` (default `purchase_date`).

### Alternativas consideradas

**JOIN recursivo em cada query**
- ➕ Sem denormalização, schema "mais limpo".
- ➖ Toda query de relatório/dashboard faz JOIN (ou CTE) adicional — custo cumulativo.
- ➖ Queries ficam mais complexas, mais fáceis de errar.
- ➖ `EXPLAIN` vira algo que precisa ser entendido.

**Tabela `card_purchases` separada + FK em `transactions`**
- ➕ Modela mais fielmente "uma compra, N parcelas".
- ➖ Refator grande — todo CRUD de transação de cartão vira 2 tabelas.
- ➖ Mais queries, mais RLS.
- ➖ Divergência com Organizze (que usa o modelo flat) complica o import.

**Função/view computed**
- ➕ Denormalização via view materializada.
- ➖ View materializada precisa REFRESH em cada insert — complexidade de triggers igual ou maior.

### Consequências

**Positivas:**
- Query de "data da compra" vira simples filtro: `WHERE purchase_date BETWEEN $1 AND $2`.
- Index em `(user_id, purchase_date)` acelera relatórios.
- Modelo flat continua igual ao Organizze — import direto, sem reestruturação.
- Os três modos viram apenas variação de filtro, não mudança estrutural.

**Negativas / mitigações:**
- Coluna denormalizada exige disciplina. Mitigação: trigger `BEFORE INSERT` cuida do preenchimento automático. Teste de regressão no Vitest que valida: "ao inserir parcela N de parcelamento, `purchase_date` == `purchase_date` da parcela 1".
- Se o usuário editar `date` da primeira parcela depois de criada (caso raro mas possível), `purchase_date` das subsequentes fica desatualizado. Mitigação: **proibir edição de `date` em transações com parcelas filhas**. Ou cascata no `UPDATE` — mas a proibição é mais simples e defensável (consistência > flexibilidade num caso raro).
- Espaço: coluna `date` adicional = 4 bytes por linha. Irrelevante.

---

## ADR 016 — Parsing client-side + bulk insert via Server Action (importador)

**Status:** Aceito · **Data:** 2026-04-20

### Contexto

Importação de transações (Organizze e outros) pode envolver arquivos grandes. Usuário com 3 anos de Organizze pode gerar CSV de 5-15MB com 10-20 mil linhas. O importador é **bloqueador pessoal** — sem migrar meus dados, não adoto o app.

Arquiteturas possíveis:
1. Upload do arquivo pro servidor (Server Action recebe `File`) → parse no servidor → insert.
2. Upload pro Supabase Storage → worker background processa.
3. Parse client-side → envia JSON estruturado pro servidor em batches → insert.

### Decisão

**Opção 3: parse client-side + bulk insert via Server Action em batches de 500.**

Fluxo:
1. Usuário seleciona arquivos no wizard.
2. `papaparse` (CSV) ou `SheetJS` (XLSX) processam em **Web Worker** (thread separada, não trava UI). Libs carregadas via `import()` dinâmico apenas na rota `/import`.
3. UI mostra preview e coleta mapeamento de colunas/contas/cartões/categorias.
4. No clique de "Iniciar importação", client envia batches de **500 transações por vez** via Server Action `importTransactions(importId, batch)`.
5. Server valida cada batch com zod e faz `INSERT` em uma transação Postgres. Falha de batch retorna erro sem afetar batches anteriores (batch é a unidade de rollback).
6. Cliente mostra progresso atualizado a cada batch respondido.

Registra cada importação em `imports` (metadata) e cada mapeamento em `import_mappings` (reuso futuro).

### Alternativas consideradas

**Upload do arquivo ao servidor (opção 1)**
- ➖ **Server Actions na Vercel têm limite de body de 4.5MB no plano Hobby.** Arquivo de 10MB não cabe. Isso sozinho já inviabiliza.
- ➖ Route Handler contorna o limite (até 100MB), mas perde-se o modelo de Server Action.
- ➖ Parse no servidor em Vercel Function tem limite de **60s** no plano Hobby. Arquivo grande com parsing + insert pode estourar.

**Upload para Supabase Storage + worker (opção 2)**
- ➕ Escala bem pra arquivos grandes.
- ➖ Precisa de worker rodando em algum lugar (Supabase Edge Function ou Vercel Cron). Complexidade extra.
- ➖ UX: usuário sobe, fecha tab, não sabe status — precisa de tela de listagem com polling.
- ⏸ **Quando adotar:** se aparecer necessidade de arquivos > 50MB regularmente. Não no MVP do importador.

### Consequências

**Positivas:**
- Zero upload de arquivo bruto ao servidor. Menos dado em trânsito.
- Preview instantâneo pro usuário — cada etapa do wizard roda sem round-trip.
- Batches de 500 cabem folgados no limite de 4.5MB da Server Action (~200KB por batch de transações JSON).
- Progresso granular visível.
- Resiliente: se usuário fechar a aba durante import, batches já respondidos ficam. UX ao reabrir: "X de Y importadas — continuar?" (estado persistido em `imports.status = processing` + últimos batches em sessionStorage).

**Negativas / mitigações:**
- Parse no browser pode ser lento em máquinas fracas. Mitigação: Web Worker (não trava UI); mostrar progresso se > 2s.
- Dependências aumentam bundle (papaparse ~45KB, SheetJS ~800KB, ofx-parser ~30KB). Mitigação: **lazy load obrigatório** — libs entram só na rota `/import` via `next/dynamic` ou `import()`. Nunca no bundle inicial. Verificado via `@next/bundle-analyzer` no CI.
- Bulk insert de 500 linhas num único `INSERT` com Drizzle é bem suportado; em caso de tabelas muito grandes poderia haver pressão na DB. Mitigação: monitorar via Sentry; se necessário, reduzir para 250/batch.
- Cliente malicioso pode enviar JSON forjado (sem passar pelo parser client-side). Mitigação: validação zod rigorosa no server + todas as regras de negócio (purchase_date, RLS) aplicadas no Postgres.

---

## Observações Finais

Estas decisões são para o **MVP e primeiras iterações**. Revisitar em marcos claros:
- Após 3 meses de uso pessoal real.
- Se performance degradar (antes: reforço; depois: realocar).
- Se o app ganhar mais usuários (> 100 MAU) — repensar infra free tier.
- Se decisão comprovadamente bloquear feature desejada (ex.: app nativo por push silenciosa).

**Princípio guia:** decisões são escolhidas para **começar rápido com baixa dívida técnica**. Dívida consciente e localizada é aceitável; dívida estrutural é recusada.
