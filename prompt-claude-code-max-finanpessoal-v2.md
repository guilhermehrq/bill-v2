# Prompt para Claude Code Max — Plataforma Web de Controle Financeiro Pessoal

**Versão:** 2.0 · **Atualizado:** 2026-04-20

## 📋 Como usar este prompt

Copie **tudo abaixo da linha divisória** e cole no Claude Code Max como primeira mensagem do projeto. Anexe também `wireframes-finpessoal.md` (referência visual/estrutural das telas) e `adr-finpessoal.md` (decisões arquiteturais imutáveis sem minha autorização). O agente vai inicializar o repositório, configurar o ambiente e começar a construir em fases. Acompanhe fase por fase — não deixe ele sair construindo a v2 antes de você validar o MVP.

---

# Projeto: FinPessoal — Plataforma Web de Controle Financeiro Pessoal

## 1. Contexto e Objetivo

Construa uma **plataforma web full-stack de controle financeiro pessoal** inspirada em Organizze e Mobills, com diferenciais técnicos e de UX. O usuário final sou eu (uso individual inicialmente, mas a arquitetura deve permitir multi-usuário desde o dia 1). A prioridade é **entregar um MVP funcional, navegável e deployado em produção** antes de qualquer expansão.

**Princípios do projeto:**
- **Mobile-first responsivo**, mesmo sendo web (vou usar no celular via PWA).
- **Type-safe de ponta a ponta** (DB → API → UI).
- **Zero custo de infra** no MVP (tudo em free tier).
- **Código legível, testado onde faz sentido, documentado no README.**
- **Deploy contínuo** (push na `main` → produção).
- **Migração do Organizze como requisito crítico** — sou usuário ativo e o app só passa a ser útil quando conseguir consumir meu histórico. O importador Organizze tem prioridade imediatamente pós-MVP.

## 2. Stack Técnica Obrigatória

```
Runtime:       Node.js 20 LTS
Framework:     Next.js 15 (App Router) + TypeScript (strict)
UI:            Tailwind CSS + shadcn/ui + lucide-react
Forms:         react-hook-form + zod (validação isomorfica)
Data fetching: TanStack Query (client) + Server Actions (mutations)
Estado local:  Zustand (somente onde Context não basta)
DB:            PostgreSQL via Supabase
ORM:           Drizzle ORM + drizzle-kit (migrations)
Auth:          Supabase Auth (email/senha + Google OAuth)
Storage:       Supabase Storage (anexos de transação, OCR futuro, logs de import)
Charts:        Recharts
Datas:         date-fns (pt-BR locale)
Dinheiro:      dinero.js v2 (evita bug de float com centavos)
Parsing:       papaparse (CSV), SheetJS (XLSX), node-ofx-parser (OFX) — lazy-loaded
Testes:        Vitest (unit) + Playwright (e2e nos fluxos críticos)
Lint/Format:   ESLint + Prettier + Husky + lint-staged
Deploy:        Vercel (frontend/API) + Supabase (DB/Auth/Storage)
Observability: Vercel Analytics + Sentry (free tier)
```

**Regras de stack:**
- Nunca use `any` em TypeScript. Use `unknown` + narrowing.
- Todo valor monetário é armazenado em **centavos (integer)** no banco. Nunca `float`/`numeric` pra dinheiro de transação. Use `dinero.js` pra operar.
- Toda data de transação é armazenada como `DATE` (sem timezone). Timestamps do sistema (`created_at`, `updated_at`) são `TIMESTAMPTZ`.
- Todas as queries passam por RLS (Row Level Security) do Supabase. Nunca bypass com service role no client.
- Bibliotecas de parsing (papaparse, SheetJS, OFX parser) **sempre lazy-loaded** — nunca entram no bundle inicial. Importar via `next/dynamic` ou `import()` dinâmico somente na rota `/import`.

## 3. Estrutura do Repositório

```
finpessoal/
├── apps/
│   └── web/                    # Next.js app
│       ├── src/
│       │   ├── app/            # App Router
│       │   │   ├── (auth)/     # rotas públicas (login, signup)
│       │   │   ├── (app)/      # rotas autenticadas
│       │   │   └── api/        # route handlers (webhooks, cron)
│       │   ├── components/     # UI components (shadcn + custom)
│       │   ├── features/       # lógica de domínio por feature
│       │   │   ├── accounts/
│       │   │   ├── transactions/
│       │   │   ├── categories/
│       │   │   ├── budgets/
│       │   │   ├── cards/
│       │   │   ├── investments/
│       │   │   ├── goals/
│       │   │   ├── reports/
│       │   │   ├── recurrences/
│       │   │   └── imports/    # importador (Fase 2.5)
│       │   │       ├── parsers/    # csv, xlsx, ofx
│       │   │       ├── presets/    # organizze, mobills, generic
│       │   │       └── ui/         # wizard steps
│       │   ├── lib/            # helpers (money, dates, supabase client)
│       │   ├── db/             # schema Drizzle + migrations
│       │   └── server/         # Server Actions + business logic
├── packages/                   # (se necessário no futuro)
├── .env.example
├── drizzle.config.ts
├── README.md
└── package.json
```

## 4. Modelo de Dados (PostgreSQL)

Crie o schema Drizzle correspondente. Todas as tabelas têm `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `created_at`, `updated_at`. Todas as tabelas têm RLS ativado com policy `user_id = auth.uid()`.

### 4.1. Entidades principais

**`accounts`** — contas bancárias, carteira, poupança
- `name` text, `type` enum(`checking`, `savings`, `cash`, `investment`, `other`)
- `institution` text nullable, `color` text (hex), `icon` text
- `initial_balance_cents` bigint default 0
- `currency` text default `'BRL'`
- `archived` boolean default false

**`credit_cards`** — cartões de crédito (separado de `accounts` por terem ciclo)
- `name` text, `brand` text (visa/master/etc), `last_digits` text(4)
- `limit_cents` bigint, `closing_day` smallint (1-31), `due_day` smallint (1-31)
- `default_account_id` uuid REFERENCES accounts(id) — conta de débito da fatura
- `color` text, `archived` boolean

**`categories`** — árvore de categorias
- `name` text, `type` enum(`income`, `expense`)
- `parent_id` uuid nullable REFERENCES categories(id)
- `icon` text, `color` text
- `is_system` boolean default false (categorias padrão não podem ser deletadas)

**`transactions`** — toda movimentação
- `description` text
- `amount_cents` bigint (sempre positivo; direção vem de `type`)
- `type` enum(`income`, `expense`, `transfer`)
- `date` date (competência — data em que a transação acontece no fluxo de caixa / data da parcela)
- `purchase_date` date NOT NULL (data original da compra — ver nota abaixo)
- `account_id` uuid nullable REFERENCES accounts(id)
- `credit_card_id` uuid nullable REFERENCES credit_cards(id)
- `category_id` uuid nullable REFERENCES categories(id)
- `transfer_pair_id` uuid nullable (aponta pra transação-espelho em transferências)
- `is_paid` boolean default true (não-pago = previsto)
- `paid_at` date nullable
- `invoice_id` uuid nullable REFERENCES credit_card_invoices(id)
- `installment_of_id` uuid nullable REFERENCES transactions(id)
- `installment_number` smallint nullable, `installment_total` smallint nullable
- `recurrence_id` uuid nullable REFERENCES recurrences(id)
- `tags` text[] default '{}'
- `notes` text nullable
- `attachment_url` text nullable
- `import_id` uuid nullable REFERENCES imports(id) — rastreabilidade de origem
- `source_external_id` text nullable — id da transação na origem (Organizze, etc.), para detecção de re-import

**Nota sobre `purchase_date`** — campo denormalizado e **imutável** após criação:
- Para transações **não parceladas**: `purchase_date = date`.
- Para **primeira parcela** de parcelamento: `purchase_date = date` (também é a data da compra).
- Para **parcelas subsequentes**: `purchase_date = <data da primeira parcela>` (herdada do pai).

O objetivo é permitir os três modos de exibição de gastos de cartão (fatura / compra / parcela) sem JOINs recursivos em relatório. Ver seção 4.2 para o trigger que garante o preenchimento automático.

**Constraints em `transactions`:**
- `CHECK ((account_id IS NOT NULL) <> (credit_card_id IS NOT NULL))` — toda transação pertence a uma conta OU a um cartão, nunca ambos, nunca nenhum.
- `CHECK (amount_cents > 0)` — valor sempre positivo.
- `CHECK (installment_number IS NULL OR (installment_number BETWEEN 1 AND installment_total))`.

**`credit_card_invoices`** — faturas agrupadas
- `credit_card_id` uuid NOT NULL
- `reference_month` date (primeiro dia do mês de referência)
- `closing_date` date, `due_date` date
- `status` enum(`open`, `closed`, `paid`, `overdue`, `partial`)
- `total_cents` bigint (calculado)
- `paid_cents` bigint default 0 (para pagamento parcial)
- Unique: `(credit_card_id, reference_month)`

**`budgets`** — limites de gasto
- `category_id` uuid NOT NULL
- `month` date (primeiro dia do mês), `amount_cents` bigint
- Unique: `(user_id, category_id, month)`

**`recurrences`** — modelos de transação recorrente
- `description`, `amount_cents`, `type`, `category_id`, `account_id` / `credit_card_id`
- `frequency` enum(`daily`, `weekly`, `monthly`, `yearly`)
- `interval` smallint default 1 (a cada X unidades)
- `day_of_month` smallint nullable, `day_of_week` smallint nullable
- `start_date` date, `end_date` date nullable, `max_occurrences` int nullable
- `active` boolean default true
- `last_generated_date` date nullable

**`goals`** — metas financeiras
- `name` text, `target_cents` bigint, `current_cents` bigint default 0
- `target_date` date nullable, `account_id` uuid nullable (conta vinculada)
- `icon`, `color`, `archived` boolean

**`investments`** — tracking manual (sem preços em tempo real no MVP)
- `name` text, `ticker` text nullable
- `type` enum(`stock`, `fii`, `fixed_income`, `crypto`, `fund`, `other`)
- `broker` text, `quantity` numeric(20,8), `average_price_cents` bigint
- `current_price_cents` bigint nullable (update manual ou job futuro)
- `archived` boolean

**`investment_transactions`** — aportes, retiradas, proventos
- `investment_id` uuid NOT NULL
- `type` enum(`buy`, `sell`, `dividend`, `jcp`, `bonus`)
- `date` date, `quantity` numeric(20,8), `price_cents` bigint
- `fees_cents` bigint default 0, `notes` text

**`user_settings`** — preferências do usuário (1:1 com auth.users)
- `credit_card_report_mode` enum(`invoice_date`, `purchase_date`, `installment_date`) default `purchase_date`
- `theme` enum(`system`, `light`, `dark`) default `system`
- `density` enum(`comfortable`, `compact`) default `comfortable`
- `default_currency` text default `'BRL'`
- `timezone` text default `'America/Sao_Paulo'`
- `locale` text default `'pt-BR'`
- Unique: `(user_id)` — sempre 1 por usuário, criado via trigger no signup

**`imports`** — registro de cada importação (Fase 2.5)
- `source` text (`organizze`, `mobills`, `ofx`, `csv_generic`)
- `filename` text, `row_count` int
- `imported_count` int default 0
- `skipped_count` int default 0
- `error_count` int default 0
- `status` enum(`pending`, `processing`, `success`, `partial_failure`, `failed`)
- `started_at` timestamptz, `finished_at` timestamptz nullable
- `log_url` text nullable (Supabase Storage)
- `metadata` jsonb default `'{}'` (mapeamentos aplicados, presets, etc.)

**`import_mappings`** — cache de mapeamentos usuário → origem
- `source` text, `source_type` enum(`account`, `card`, `category`)
- `source_value` text (ex.: `"Alimentação > Mercado"`)
- `target_type` enum(`account`, `card`, `category`, `ignore`)
- `target_id` uuid nullable
- Unique: `(user_id, source, source_type, source_value)`

### 4.2. Views/funções/triggers no Postgres

**Views:**
- `v_account_balances` — saldo atual por conta (`initial_balance_cents` + soma de transações pagas).
- `v_invoice_totals` — total de cada fatura aberta.
- `v_monthly_cashflow` — receitas/despesas agregadas por mês.
- `v_card_purchases` — transações de cartão agrupadas por "compra" (agrega parcelamentos):
  ```sql
  CREATE OR REPLACE VIEW v_card_purchases AS
  SELECT
    COALESCE(installment_of_id, id) AS purchase_id,
    user_id,
    credit_card_id,
    category_id,
    MAX(purchase_date) AS purchase_date,
    MIN(description) AS description,
    SUM(amount_cents) AS total_amount_cents,
    MAX(installment_total) AS total_installments,
    COUNT(*) AS parcels_in_scope
  FROM transactions
  WHERE credit_card_id IS NOT NULL
  GROUP BY COALESCE(installment_of_id, id), user_id, credit_card_id, category_id;
  ```

**Funções/triggers:**
- `fn_recalculate_invoice(invoice_id)` — recalcula `total_cents` da fatura.
- `trg_transactions_invoice_assign` — atribui automaticamente `invoice_id` para transações de cartão com base em `closing_day`.
- `trg_set_purchase_date` — preenche `purchase_date` automaticamente (denormalização imutável):
  ```sql
  CREATE OR REPLACE FUNCTION fn_set_purchase_date()
  RETURNS trigger AS $$
  BEGIN
    IF NEW.installment_of_id IS NOT NULL THEN
      SELECT purchase_date INTO NEW.purchase_date
      FROM transactions WHERE id = NEW.installment_of_id;
    ELSE
      NEW.purchase_date := NEW.date;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_transactions_set_purchase_date
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_purchase_date();
  ```
- `trg_user_settings_create` — cria linha default em `user_settings` quando um novo usuário é criado em `auth.users`.

**Indexes críticos:**
- `CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);`
- `CREATE INDEX idx_transactions_user_purchase_date ON transactions (user_id, purchase_date DESC);`
- `CREATE INDEX idx_transactions_account ON transactions (account_id) WHERE account_id IS NOT NULL;`
- `CREATE INDEX idx_transactions_card ON transactions (credit_card_id) WHERE credit_card_id IS NOT NULL;`
- `CREATE INDEX idx_transactions_invoice ON transactions (invoice_id) WHERE invoice_id IS NOT NULL;`
- `CREATE INDEX idx_transactions_description_trgm ON transactions USING gin (description gin_trgm_ops);` — para busca textual e detecção de duplicadas no import. Requer `CREATE EXTENSION pg_trgm`.
- `CREATE INDEX idx_transactions_source_external ON transactions (user_id, source_external_id) WHERE source_external_id IS NOT NULL;`

## 5. Requisitos Funcionais — MVP (Fase 1)

### 5.1. Autenticação
- [ ] Signup com email/senha (confirmação por email).
- [ ] Login email/senha e Google OAuth.
- [ ] Recuperação de senha.
- [ ] Logout, "mantenha-me conectado".
- [ ] Proteção de rotas via middleware Next.js + cookies Supabase.
- [ ] Trigger que cria `user_settings` default ao criar usuário.

### 5.2. Onboarding
- [ ] Ao primeiro login: wizard de 3 passos (criar conta bancária inicial, importar categorias padrão pt-BR, saldo inicial).
- [ ] Seed de ~40 categorias padrão (Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Salário, Investimentos, etc.).

### 5.3. Contas
- [ ] CRUD de contas bancárias (tipo, banco, cor, ícone, saldo inicial).
- [ ] Arquivar/desarquivar.
- [ ] Lista com saldo atual calculado (transações pagas).
- [ ] Detalhe da conta: extrato com filtros (período, categoria, tipo, valor).

### 5.4. Cartões de crédito
- [ ] CRUD de cartões (limite, dia de fechamento, dia de vencimento, conta de débito padrão).
- [ ] Tela de fatura: lista de faturas (aberta, fechada, paga) com total e % de uso do limite.
- [ ] Detalhe da fatura: transações da fatura, botão "pagar fatura" (cria transação de débito na conta vinculada). Suporte a pagamento parcial.
- [ ] Suporte a **compra parcelada**: ao criar transação no cartão, opção "X parcelas" gera N transações com `installment_of_id`, `installment_number`, `installment_total`. As parcelas caem em faturas dos meses subsequentes. `purchase_date` de todas as parcelas = data da primeira.

### 5.5. Transações
- [ ] CRUD completo (receita, despesa, transferência entre contas).
- [ ] Transferência cria par espelhado com `transfer_pair_id`.
- [ ] Anexar comprovante (Supabase Storage).
- [ ] Edição em massa (mudar categoria de várias de uma vez).
- [ ] Marcar como pago/não-pago.
- [ ] Duplicar transação.
- [ ] Busca full-text na descrição + filtros (conta, cartão, categoria, tag, intervalo de valor, período).

### 5.6. Categorias
- [ ] CRUD com hierarquia (até 2 níveis).
- [ ] Categorias de receita e despesa separadas.
- [ ] Merge de categorias (mesclar A em B, move todas as transações).

### 5.7. Recorrências
- [ ] CRUD de recorrências (frequência, dia, conta/cartão, categoria).
- [ ] Job diário (cron via Vercel Cron ou Supabase Edge Function) gera as próximas transações previstas com `is_paid = false`.
- [ ] Tela "Previstos" lista transações futuras dos próximos 30/60/90 dias.
- [ ] Confirmar transação prevista = marcar como paga.

### 5.8. Orçamentos (Budgets)
- [ ] CRUD de orçamento mensal por categoria.
- [ ] Tela de orçamento do mês: barra de progresso por categoria (gasto / limite), cor muda conforme % (verde → amarelo → vermelho).
- [ ] Copiar orçamento de mês anterior.
- [ ] Alerta visual quando passa de 80% e 100%.
- [ ] Cálculo do "gasto" respeita `credit_card_report_mode` do usuário.

### 5.9. Metas
- [ ] CRUD de metas (valor alvo, data alvo, conta vinculada opcional).
- [ ] Progresso calculado automaticamente (se vinculada a conta) ou manual.
- [ ] Projeção: "nessa velocidade você atinge em X meses".

### 5.10. Dashboard (home)
- [ ] Cards: saldo total (soma contas), receitas do mês, despesas do mês, saldo do mês.
- [ ] Gráfico de fluxo de caixa dos últimos 6 meses (barras receita/despesa).
- [ ] Pizza de despesas por categoria (mês atual).
- [ ] Próximas contas a pagar (7 dias).
- [ ] Status das faturas abertas.
- [ ] Top 5 orçamentos (% usado).
- [ ] **Cards de "Receitas/Despesas do mês" respeitam o `credit_card_report_mode` global.** Exibir badge discreto indicando o modo ativo (ex.: "por data da compra") — click no badge abre a Config.

### 5.11. Relatórios
- [ ] Por categoria (treemap + tabela, drill-down).
- [ ] Evolução patrimonial (linha, últimos 12 meses).
- [ ] Comparativo de períodos (mês a mês, ano a ano).
- [ ] **Seletor de modo de exibição de gastos de cartão** (segmented control com três opções: "Data da fatura" / "Data da compra" / "Data da parcela"). Default = preferência global do usuário; a seleção na tela é override apenas de sessão (não persiste). Tooltip `ⓘ` explica cada modo.
- [ ] Exportar CSV de qualquer relatório/extrato.

**Lógica de filtro por modo** (aplicar em reports, dashboard, orçamentos):

```
invoice_date:   filtrar via JOIN com credit_card_invoices.reference_month
purchase_date:  filtrar por transactions.purchase_date
                + para parceladas, agrupar por purchase_id (ver view v_card_purchases)
                + exibir valor total da compra (não da parcela)
installment_date: filtrar por transactions.date
                  + cada parcela conta no seu mês individual
```

### 5.12. Configurações
- [ ] Perfil (nome, avatar, timezone, moeda padrão).
- [ ] Tema claro/escuro/sistema.
- [ ] **Preferência de exibição de gastos de cartão** (`invoice_date` / `purchase_date` / `installment_date`), default `purchase_date`. Explicação textual de cada modo junto ao controle.
- [ ] Gerenciar categorias, contas, cartões.
- [ ] Exportar todos os dados (JSON + CSV).
- [ ] Deletar conta (soft delete com confirmação dupla).

## 6. Requisitos Funcionais — Fase 2 (Diferenciais)

Implemente **somente depois do MVP em produção e validado** — com exceção do **6.1 Importador**, que é **Fase 2.5** (imediatamente após o MVP, antes dos outros diferenciais).

### 6.1. Importador de transações — genérico com presets 🚨 PRIORITÁRIO

**Contexto crítico:** sou usuário ativo do Organizze. A migração do meu histórico é pré-requisito para o app entrar em uso real.

**Escopo:**
Construir wizard de 7 passos: origem → upload → mapeamento de colunas → mapeamento de contas → mapeamento de cartões → mapeamento de categorias → revisão + import.

**Presets de primeira entrega:**
- **Organizze (CSV/XLSX)** — prioritário.
- **OFX genérico** (para bancos).
- **CSV genérico** (fallback, com mapeamento manual).
- **Mobills** — posterior, mesma arquitetura.

**Arquitetura em camadas:**
```
Parser layer    → papaparse (CSV) / SheetJS (XLSX) / ofx-parser (OFX)
                  produz: RawRow[]
Preset layer    → { detectColumns(rows), transformRow(row) → CanonicalTransaction }
                  um preset por origem
Mapping UI      → usuário revisa e ajusta (colunas, contas, cartões, categorias)
Import Action   → Server Action valida + bulk insert transacional
```

**Forma canônica (`CanonicalTransaction`):**
```typescript
type CanonicalTransaction = {
  sourceId?: string;              // id original na origem
  date: string;                   // ISO date
  description: string;
  amountCents: number;
  type: 'income' | 'expense' | 'transfer';
  sourceAccountName?: string;
  sourceCardName?: string;
  sourceCategoryPath?: string;    // "Alimentação > Mercado"
  isPaid: boolean;
  isRecurring: boolean;
  installment?: { number: number; total: number };
  tags: string[];
  notes?: string;
  raw: Record<string, unknown>;   // linha bruta para debug
};
```

**Requisitos técnicos:**
- **Parser client-side** (ver ADR 015): arquivo nunca sobe intacto ao servidor. Parsing em Web Worker para não travar UI.
- **Server Action `importTransactions(batches)`**: recebe batches de 500 transações por vez. Bulk insert em transação Postgres. Rollback total por batch se qualquer linha falhar; batches bem-sucedidos permanecem.
- **Detecção de duplicadas** via `pg_trgm`:
  - Similaridade de descrição > 0.85
  - Mesmo valor
  - Data ±1 dia de tolerância
  - Bônus: `source_external_id` bate → duplicada certa
- **Reconstrução de parcelamentos** por regex `/(.+?)\s*\((\d+)\/(\d+)\)\s*$/` na descrição (Organizze exporta parceladas como N linhas separadas no formato `"Notebook Dell (1/10)"`). Se detecta N transações com mesmo nome base, valor igual, mesmo cartão, datas mensais em sequência (±5 dias de tolerância), agrupa em estrutura pai-filho.
- **Fallback seguro:** se heurística de parcelamento falhar, importa flat. Melhor dado solto do que dado perdido.
- **Tabela `import_mappings`** persiste mapeamentos de entidade (Organizze → nossa) para reuso automático em imports futuros.
- **Tabela `imports`** registra cada operação.
- **Log JSON baixável** com resultado linha a linha (ok / duplicate / error + motivo).
- **Limites:** 10 arquivos × 50MB cada × 50k transações cumulativas por import.

**Presets: como cada um trata a entrada**

Organizze CSV (colunas típicas — validar no momento da implementação):
```
Data, Descrição, Valor, Categoria, Conta, Tags, Recorrência, Observações, Status
```
Detecção: cabeçalho com "Descrição" (com cedilha) + "Valor" + "Categoria" é forte pista Organizze.

OFX: usar `node-ofx-parser`. Categorias ficam vazias (OFX não tem). Conta vem de `ACCTID`. Descrição de `MEMO` ou `NAME`.

CSV genérico: sem detecção. Usuário mapeia tudo manualmente.

### 6.2. Detecção de assinaturas recorrentes
- Job semanal identifica transações com mesmo valor + mesmo estabelecimento em cadência regular.
- Sugere transformar em recorrência.
- Alerta quando valor de assinatura sobe.

### 6.3. Previsão de caixa (Cashflow Forecast)
- Projeção dos próximos 90 dias usando recorrências + média móvel por categoria.
- Gráfico de saldo projetado com banda de confiança.

### 6.4. Financial Health Score
- Score 0-100 baseado em: taxa de poupança, liquidez (meses de reserva), % da renda comprometida com dívidas, diversificação de investimentos.
- Explicação de cada componente e sugestões.

### 6.5. Gestão de dívidas
- CRUD de dívidas (empréstimo, financiamento).
- Tabela de amortização (SAC e Price).
- Simulador de quitação antecipada.

### 6.6. Simulador "What-if"
- "Se eu poupar +R$ X por mês, quando atinjo minha meta?"
- "Se eu cortar categoria Y em 20%, qual o impacto anual?"

### 6.7. OCR de recibos
- Upload de foto de nota/cupom → extrai valor, estabelecimento, data.
- Usa API do Google Vision ou Claude Vision (via API Anthropic). Cria transação pré-preenchida.

### 6.8. Multi-moeda
- Suporte a contas/transações em USD, EUR.
- Cotação diária via API pública (awesomeapi.com.br).

### 6.9. PWA
- Manifest, service worker, instalável no celular.
- Funciona offline (cache de últimas 500 transações, queue de mutations).

### 6.10. Notificações
- Email (Resend, free tier) para: fatura fechando, meta atingida, orçamento estourado, transação recorrente gerada.
- Configurável por tipo.

## 7. Requisitos Não-Funcionais

- **Performance:** LCP < 2.5s, INP < 200ms nas páginas principais. Paginação server-side em listas com > 50 itens.
- **Acessibilidade:** WCAG 2.1 AA. Teste com axe-core no CI.
- **Segurança:**
  - RLS em TODAS as tabelas (policy testada via Playwright).
  - Rate limiting nas Server Actions sensíveis (Upstash, free tier).
  - CSP headers configurados.
  - Nenhuma chave de serviço no client.
- **Internacionalização:** pt-BR como padrão. Mensagens, datas, moeda e números formatados corretamente. Estrutura pronta pra en-US no futuro (next-intl).
- **Testes:**
  - Unit: helpers de dinheiro, cálculo de fatura, amortização, parsing de cada preset de importador.
  - Integração: Server Actions de transações (incluindo transferências e parcelamento), `importTransactions`.
  - E2E (Playwright): login, criar transação, pagar fatura, criar orçamento, **import Organizze completo com fixture real**.
- **CI/CD:** GitHub Actions — lint + typecheck + test + build a cada PR. Merge na `main` dispara deploy na Vercel.

## 8. UX/UI — Diretrizes

- **Design system:** shadcn/ui como base. Paleta: verde (receita/positivo), vermelho (despesa/alerta), âmbar (previsto/atenção), slate (neutro).
- **Layout:** sidebar colapsável no desktop, bottom nav no mobile.
- **Atalhos de teclado:** `N` = nova transação, `/` = busca global, `G + D` = dashboard, `G + T` = transações.
- **Ações rápidas:** FAB no mobile pra nova transação. Formulário inline em 4 campos (valor → descrição → categoria → data). "Salvar e criar outra" como padrão ao adicionar várias.
- **Empty states:** sempre com CTA + ilustração.
- **Loading:** skeletons, não spinners genéricos.
- **Feedback:** toast (sonner) pra ações, com undo em operações destrutivas (8s).
- **Dark mode** real, não apenas invert. Teste os contrastes.
- **Money formatting:** `R$ 1.234,56`. Nunca com tantas casas decimais quanto o float decidir.

## 9. Plano de Entrega (Fases)

**Não avance de fase sem aprovação explícita minha.**

### Fase 0 — Fundação (1 sessão)
1. Inicializar repo Next.js + TS strict + Tailwind + shadcn/ui.
2. Configurar Drizzle + Supabase local (supabase CLI).
3. Setup de ESLint, Prettier, Husky, lint-staged.
4. GitHub Actions (lint + typecheck + test).
5. README com setup, arquitetura, comandos.
6. Deploy inicial "hello world" na Vercel conectada ao Supabase.

### Fase 1 — Schema + Auth (1-2 sessões)
1. Implementar schema completo (seção 4) com migrations Drizzle.
2. Seeds: categorias padrão pt-BR.
3. Extensões Postgres: `pg_trgm` ativada.
4. Triggers: `trg_set_purchase_date`, `trg_user_settings_create`.
5. RLS policies em todas as tabelas + testes.
6. Auth flows completos (signup, login, OAuth Google, reset, middleware).
7. Layout autenticado (sidebar + topbar).

### Fase 2 — Contas + Transações (2-3 sessões)
1. CRUD de contas.
2. CRUD de categorias (hierárquico).
3. CRUD de transações (receita, despesa, transferência).
4. Extrato com filtros e busca.
5. Dashboard básico (4 cards + gráfico cashflow).

### Fase 3 — Cartões + Faturas (2 sessões)
1. CRUD de cartões.
2. Trigger de atribuição automática de fatura.
3. Parcelamento (com `purchase_date` herdada corretamente).
4. Tela de fatura + pagamento (total e parcial).
5. View `v_card_purchases` e query helpers para os 3 modos de exibição.

### Fase 4 — Orçamentos + Recorrências + Metas (2 sessões)
1. Orçamentos mensais com visualização.
2. Recorrências + job de geração.
3. Metas com progresso.

### Fase 5 — Relatórios + Investimentos + Polish (1-2 sessões)
1. Tela de relatórios (categoria, evolução, comparativo, export CSV).
2. **Seletor de modo de exibição de gastos de cartão** funcional em todos os lugares (dashboard, relatórios, orçamentos).
3. CRUD de investimentos + transações de investimento.
4. Polish: atalhos de teclado, empty states, acessibilidade, dark mode, performance.
5. Testes E2E dos fluxos críticos.
6. **Deploy MVP em produção e validar uso real por 2 semanas antes da Fase 6+.**

### Fase 2.5 — Importador de transações (Organizze first) 🚨 (1-2 sessões)

**Entra imediatamente após a Fase 5.** Sem isso o app não entra em uso real pra mim.

1. Estrutura `features/imports/` com parsers (csv/xlsx/ofx) lazy-loaded.
2. Presets: Organizze, OFX genérico, CSV genérico.
3. Server Action `importTransactions` com bulk insert em batches.
4. Wizard de 7 passos (telas conforme `wireframes-finpessoal.md` seção 18).
5. Detecção de duplicadas via `pg_trgm`.
6. Reconstrução de parcelamentos por regex.
7. Tabelas `imports` e `import_mappings`.
8. Testes E2E com fixture real de export Organizze.

### Fase 6+ (posterior)
Features 6.2 a 6.10, uma por vez.

## 10. Setup e Deploy

### Variáveis de ambiente (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # só server
DATABASE_URL=                   # pooled connection Supabase
DIRECT_URL=                     # migrations
SENTRY_DSN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Deploy
1. Criar projeto no Supabase (região São Paulo se disponível, senão us-east-1).
2. Rodar migrations via `drizzle-kit push`.
3. Conectar repo ao Vercel, configurar env vars, branch `main` = produção.
4. Configurar domínio custom (opcional — Vercel dá `.vercel.app` grátis).
5. Sentry: projeto Next.js, DSN no env.

### Comandos esperados no `package.json`
```
dev          # next dev
build        # next build
start        # next start
lint         # eslint
typecheck    # tsc --noEmit
test         # vitest
test:e2e     # playwright
db:push      # drizzle-kit push
db:studio    # drizzle-kit studio
db:generate  # drizzle-kit generate
```

## 11. Regras de Conduta do Agente

1. **Sempre comece lendo o README e explicando o plano da sessão** antes de codar.
2. **Commits pequenos e semânticos** (conventional commits). Um commit por entidade/feature.
3. **Não introduza biblioteca nova sem justificar** — se der pra fazer com o que já tem, faça.
4. **Testes antes de declarar pronto** em lógica de dinheiro, fatura, amortização e parsers de import.
5. **Pergunte antes de tomar decisões irreversíveis** (ex.: mudar schema em produção, adotar outro DB).
6. **Respeite o `adr-finpessoal.md`** — decisões ali registradas não mudam sem minha autorização explícita.
7. **Ao final de cada fase**, gere um relatório curto: o que foi feito, o que ficou pendente, riscos, próximos passos.
8. **Português nos commits e UI**. Código e comentários em inglês.

## 12. Critérios de "Pronto" para o MVP

- [ ] Deploy público acessível, HTTPS, domínio funcionando.
- [ ] Cadastro e login funcionam end-to-end.
- [ ] Consigo cadastrar 1 conta, 1 cartão, 10 transações, 1 orçamento em menos de 5 minutos.
- [ ] Dashboard mostra dados corretos, bate conta com calculadora.
- [ ] Fatura de cartão agrupa corretamente por ciclo.
- [ ] Parcelamento: `purchase_date` correto em todas as parcelas.
- [ ] Transferência entre contas não duplica saldo.
- [ ] Três modos de exibição de gastos de cartão funcionam e batem entre si (soma total do ano deve ser igual nos três modos).
- [ ] Dark mode funciona em todas as telas.
- [ ] Responsivo: usável no iPhone SE (375px).
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95.
- [ ] Nenhum erro no Sentry em uso normal por 48h.
- [ ] Export de dados funciona (JSON + CSV).

## 13. Critérios de "Pronto" para a Fase 2.5 (Importador)

- [ ] Consigo importar meu export do Organizze completo (3+ anos) sem perda de dados.
- [ ] Duplicadas são detectadas com acurácia > 95% numa segunda importação do mesmo arquivo.
- [ ] Parcelamentos são reconstruídos corretamente (verificação manual em amostra de 20 parcelamentos).
- [ ] Mapeamentos de categoria são reutilizados automaticamente na segunda importação.
- [ ] Log JSON baixável mostra linha a linha o resultado.
- [ ] Nenhuma transação do Organizze vira órfã (toda transação importada está ligada a uma conta ou cartão existente).

---

**Comece pela Fase 0. Me mostre o plano detalhado antes de executar a primeira migration.**
