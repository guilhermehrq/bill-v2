# FinPessoal — Wireframes e Especificação de Telas

**Versão:** 2.0 · **Atualizado:** 2026-04-20

Documento de referência para o Claude Code Max. Cada tela inclui: propósito, layout ASCII, componentes, interações, estados e observações de UX. Use em conjunto com o `prompt-claude-code-max-finanpessoal.md` e `adr-finpessoal.md`.

---

## Índice

1. Design System (tokens globais)
2. Layout Base (shell autenticado)
3. Autenticação (login, signup, reset)
4. Onboarding (wizard 3 passos)
5. Dashboard (home)
6. Extrato / Lista de Transações
7. Formulário de Transação (drawer)
8. Contas Bancárias (lista + detalhe)
9. Cartões de Crédito (lista + fatura)
10. Categorias
11. Orçamentos
12. Recorrências
13. Metas
14. Relatórios (inclui seletor de modo de cartão)
15. Investimentos
16. Configurações (inclui preferência de modo de cartão)
17. Navegação Mobile
18. **Importador de Transações (wizard 7 passos)** — Fase 2.5

---

## 1. Design System — Tokens

```
CORES
  Surface:
    bg-primary    #0B0D10 (dark) / #FFFFFF (light)
    bg-secondary  #141820 (dark) / #F7F8FA (light)
    bg-elevated   #1B2028 (dark) / #FFFFFF (light, com shadow)
    border        #262D37 (dark) / #E5E7EB (light)

  Text:
    text-primary   #F3F4F6 (dark) / #0F172A (light)
    text-muted     #94A3B8 (dark) / #64748B (light)
    text-subtle    #64748B (dark) / #94A3B8 (light)

  Semantic:
    income   #10B981  (verde esmeralda)
    expense  #EF4444  (vermelho coral)
    pending  #F59E0B  (âmbar)
    info     #3B82F6  (azul)
    brand    #6366F1  (índigo — ações primárias)

TIPOGRAFIA
  Font: Inter (system fallback: -apple-system, sans-serif)
  Display:  32/40  700
  H1:       24/32  700
  H2:       20/28  600
  H3:       16/24  600
  Body:     14/20  400
  Small:    12/16  400
  Money:    tabular-nums, variant-numeric: tabular

ESPAÇAMENTO (base 4)
  xs=4  sm=8  md=12  lg=16  xl=24  2xl=32  3xl=48

RADIUS
  sm=4  md=8  lg=12  xl=16  full=9999

BREAKPOINTS
  sm  640   (mobile large)
  md  768   (tablet)
  lg  1024  (desktop)
  xl  1280  (wide)

SHADOWS (dark desligadas; usar bordas)
  card:    0 1px 2px rgba(0,0,0,0.05) + border 1px
  popover: 0 10px 25px rgba(0,0,0,0.1)
```

---

## 2. Layout Base — Shell Autenticado

### Desktop (≥ lg)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [≡] FinPessoal                    🔍 Buscar (⌘K)     🔔  ▼ Guilherme   │  <- Topbar (56px)
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│  DASHBOARD   │                                                          │
│ ▣ Visão Geral│                                                          │
│                                                                         │
│  FINANÇAS    │                                                          │
│ ≡ Extrato    │                                                          │
│ ⛃ Contas     │              [ CONTEÚDO DA PÁGINA ]                      │
│ ▦ Cartões    │                                                          │
│ ⇆ Invest.    │                                                          │
│                                                                         │
│  PLANEJAMENTO│                                                          │
│ ◉ Orçamentos │                                                          │
│ ↻ Recorrência│                                                          │
│ ★ Metas      │                                                          │
│                                                                         │
│  INSIGHTS    │                                                          │
│ ⎍ Relatórios │                                                          │
│ ↓ Importar   │  <- entra na Fase 2.5                                    │
│                                                                         │
│ ─────────    │                                                          │
│ ⚙ Config.    │                                                          │
│ ↗ Sair       │                                                          │
│              │                                                          │
│ [240px fixa] │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

**Componentes:**
- `Topbar`: logo/toggle, SearchCommand (⌘K), NotificationBell, UserMenu
- `Sidebar`: grupos colapsáveis, item ativo com fundo `bg-secondary` + borda lateral esquerda `brand`
- `PageContainer`: max-w-1280, px-24, py-24

**Interações:**
- Sidebar colapsável (apenas ícones) via toggle ou atalho `[`
- ⌘K abre paleta de comandos (buscar transações, pular pra rota, criar nova transação)
- Avatar menu: Perfil, Tema, Sair

### Mobile (< md)

```
┌─────────────────────────┐
│ ≡ FinPessoal     🔍 🔔  │  <- Header (48px, sticky)
├─────────────────────────┤
│                         │
│     [ CONTEÚDO ]        │
│                         │
│         ...             │
│                         │
│                    ⊕    │  <- FAB (nova transação)
├─────────────────────────┤
│  ⌂    ≡   ⛃   ◉   ☰    │  <- Bottom nav (56px)
│ Home Extr Cont Orç Mais │
└─────────────────────────┘
```

---

## 3. Autenticação

### Tela de Login

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              [ LOGO ]                   │
│          Bem-vindo de volta             │
│       Entre para acessar sua conta      │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Email                           │   │
│   │ [_____________________________] │   │
│   │                                 │   │
│   │ Senha                  Esqueci? │   │
│   │ [_____________________________] │   │
│   │                                 │   │
│   │ [       Entrar           ]      │   │
│   │                                 │   │
│   │ ── ou continue com ──           │   │
│   │                                 │   │
│   │ [🅖 Google]                     │   │
│   │                                 │   │
│   │ Novo aqui? Criar conta          │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes:**
- Card centralizado (max-w-400, px-32, py-40)
- Form com validação em tempo real (zod + react-hook-form)
- Botão submit com loading state (disabled + spinner inline)
- OAuth Google usa Supabase Auth

**Estados:**
- Loading (submit): botão "Entrando..." + disabled
- Erro: alert vermelho acima do form com mensagem traduzida do Supabase
- Email não confirmado: alert âmbar "Confirme seu email. [Reenviar]"

**Signup** tem o mesmo layout + campo Nome + checkbox "Aceito os Termos" + Captcha (hCaptcha, free).

**Reset de senha** (2 telas):
1. Pede email → envia link
2. Abre com token na URL → define nova senha

---

## 4. Onboarding — Wizard 3 Passos

Primeira entrada após signup. Stepper no topo, botões "Voltar" / "Próximo" no rodapé. Só libera o app após concluir (pode pular passos 2 e 3, mas passo 1 é obrigatório).

### Passo 1 — Primeira Conta

```
┌─────────────────────────────────────────────────────────┐
│  ●━━━━━━━━○━━━━━━━━○    Passo 1 de 3                   │
│  Conta    Perfil   Pronto                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Vamos começar pela sua primeira conta                  │
│  Você pode adicionar mais depois.                       │
│                                                         │
│  Nome da conta                                          │
│  [ Ex: Conta Corrente Itaú            ]                 │
│                                                         │
│  Tipo                                                   │
│  ( ) Corrente  ( ) Poupança  ( ) Carteira  ( ) Outra   │
│                                                         │
│  Instituição (opcional)                                 │
│  [ ▼ Selecione o banco                ]                 │
│                                                         │
│  Saldo atual                                            │
│  [ R$ 0,00                            ]                 │
│                                                         │
│  Ícone e cor                                            │
│  [🏦] [💰] [🏧] [💳]    ● ● ● ● ● ● ●                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                           [ Pular ]   [ Próximo →  ]   │
└─────────────────────────────────────────────────────────┘
```

### Passo 2 — Perfil

Nome, avatar (upload opcional), timezone (auto-detect), moeda padrão (BRL pré-selecionado).

### Passo 3 — Pronto

Mensagem de boas-vindas + 3 CTAs:
- "Adicionar primeira transação"
- "Configurar um cartão de crédito"
- "Importar dados do Organizze/Mobills" *(quando Fase 2.5 estiver ativa)*
- "Ir pra dashboard"

---

## 5. Dashboard (Home)

Primeira tela pós-login. Densidade média — mostra o essencial sem overflow.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Olá, Guilherme 👋                       Período: [ Abril 2026 ▼ ]       │
│                                         Cartão: por data da compra  ⓘ  │  <- badge sutil, link pra Config
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ SALDO TOTAL  │ │ RECEITAS     │ │ DESPESAS     │ │ SALDO DO MÊS │    │
│ │              │ │ do mês       │ │ do mês       │ │              │    │
│ │ R$ 24.583,40 │ │ R$ 12.800,00 │ │ R$  8.120,30 │ │ R$ 4.679,70  │    │
│ │ ↑ 3,2% vs   │ │ ↑ 5,1%       │ │ ↓ 2,3%       │ │   verde      │    │
│ │ mês ant.    │ │              │ │              │ │              │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                         │
│ ┌────────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ FLUXO DE CAIXA — últimos 6 meses   │ │ DESPESAS POR CATEGORIA       │ │
│ │                                    │ │                              │ │
│ │   ▆▇  ▆▇  ▅▆  ▇▇  ▆▇  ▇▇          │ │         ╭──────╮             │ │
│ │   ██  ██  ██  ██  ██  ██          │ │       ╱        ╲             │ │
│ │   NOV DEZ JAN FEV MAR ABR          │ │      │  Pizza  │  • Moradia │ │
│ │                                    │ │      │  donut  │  • Alim.   │ │
│ │   ▇ Receita   ▆ Despesa            │ │       ╲        ╱  • Transp. │ │
│ │                                    │ │         ╰──────╯  • Lazer   │ │
│ │                                    │ │                   • Outros  │ │
│ └────────────────────────────────────┘ └──────────────────────────────┘ │
│                                                                         │
│ ┌────────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ PRÓXIMAS CONTAS (7 dias)           │ │ FATURAS EM ABERTO            │ │
│ │                                    │ │                              │ │
│ │ • 22/04 Aluguel        R$ 2.400,00 │ │ Nubank        R$  1.832,40   │ │
│ │ • 24/04 Internet       R$   129,90 │ │ vence em 5 dias    ▓▓▓░░ 62% │ │
│ │ • 25/04 Fatura Nubank  R$ 1.832,40 │ │                              │ │
│ │ • 28/04 Netflix        R$    55,90 │ │ Itaú          R$  3.117,50   │ │
│ │                                    │ │ fecha em 3 dias   ▓▓▓▓░ 78%  │ │
│ │ Ver todas →                        │ │                              │ │
│ └────────────────────────────────────┘ └──────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ORÇAMENTOS — TOP 5 em uso                                           │ │
│ │                                                                     │ │
│ │ Alimentação     ▓▓▓▓▓▓▓▓░░  82%    R$ 820 / R$ 1.000                │ │
│ │ Transporte      ▓▓▓▓▓▓░░░░  64%    R$ 384 / R$   600                │ │
│ │ Lazer           ▓▓▓▓▓▓▓▓▓▓ 104% !  R$ 520 / R$   500                │ │
│ │ Compras         ▓▓▓░░░░░░░  31%    R$ 155 / R$   500                │ │
│ │ Saúde           ▓▓░░░░░░░░  18%    R$  90 / R$   500                │ │
│ │                                                                     │ │
│ │ Ver todos →                                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes-chave:**
- `KPICard` (4x): label + valor grande (tabular-nums) + delta vs. período anterior (verde/vermelho + ↑/↓)
- `CashflowChart`: barras agrupadas Recharts, 6 meses
- `CategoryDonut`: donut com legenda clicável (drill-down)
- `UpcomingList`: até 5 itens, clica vai pra transação
- `InvoiceMini`: progresso do ciclo de fatura
- `BudgetProgressBar`: ordenado por % (desc), cor varia
- `CreditCardModeBadge`: badge sutil indicando o `credit_card_report_mode` ativo (click → Config → Perfil)

**Interações:**
- Seletor de período no topo afeta tudo exceto os cards de saldo total e próximas contas
- Click em categoria do donut → filtra extrato pela categoria
- Drag das próximas contas pra marcar como paga (mobile)

**Estados vazios:**
- Sem transações: ilustração + "Adicione sua primeira transação" → abre drawer. Em Fase 2.5+, adicionar CTA secundário "Ou importar do Organizze/Mobills".
- Sem orçamentos: card enxuto com CTA "Criar orçamento"

---

## 6. Extrato / Lista de Transações

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Extrato                                          [ ↓ Exportar ] [+ Nova]│
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Buscar...        [▼ Mês atual] [▼ Todas contas] [▼ Categorias] [× ]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   18 ABRIL 2026 · sexta                             R$ -345,20 do dia   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🛒 Mercado Extra          Alimentação    Cartão Nubank            │  │
│  │    Compras do mês                                    R$ -245,80   │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ⛽ Posto Shell            Transporte     Cartão Itaú              │  │
│  │                                                      R$  -99,40   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   17 ABRIL 2026 · quinta                            R$ 8.454,10 do dia  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 💰 Salário Turn2C          Salário       Conta Itaú               │  │
│  │                                                      R$ 8.500,00  │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ 🍔 iFood Almoço           Alimentação    Cartão Nubank            │  │
│  │                                                      R$  -45,90   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   15 ABRIL 2026 · terça                             R$ -2.400,00 do dia │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🏠 Aluguel                Moradia        Conta Itaú  [ recorrente]│  │
│  │                                                      R$ -2.400,00 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                     [  Carregar mais  (50/247)  ]                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes:**
- `TransactionFilters`: chips removíveis, filtros combinam (AND)
- `TransactionDayGroup`: cabeçalho com data + saldo do dia
- `TransactionRow`: ícone da categoria, descrição, categoria, conta/cartão, valor alinhado à direita

**Cores de valor:**
- Receita: verde (text-income)
- Despesa: vermelho (text-expense) — com sinal `-` implícito no contexto
- Transferência: neutro + ícone `⇆`
- Previsto (is_paid=false): opacidade 60% + badge "Previsto"

**Interações:**
- Click numa linha → abre drawer de edição
- Shift+click → seleção múltipla (ações em lote: mudar categoria, deletar, marcar como pago)
- Checkbox aparece ao hover (desktop) / long-press (mobile)
- Swipe right no mobile → marcar como pago; swipe left → deletar (com undo toast)

**Paginação:** cursor-based, 50 por vez. Virtualização (react-virtual) se > 200 itens visíveis.

**Empty state:** "Nenhuma transação neste período" + CTA

**Observação:** extrato NÃO aplica modo de exibição de cartão — sempre lista transações tal como são no banco. Quem filtra por período usa `date` (data no fluxo de caixa).

---

## 7. Formulário de Transação (Drawer)

Abre em drawer lateral (direita, 480px) no desktop, bottom sheet no mobile. Fecha em ESC ou clique fora (com confirmação se houver mudança).

```
┌──────────────────────────────────────────────┐
│ Nova transação                           [×] │
├──────────────────────────────────────────────┤
│                                              │
│   ( Despesa )  ( Receita )  ( Transferência )│  <- segmented control
│                                              │
│   Valor *                                    │
│   ┌──────────────────────────────────────┐   │
│   │           R$ 0,00                    │   │  <- foco automático, fonte 32px
│   └──────────────────────────────────────┘   │
│                                              │
│   Descrição *                                │
│   [ Ex: Mercado Extra                    ]   │
│                                              │
│   Categoria *              [+ Nova]          │
│   [ ▼ Selecione                          ]   │
│                                              │
│   Pagar com *                                │
│   [ ▼ Cartão Nubank                      ]   │
│                                              │
│   Data *                                     │
│   [ 18/04/2026                  📅 ]         │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │ ▸ Opções avançadas                   │   │  <- accordion
│   │                                      │   │
│   │   ☐ Parcelar em [ 1 ▼ ] vezes        │   │
│   │   ☐ Recorrente                       │   │
│   │   ☐ Já foi paga                      │   │
│   │   Tags: [chip] [chip] [+]            │   │
│   │   Observação: [textarea]             │   │
│   │   Anexo: [📎 Upload]                 │   │
│   └──────────────────────────────────────┘   │
│                                              │
├──────────────────────────────────────────────┤
│   [ Cancelar ]    [ Salvar e criar outra ]   │
│                             [  Salvar  ]     │
└──────────────────────────────────────────────┘
```

**Lógica condicional:**
- `Transferência` → esconde "Categoria", mostra "De → Para" (duas contas)
- `Parcelar X vezes` → mostra preview das parcelas futuras
- `Recorrente` → mostra sub-form (frequência, fim)
- `Já foi paga` = true por default. Desmarca pra criar como previsto
- Cartão selecionado → mostra em qual fatura cairá ("Cairá na fatura de MAI/2026")

**Atalhos:** `Cmd+Enter` salva; `Cmd+Shift+Enter` salva e cria outra (mantém categoria, conta e data).

**Validação:**
- Valor > 0 (exceto R$ 0 proibido)
- Data não pode ser > hoje + 5 anos
- Transferência: origem ≠ destino

**Comportamento de `purchase_date`:** preenchido automaticamente pela trigger no DB. Na criação de parcelamento, todas as parcelas herdam `purchase_date` da primeira. Usuário não vê/edita esse campo.

---

## 8. Contas Bancárias

### Lista

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Contas                                                    [+ Nova conta]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ SALDO TOTAL                                          R$ 24.583,40 │   │
│ │ em 3 contas ativas                                                │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│ │ 🏦 Conta Itaú       │ │ 🏦 Nubank           │ │ 💰 Carteira         │ │
│ │ Corrente            │ │ Corrente            │ │ Dinheiro            │ │
│ │                     │ │                     │ │                     │ │
│ │ R$ 18.234,50        │ │ R$  6.112,90        │ │ R$    236,00        │ │
│ │                     │ │                     │ │                     │ │
│ │ 23 transações       │ │ 17 transações       │ │ 4 transações        │ │
│ │ este mês            │ │ este mês            │ │ este mês            │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
│                                                                         │
│ ──── ARQUIVADAS (1) ────                                                │
│                                                                         │
│ ┌─────────────────────┐                                                 │
│ │ 🏦 Santander (antiga)│                                                │
│ │ R$ 0,00             │                                                 │
│ └─────────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detalhe (extrato da conta)

Essencialmente a tela de Extrato, mas com filtro de conta aplicado + header destacado com nome, saldo atual e mini-gráfico de evolução.

---

## 9. Cartões de Crédito

### Lista

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Cartões                                                [+ Novo cartão]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ ╭──────────────────────╮                                          │   │
│ │ │  NUBANK       🟣     │  Fatura atual:     R$ 1.832,40           │   │
│ │ │                      │  fecha dia 25 · vence dia 05             │   │
│ │ │  •••• 1234           │  Limite:  ▓▓▓░░░░░░  18% (R$ 10.000)     │   │
│ │ ╰──────────────────────╯                                          │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ ╭──────────────────────╮                                          │   │
│ │ │  ITAÚ         🟠     │  Fatura atual:     R$ 3.117,50           │   │
│ │ │                      │  fecha dia 28 · vence dia 08             │   │
│ │ │  •••• 9876           │  Limite:  ▓▓▓▓▓▓░░░░  52% (R$ 6.000)     │   │
│ │ ╰──────────────────────╯                                          │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detalhe da Fatura

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Nubank — Fatura Abril/2026                      [Pagar fatura] [⋯]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                │
│ │ TOTAL          │ │ FECHAMENTO     │ │ STATUS         │                │
│ │ R$ 1.832,40    │ │ 25/04/2026     │ │ Aberta         │                │
│ │ 17 transações  │ │ vence 05/05    │ │ parcial paga   │                │
│ └────────────────┘ └────────────────┘ └────────────────┘                │
│                                                                         │
│ [◀ FEV/2026 ] [ MAR/2026 ] [ ABR/2026 atual] [ MAI/2026 ▶ ]             │
│                                                                         │
│ POR CATEGORIA                                                           │
│ Alimentação       ▓▓▓▓▓▓▓░░░  R$   612,30  (33%)                        │
│ Transporte        ▓▓▓▓░░░░░░  R$   389,20  (21%)                        │
│ Compras           ▓▓▓░░░░░░░  R$   320,00  (17%)                        │
│ Outros                        R$   510,90  (29%)                        │
│                                                                         │
│ TRANSAÇÕES DA FATURA                                                    │
│   [... mesma estrutura do extrato, filtrada por esta fatura ...]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Navegação entre faturas:** ◀ ▶ nas setas ou atalho `J`/`K`. Vai até 12 meses atrás e até a fatura "futura" (próximo ciclo já iniciado).

**Ação "Pagar fatura":** abre modal
- Mostra valor total, permite pagamento parcial
- Seleciona conta de origem (default: `default_account_id`)
- Cria transação de despesa na conta + marca fatura como `paid` (ou `partial` se parcial)

**Observação:** tela de fatura **sempre agrupa pela fatura** (não aplica modo de exibição global). É a visão bancária.

---

## 10. Categorias

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Categorias                                          [+ Nova categoria]  │
├─────────────────────────────────────────────────────────────────────────┤
│  [ Despesas (28) ]    [ Receitas (6) ]                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🏠 Moradia                                                             │
│     └─ Aluguel                                    R$ 2.400,00    (38%)  │
│     └─ Condomínio                                 R$   450,00    ( 7%)  │
│     └─ Energia                                    R$   180,00    ( 3%)  │
│     └─ Internet                                   R$   129,90    ( 2%)  │
│                                              Total R$ 3.159,90   (50%)  │
│                                                                         │
│  🛒 Alimentação                                                         │
│     └─ Mercado                                    R$   820,00    (13%)  │
│     └─ Restaurantes                               R$   434,50    ( 7%)  │
│                                              Total R$ 1.254,50   (20%)  │
│                                                                         │
│  ⛽ Transporte                                                          │
│     └─ Combustível                                R$   380,00    ( 6%)  │
│     └─ Uber/99                                    R$   120,00    ( 2%)  │
│                                              Total R$   500,00   ( 8%)  │
│                                                                         │
│  [... outras ...]                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Ações na categoria:**
- Click → filtra extrato pela categoria
- Menu `⋯`: Editar, Adicionar subcategoria, Mesclar em..., Arquivar
- Drag-and-drop pra reorganizar hierarquia
- "Mesclar em" abre dialog: categoria destino → move todas as transações + deleta origem

---

## 11. Orçamentos

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Orçamentos — Abril 2026   [◀ MAR] [ABR] [MAI ▶]        [+ Novo] [Copiar]│
│ Cartão: por data da compra  ⓘ                                          │  <- badge mostrando modo aplicado
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ RESUMO DO MÊS                                                     │   │
│ │ Orçado: R$ 6.500,00    Gasto: R$ 4.238,70    Disponível: R$ 2.261 │   │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  65%    faltam 12 dias              │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ POR CATEGORIA                                                           │
│                                                                         │
│ 🏠 Moradia                                                              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  90%                                            │
│ R$ 2.850 de R$ 3.200 · R$ 350 disponível · no ritmo ok                  │
│                                                                         │
│ 🛒 Alimentação                                     ⚠ Atenção            │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  82%                                           │
│ R$ 820 de R$ 1.000 · R$ 180 disponível · 18d p/ fim do mês              │
│ → Ritmo projetado: R$ 1.190 (estouro de R$ 190)                         │
│                                                                         │
│ 🎬 Lazer                                           ⛔ Estourado          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 104%                                           │
│ R$ 520 de R$ 500 · excedeu R$ 20                                        │
│                                                                         │
│ 🚗 Transporte                                                           │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░  44%                                            │
│ R$ 264 de R$ 600 · R$ 336 disponível                                    │
│                                                                         │
│ SEM ORÇAMENTO este mês: Saúde, Compras, Educação. [Criar todos]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Cores da barra:**
- 0-70%: verde
- 70-90%: amarelo
- 90-100%: âmbar
- > 100%: vermelho

**Projeção de ritmo:** calcula `(gasto_atual / dias_decorridos) * dias_totais_do_mês`. Se > orçado, mostra alerta.

**Cálculo do "gasto":** respeita `credit_card_report_mode` global. Em `purchase_date`, uma compra parcelada de R$ 5.000 conta integralmente no mês da compra (pode estourar orçamento de golpe). Em `installment_date`, cada parcela conta no seu mês. O badge indica qual modo está ativo.

**"Copiar" botão:** dialog → selecionar mês origem → copia todos os orçamentos ausentes pro mês atual.

---

## 12. Recorrências

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Recorrências                                      [+ Nova recorrência]  │
├─────────────────────────────────────────────────────────────────────────┤
│ [ Ativas (12) ] [ Pausadas (2) ] [ Todas ]                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ RECEITAS                                                                │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ 💰 Salário Turn2C            Mensal · dia 5 · Conta Itaú          │   │
│ │    Categoria: Salário        Próximo: 05/05/2026                  │   │
│ │                                                     R$ 8.500,00   │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ DESPESAS                                                                │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ 🏠 Aluguel                   Mensal · dia 10 · Conta Itaú         │   │
│ │    Categoria: Moradia        Próximo: 10/05/2026                  │   │
│ │                                                     R$ 2.400,00   │   │
│ ├───────────────────────────────────────────────────────────────────┤   │
│ │ 📺 Netflix                   Mensal · dia 28 · Cartão Nubank      │   │
│ │    Categoria: Assinaturas    Próximo: 28/04/2026                  │   │
│ │                                                     R$    55,90   │   │
│ ├───────────────────────────────────────────────────────────────────┤   │
│ │ 🎵 Spotify Family            Mensal · dia 15 · Cartão Nubank      │   │
│ │    Categoria: Assinaturas    Próximo: 15/05/2026                  │   │
│ │                                                     R$    34,90   │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Linha da recorrência:**
- Click → edit drawer (mesmo form da transação + frequência)
- Menu `⋯`: Pausar, Duplicar, Deletar, Ver histórico de gerações

**Form de criação:** é o Transaction Drawer com checkbox "Recorrente" expandido, mostrando:
- Frequência: [Diária | Semanal | Mensal | Anual]
- A cada: [1] [unidade]
- Dia: [▼ 5] (se mensal) ou [checkboxes] (se semanal)
- Início: [data]
- Fim: [ ] Sem data final  [ ] Até [data]  [ ] Após [N] ocorrências

---

## 13. Metas

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Metas                                                    [+ Nova meta]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │ ✈ Viagem Japão 2027                                             │     │
│ │                                                                 │     │
│ │ R$ 8.450 de R$ 25.000                                  34%      │     │
│ │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░                                       │     │
│ │                                                                 │     │
│ │ Meta: Jan/2027 · No ritmo atual: Mar/2027 (2 meses atraso)      │     │
│ │ Conta: Poupança Viagem                                          │     │
│ │                                                                 │     │
│ │ [+ Aporte manual]                           [Editar] [Arquivar] │     │
│ └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │ 💻 MacBook Pro                                         ✓ 100%   │     │
│ │                                                                 │     │
│ │ R$ 18.000 de R$ 18.000                                          │     │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ CONQUISTADA!                          │     │
│ │                                                                 │     │
│ │ Concluída em 12/02/2026 · 3 meses antes do prazo                │     │
│ └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Lógica:**
- Meta vinculada a conta: `current_cents` = saldo da conta. Progresso automático.
- Meta sem conta: `current_cents` atualizado via aportes manuais.
- Projeção: calcula velocidade média dos últimos 90 dias → extrapola.
- Conquistada: confete no dia da conclusão, card muda de cor.

---

## 14. Relatórios

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Relatórios                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ [ Por categoria ] [ Evolução ] [ Comparativo ] [ Tags ]                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PERÍODO [ 01/01/2026 ] até [ 18/04/2026 ]    [ ↓ CSV ] [ 🖨 ]          │
│                                                                         │
│  Gastos de cartão: ( Data da fatura ) ( ● Data da compra ) ( Data parc.)│
│                    ⓘ Padrão da sua preferência global. Ajustar em Config│
│                                                                         │
│  [ Todas contas ▼ ]  [ Despesas ▼ ]                                     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │ TREEMAP                                                         │     │
│ │  ┌───────────────────────────┬───────────────────┐              │     │
│ │  │                           │                   │              │     │
│ │  │                           │   Alimentação     │              │     │
│ │  │         Moradia           │                   │              │     │
│ │  │          50%              ├───────────────────┤              │     │
│ │  │                           │ Transp.  │ Lazer  │              │     │
│ │  │                           │          │        │              │     │
│ │  └───────────────────────────┴──────────┴────────┘              │     │
│ └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │ TABELA DETALHADA                                                │     │
│ │ Categoria         Valor          %      Média/mês   Transações  │     │
│ │ ─────────────────────────────────────────────────────────────── │     │
│ │ Moradia         12.639,60      50%      3.159,90         16     │     │
│ │ Alimentação      5.018,00      20%      1.254,50         52     │     │
│ │ Transporte       2.000,00       8%        500,00         28     │     │
│ │ ...                                                             │     │
│ │                                                    [ver detalhe]│     │
│ └─────────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Aba "Evolução":** gráfico de linha do patrimônio (saldo total) últimos 12 meses, com bandas de receita/despesa empilhadas.

**Aba "Comparativo":** duas colunas — MAR/2026 vs ABR/2026 (ou customizável). Diff em verde/vermelho por categoria.

**Aba "Tags":** agregação por tag.

**`CreditCardReportModeSelector`:** segmented control com 3 opções. Estado inicial = `user_settings.credit_card_report_mode`. Alteração aqui é **override apenas de sessão** (não persiste). Tooltip `ⓘ` explica cada modo:

- **Data da fatura:** "Agrupa compras de cartão pela fatura onde aparecem. Ideal para conferir com seu extrato bancário."
- **Data da compra:** "Todas as compras feitas no período aparecem aqui, mesmo que a fatura caia em outro mês. Em parcelamentos, conta o valor total no mês da compra."
- **Data da parcela:** "Como data da compra, mas parcelamentos contam só a parcela do mês selecionado. Útil pra projetar fluxo de caixa."

---

## 15. Investimentos

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Investimentos                          [+ Novo ativo] [+ Movimentação]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐       │
│ │ PATRIMÔNIO        │ │ INVESTIDO         │ │ RENTABILIDADE     │       │
│ │ R$ 82.543,20      │ │ R$ 75.000,00      │ │ +10,05%  (↑)      │       │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘       │
│                                                                         │
│ ALOCAÇÃO                                                                │
│ Renda fixa   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  60%  R$ 49.526                             │
│ Ações        ▓▓▓▓▓▓▓░░░░░░░  25%  R$ 20.636                             │
│ FIIs         ▓▓▓▓░░░░░░░░░░  12%  R$  9.905                             │
│ Cripto       ▓░░░░░░░░░░░░░   3%  R$  2.476                             │
│                                                                         │
│ ATIVOS                                                                  │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ Ticker  Nome              Qtd     PM      Cotação   Total  Result │   │
│ │ ──────────────────────────────────────────────────────────────── │   │
│ │ MXRF11  Maxi Renda        150     9,80    10,20   1.530  +6,12%  │   │
│ │ ITUB4   Itaú PN            80    28,50   32,10   2.568  +12,6%  │   │
│ │ ...                                                              │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**MVP:** cotação é input manual. Em v2, integrar com Brapi (free, B3) pra auto-update diário.

---

## 16. Configurações

Página com abas laterais:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Configurações                                                           │
├──────────────┬──────────────────────────────────────────────────────────┤
│ ▸ Perfil     │  PERFIL                                                  │
│   Aparência  │                                                          │
│   Segurança  │  [Avatar]  Upload / Remover                              │
│   Notificaç. │                                                          │
│   Dados      │  Nome       [ Guilherme                        ]         │
│   Integraç.  │  Email      [ guilherme@email.com              ] (trocar)│
│   Sobre      │  Timezone   [ ▼ America/Sao_Paulo              ]         │
│              │  Moeda      [ ▼ BRL — Real brasileiro          ]         │
│              │  Idioma     [ ▼ Português (Brasil)             ]         │
│              │                                                          │
│              │  ─── GASTOS DE CARTÃO ───                                │
│              │                                                          │
│              │  Como quer ver gastos feitos no cartão por padrão?       │
│              │                                                          │
│              │   (   ) Data da fatura                                   │
│              │        Apenas compras cuja fatura fecha no período       │
│              │        Útil para conferir com seu extrato bancário.      │
│              │                                                          │
│              │   ( ● ) Data da compra                    Recomendado    │
│              │        Todas as compras feitas no período (independente  │
│              │        da fatura). Em parcelamentos, conta o valor total │
│              │        no mês da compra. Ideal para orçamento e hábitos. │
│              │                                                          │
│              │   (   ) Data da parcela                                  │
│              │        Como data da compra, mas parcelamentos contam só  │
│              │        a parcela do mês selecionado. Útil para projeção  │
│              │        de fluxo de caixa.                                │
│              │                                                          │
│              │  [ Salvar alterações ]                                   │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

**Aparência:** tema (sistema/claro/escuro), densidade (confortável/compacta), moeda com símbolo antes/depois.

**Segurança:** trocar senha, 2FA (futuro), sessões ativas, logout de todas.

**Dados:** exportar tudo (JSON + CSV em zip), importar OFX/Organizze/Mobills (link pra rota `/import` — Fase 2.5), **zona de perigo** — apagar conta (confirmação dupla com digitação do email).

**Integrações (futuro):** conectar email pra receber relatórios, webhook pra Home Assistant etc.

---

## 17. Navegação Mobile

Bottom nav com 5 ícones + FAB central flutuante:

```
┌─────────────────────────┐
│                         │
│     [CONTEÚDO]          │
│                         │
│                         │
│                         │
│               ┌───┐     │
│               │ ⊕ │     │  <- FAB, abre TransactionDrawer
│               └───┘     │
├─────────────────────────┤
│  ⌂    ≡          ◉   ☰ │
│ Home Extr     Orç  Mais │
└─────────────────────────┘
```

O item central do bottom nav é o FAB (não é tab). As 4 abas são: Home, Extrato, Orçamentos, Mais (abre menu overlay com: Contas, Cartões, Metas, Recorrências, Investimentos, Relatórios, Importar, Config).

**Gestos:**
- Swipe horizontal entre abas do extrato (mês anterior/próximo)
- Pull-to-refresh em listas
- Long-press em transação abre ações rápidas (editar/duplicar/deletar)

---

## 18. Importador de Transações (Wizard 7 Passos) — Fase 2.5

Acessível via sidebar "Importar" (desktop) ou "Mais → Importar" (mobile). Wizard linear com stepper no topo; pode voltar mas não pular passos. Dados do wizard ficam em estado local (Zustand store isolada para a rota `/import`). Sai do wizard = perde progresso (com confirmação).

### Passo 1 — Origem

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━○━━━○━━━○━━━○━━━○━━━○    Passo 1 de 7               │
│  Origem                                                   │
├───────────────────────────────────────────────────────────┤
│ Importar transações                                       │
│                                                           │
│ De onde vêm os dados?                                     │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ● Organizze                                         │  │
│  │   Preset otimizado para exports CSV/XLSX            │  │
│  │   Detecta colunas, reconstrói parcelamentos         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ○ Mobills                                           │  │
│  │   Preset otimizado para exports CSV                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ○ OFX                                               │  │
│  │   Extrato bancário universal                        │  │
│  │   Sem categoria (será mapeada manualmente)          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ○ CSV genérico                                      │  │
│  │   Você configura o mapeamento                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│                             [ Cancelar ] [ Próximo →   ]  │
└───────────────────────────────────────────────────────────┘
```

### Passo 2 — Upload

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━●━━━○━━━○━━━○━━━○━━━○    Passo 2 de 7               │
│  Upload                                                   │
├───────────────────────────────────────────────────────────┤
│ Envie seus arquivos                                       │
│                                                           │
│ ┌───────────────────────────────────────────────────────┐ │
│ │                                                       │ │
│ │                                                       │ │
│ │              ↑ Arraste aqui                           │ │
│ │        ou clique para selecionar                      │ │
│ │                                                       │ │
│ │      CSV, XLSX ou OFX · até 10 arquivos · 50MB cada   │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│  Arquivos selecionados (3):                               │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 📄 itau-corrente-2024.csv     342 linhas    [×] │     │
│  │ 📄 itau-corrente-2025.csv     411 linhas    [×] │     │
│  │ 📄 nubank-cartao-2024.csv     287 linhas    [×] │     │
│  └──────────────────────────────────────────────────┘     │
│                                                           │
│  Total detectado: 1.040 linhas                            │
│                                                           │
│                             [ Voltar ] [ Próximo (3/7) ]  │
└───────────────────────────────────────────────────────────┘
```

**Detalhes técnicos:**
- Drop zone usando `react-dropzone`
- Parsing imediato client-side (papaparse/SheetJS) em Web Worker
- Mostrar progresso de parsing por arquivo se > 500ms
- Validação: reject arquivos > 50MB, MIME inesperado

### Passo 3 — Preview e mapeamento de colunas

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━●━━━●━━━○━━━○━━━○━━━○    Passo 3 de 7               │
│  Mapeamento de colunas                                    │
├───────────────────────────────────────────────────────────┤
│ Confira o mapeamento detectado                            │
│ Mostrando: itau-corrente-2024.csv (primeiras 10 linhas)   │
│                                                           │
│  Coluna origem      →  Campo FinPessoal         Status    │
│ ─────────────────────────────────────────────────────     │
│  Data               →  [ Data              ▼ ]    ✓       │
│  Descrição          →  [ Descrição         ▼ ]    ✓       │
│  Valor              →  [ Valor             ▼ ]    ✓       │
│  Categoria          →  [ Categoria         ▼ ]    ✓       │
│  Conta              →  [ Conta             ▼ ]    ✓       │
│  Tags               →  [ Tags              ▼ ]    ✓       │
│  Recorrente         →  [ (ignorar)         ▼ ]    ⚠       │
│  Observações        →  [ Observações       ▼ ]    ✓       │
│  Status             →  [ Pago/Previsto     ▼ ]    ✓       │
│                                                           │
│  Prévia (3 primeiras linhas mapeadas):                    │
│  ┌────────────┬──────────────────┬──────────┬─────────┐   │
│  │ Data       │ Descrição        │ Valor    │ Cat.    │   │
│  ├────────────┼──────────────────┼──────────┼─────────┤   │
│  │ 15/03/2024 │ Supermercado PdA │ -245,80  │ Alim... │   │
│  │ 16/03/2024 │ Salário          │ 8.500,00 │ Salário │   │
│  │ 17/03/2024 │ Uber 99          │ -18,50   │ Transp. │   │
│  └────────────┴──────────────────┴──────────┴─────────┘   │
│                                                           │
│  [ ◀ Arquivo anterior ] [ Próximo arquivo ▶ ]             │
│  1 de 3                                                   │
│                                                           │
│                             [ Voltar ] [ Próximo (4/7) ]  │
└───────────────────────────────────────────────────────────┘
```

**Se arquivos têm estruturas diferentes**, usuário navega por arquivo. Se todos têm mesma estrutura (detectado por hash dos cabeçalhos), mostra um único mapeamento que se aplica a todos.

**Auto-detecção:** o preset Organizze tenta match por nome normalizado ("Descrição" → `description`, "Valor" → `amount`, etc.). Campos não mapeáveis ficam como `(ignorar)` com warning `⚠`.

### Passo 4 — Mapeamento de contas

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━●━━━●━━━●━━━○━━━○━━━○    Passo 4 de 7               │
│  Contas bancárias                                         │
├───────────────────────────────────────────────────────────┤
│ Associe contas da origem às suas contas no FinPessoal     │
│                                                           │
│  Conta no Organizze         →  Destino no FinPessoal      │
│ ─────────────────────────────────────────────────────     │
│  Itaú Corrente              →  [ ● Itaú Corrente ▼      ] │
│                                   💡 sugerido por nome    │
│                                                           │
│  Nubank                     →  [ ● Nubank ▼             ] │
│                                                           │
│  Carteira                   →  [ + Criar "Carteira"     ] │
│                                   nova conta será criada  │
│                                                           │
│  Conta Antiga Santander     →  [ ⊘ Ignorar (0 trans.)   ] │
│                                                           │
│  ☑ Salvar esses mapeamentos para próximas importações     │
│                                                           │
│                             [ Voltar ] [ Próximo (5/7) ]  │
└───────────────────────────────────────────────────────────┘
```

**Regras:**
- Cada conta de origem precisa ter um destino (mapeada, criada, ou ignorada).
- "Criar" usa nome da origem + tipo default (`checking`).
- "Ignorar" descarta transações dessa conta no import.
- Checkbox salva em `import_mappings` para próxima importação da mesma origem.

### Passo 5 — Mapeamento de cartões

Mesma UI do Passo 4, mas listando cartões de crédito. Campos adicionais ao criar:
- Dia de fechamento (pede ao usuário — origem raramente exporta isso)
- Dia de vencimento
- Últimos 4 dígitos (opcional)

### Passo 6 — Mapeamento de categorias

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━●━━━●━━━●━━━●━━━●━━━○    Passo 6 de 7               │
│  Categorias                                               │
├───────────────────────────────────────────────────────────┤
│ 142 categorias encontradas · 128 auto-mapeadas            │
│                                                           │
│ [ Auto-mapear por nome ]  [ Criar todas as faltantes ]    │
│                                                           │
│ 🔍 Filtrar: [________________]   Mostrar: (● Não mapeadas)│
│                                           (○ Todas      ) │
│                                                           │
│  Origem                      →  Destino FinPessoal        │
│ ─────────────────────────────────────────────────────     │
│  Alimentação                 →  [ ● Alimentação ▼ ]   ✓   │
│  Alimentação > Mercado       →  [ ● Mercado ▼     ]   ✓   │
│  Alimentação > Restaurante   →  [ + Criar "Restaurante" ]⚠│
│  Baladas                     →  [ ● Lazer ▼       ]   ↻   │
│                                   aproximação (Levenshtein│
│  Mel da Mamãe                →  [ ⊘ Ignorar        ]      │
│  Moradia                     →  [ ● Moradia ▼     ]   ✓   │
│  Moradia > Aluguel           →  [ ● Aluguel ▼     ]   ✓   │
│  ...                                                      │
│                                                           │
│  Mostrando 10 de 14 não mapeadas  [ Ver todas (142) ]     │
│                                                           │
│ ☑ Salvar esses mapeamentos para próximas importações      │
│                                                           │
│                             [ Voltar ] [ Próximo (7/7) ]  │
└───────────────────────────────────────────────────────────┘
```

**Status icons:**
- ✓ verde: match exato por nome normalizado
- ↻ âmbar: match aproximado (Levenshtein ≤ 2) — sugestão, revisar
- ⚠ laranja: nenhum match, será criada
- ⊘ cinza: ignorada pelo usuário

**Ações em massa:**
- "Auto-mapear por nome": roda o algoritmo de novo após usuário criar categorias manualmente
- "Criar todas as faltantes": aplica ação "criar" em todos os itens com status ⚠

### Passo 7 — Revisão e importação

```
┌───────────────────────────────────────────────────────────┐
│  ●━━━●━━━●━━━●━━━●━━━●━━━●    Passo 7 de 7               │
│  Revisão                                                  │
├───────────────────────────────────────────────────────────┤
│ Pronto para importar                                      │
│                                                           │
│ RESUMO                                                    │
│ ┌───────────────────────────────────────────────────┐     │
│ │ 1.040 transações encontradas                      │     │
│ │   ↳ 612 despesas       R$ 148.230,00              │     │
│ │   ↳ 419 receitas       R$ 182.500,00              │     │
│ │   ↳   9 transferências                            │     │
│ └───────────────────────────────────────────────────┘     │
│                                                           │
│ SERÁ CRIADO                                               │
│   • 1 conta nova (Carteira)                               │
│   • 14 categorias novas                                   │
│   • 14 parcelamentos reconstruídos  [ Ver detalhes ]      │
│                                                           │
│ DUPLICADAS DETECTADAS                                     │
│ ┌───────────────────────────────────────────────────┐     │
│ │ 27 prováveis duplicadas (mesmo valor + data +     │     │
│ │ descrição de transações já existentes).           │     │
│ │                                  [ Ver lista (27)]│     │
│ │                                                   │     │
│ │ ( ● Pular duplicadas (recomendado)              ) │     │
│ │ (   Importar mesmo assim (criará cópias)        ) │     │
│ └───────────────────────────────────────────────────┘     │
│                                                           │
│ ⚠ Esta operação pode levar alguns minutos.                │
│   Não feche esta aba.                                     │
│                                                           │
│                      [ Voltar ] [ Iniciar importação →  ] │
└───────────────────────────────────────────────────────────┘
```

### Progresso de importação

```
┌───────────────────────────────────────────────────────────┐
│ Importando...                                             │
│                                                           │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░   72%              │
│ 729 / 1.013 transações processadas                        │
│                                                           │
│ Etapa atual: importando cartão Nubank                     │
│ Batch 15 de 21 (500 transações por batch)                 │
│                                                           │
│ ⓘ Se fechar esta aba agora, as transações já importadas   │
│    permanecem. Você poderá continuar de onde parou.       │
└───────────────────────────────────────────────────────────┘
```

**Mecânica:**
- Client envia batches de 500 via Server Action `importTransactions(importId, batch)`.
- A cada batch, backend responde `{ inserted, skipped, errors }`.
- Progresso na UI reflete transações enviadas / total.
- Se ocorrer erro de rede, client retenta o batch atual até 3x.

### Resultado final

```
┌───────────────────────────────────────────────────────────┐
│ ✓ Importação concluída                                    │
│                                                           │
│ ┌───────────────────────────────────────────────────┐     │
│ │                                                   │     │
│ │          1.013 transações importadas              │     │
│ │                                                   │     │
│ │   ✓ 1.013 sucesso                                 │     │
│ │   ⏭   27 duplicadas puladas                       │     │
│ │   ✗    0 erros                                    │     │
│ │                                                   │     │
│ └───────────────────────────────────────────────────┘     │
│                                                           │
│ O QUE FOI CRIADO                                          │
│   • 1 conta (Carteira)                                    │
│   • 14 categorias                                         │
│   • 14 parcelamentos reconstruídos                        │
│   • Mapeamentos salvos para próximas importações          │
│                                                           │
│ [ ↓ Baixar log (JSON) ]   [ Ir para o extrato →   ]       │
└───────────────────────────────────────────────────────────┘
```

Em caso de falha parcial (`partial_failure`), mostrar também:
```
⚠ 23 transações com erro
   [ Ver detalhes ]  [ Baixar CSV dos erros ]
```

### Lista de imports anteriores

Tela secundária acessível via `/import` quando não há wizard ativo:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Importações                                            [+ Nova importação]│
├─────────────────────────────────────────────────────────────────────────┤
│  Data           Origem       Arquivos  Total    Status     Ações        │
│ ─────────────────────────────────────────────────────────────────────── │
│  18/04 14:32   Organizze     3         1.013    ✓ Success  [log] [⋯]    │
│  15/04 10:15   Nubank OFX    1           287    ✓ Success  [log] [⋯]    │
│  10/04 09:48   Organizze     2           340    ⚠ Parcial  [log] [⋯]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Ações do menu `⋯`:
- Rever mapeamentos aplicados
- **Desfazer importação** (deleta todas as transações com `import_id = X` — confirmação obrigatória, disponível por até 7 dias após import)
- Reprocessar (repete com mesmos arquivos — útil se mapeamentos mudaram)

---

## Notas transversais

- **Formatação de moeda:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Sempre.
- **Formatação de data:** `dd/MM/yyyy` curta, `EEEE, dd 'de' MMMM` longa. date-fns com locale pt-BR.
- **Zero states:** sempre com CTA + ilustração (lucide icons grandes funcionam bem pra evitar assets).
- **Toasts:** sonner, topo-direito no desktop, topo no mobile. Com undo (8s) em ações destrutivas.
- **Loading:** skeletons da forma final (nunca shimmer genérico). Tempo máximo de skeleton: 400ms, senão algo tá errado.
- **Erros:** inline em forms, toast vermelho em mutations, página completa só em 500 de servidor.
- **Acessibilidade:**
  - Tab order correto em todos os forms
  - `aria-live` em updates dinâmicos (saldo atualiza, progresso do import)
  - Contraste mínimo 4.5:1 em texto
  - Não confiar só em cor pra comunicar (receita/despesa: tem + sinal/ícone)
  - `prefers-reduced-motion` respeitado
- **Wizard do importador:** todos os 7 passos têm estado persistido em sessionStorage. Refresh de página não perde progresso (mas o usuário precisa confirmar continuar).
