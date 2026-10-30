# Fluxo de Caixa ("Caixa") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o menu "Caixa" completo no app Old Brownies para controle de fluxo de caixa financeiro, interligado automaticamente com as vendas para pontos comerciais e parceiros, com lançamentos manuais de entradas e saídas categorizadas, relatórios por período, gráficos visuais e deploy final na Vercel.

**Architecture:**
- **Modelo de Dados e Sincronização:** Nova entidade `MovimentacaoCaixa` registrada em Dexie IndexedDB (versão 3 de banco local) e espelhada no Supabase (`movimentacoes_caixa`), com suporte offline e sync por outbox.
- **Interligação Automática:** Operação `registrarVenda` gera automaticamente a entrada correspondente com resumo detalhado dos produtos e quantidades vendidas para pontos comerciais/parceiros; `desfazerVenda` cancela o lançamento respectivo.
- **Camada Visual:** Módulo `/caixa` com design premium Art Deco (paleta carvao/ouro/osso/verde/vermelho), componentes de cards de métricas (Entradas, Saídas, Saldo), gráficos SVG interativos sem dependências pesadas externas (Entradas vs Saídas, Distribuição por Categoria, Evolução do Saldo), extrato detalhado com filtros por período e formulário de novo lançamento com categorias obrigatórias (com campo descritivo exigido caso selecionado "Outro").

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), Supabase JS, Tailwind CSS v4, Lucide React, Vite, Vercel CLI.

**Spec:** Baseado na solicitação do usuário e no padrão arquitetural do projeto Old Brownies (B3 data model, sync outbox, Tailwind Deco, UX mobile-first).

## Global Constraints
- Preservar integridade de tipos e regras offline-first do Dexie/Supabase.
- Quando categoria for "Outro", o campo descritivo especificando o motivo é estritamente obrigatório.
- Estética Art Deco alinhada com as cores e tokens do projeto (`ouro`, `carvao`, `osso`, `fio`, `verde`, `vermelho`, `grafite`).
- Testes unitários com Vitest passando e `tsc --noEmit` sem erros.

## Review Focus
1. Venda a ponto comercial com múltiplos sabores e tamanhos deve calcular o valor total exato e listar todos os itens no campo `detalhes`.
2. Cancelamento/estorno de venda (`desfazerVenda`) deve marcar a movimentação de caixa correspondente como `deletedAt`.
3. Validação do formulário de lançamento manual: impedir envio se categoria for "Outro" e a descrição estiver vazia.
4. Filtro por período deve abranger corretamente os limites de data (início 00:00:00 até fim 23:59:59) e computar saldo e totais sem erros de arredondamento.
5. Gráficos SVG devem se comportar de forma responsiva sem quebrar layout em telas pequenas de smartphone.

---

### Task 1: Modelo de Dados e Banco Local (Dexie + Supabase Schema)

**Files:**
- Modify: `src/lib/db/tipos.ts`
- Modify: `src/lib/db/banco.ts`
- Modify: `supabase/schema.sql`
- Test: `tests/caixa.test.ts`

**Interfaces:**
- Produces: `MovimentacaoCaixa`, `TipoMovimentacaoCaixa`, `OrigemCaixa`, `db.movimentacoesCaixa`

- [ ] **Step 1: Write the failing test for Caixa tipos and Dexie store**
Create `tests/caixa.test.ts` verifying `db.movimentacoesCaixa` exists and can store and query records by date and category.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/caixa.test.ts`
Expected: FAIL (store not defined or type missing).

- [ ] **Step 3: Define `MovimentacaoCaixa` in `src/lib/db/tipos.ts` and add table to `src/lib/db/banco.ts`**
Add types:
```ts
export type TipoMovimentacaoCaixa = 'entrada' | 'saida'
export type OrigemCaixa = 'manual' | 'venda' | 'compra'

export interface MovimentacaoCaixa extends Base {
  data: string // YYYY-MM-DD ou ISO
  tipo: TipoMovimentacaoCaixa
  categoria: string
  descricao: string
  valor: number
  formaPagamento?: string
  origem: OrigemCaixa
  referenciaId?: string
  detalhes?: string
  registradoPor: string
}
```
Update `src/lib/db/banco.ts` to include `movimentacoesCaixa` in `Registros`, `INDICES`, and version 3 stores.
Update `supabase/schema.sql` with table `public.movimentacoes_caixa` and RLS policies.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/caixa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/db/tipos.ts src/lib/db/banco.ts supabase/schema.sql tests/caixa.test.ts
git commit -m "feat(caixa): definir entidade MovimentacaoCaixa e indices no Dexie e Supabase"
```

---

### Task 2: Operações de Caixa e Interligação Automática com Vendas

**Files:**
- Create: `src/lib/operacoes/caixa.ts`
- Modify: `src/lib/operacoes/vendas.ts`
- Test: `tests/caixa-operacoes.test.ts`

**Interfaces:**
- Produces: `lancarMovimentacao`, `atualizarMovimentacao`, `excluirMovimentacao`, `formatarItensVendaCaixa`
- Consumes: `registrarVenda`, `desfazerVenda`

- [ ] **Step 1: Write the failing test for automatic cash flow entry upon point sales**
Test in `tests/caixa-operacoes.test.ts`:
- Selling to partner/commercial point creates an automatic `entrada` in `movimentacoesCaixa` with correct total, category "Venda Pontos Comerciais", and formatted item details.
- `desfazerVenda` marks the cash flow entry as deleted (`deletedAt !== null`).
- Manual entry validation (e.g. category "Outro" requires description).

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test tests/caixa-operacoes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/operacoes/caixa.ts` and hook into `src/lib/operacoes/vendas.ts`**
In `src/lib/operacoes/caixa.ts`:
- Functions for manual entry, update, and soft delete.
- Helper to format brownie details (e.g., `"24x Tradicional (Grande), 12x Nutella (Grande) · Ponto Central"`).
In `src/lib/operacoes/vendas.ts`:
- In `montarVenda`: when venda is recorded, automatically add an `op('movimentacoesCaixa', ...)` with `tipo: 'entrada'`, appropriate category, and details.
- In `desfazerVenda`: also find any `movimentacoesCaixa` with `referenciaId === vendaId` and apply `deletedAt`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test tests/caixa-operacoes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/lib/operacoes/caixa.ts src/lib/operacoes/vendas.ts tests/caixa-operacoes.test.ts
git commit -m "feat(caixa): integrar entradas automaticas no fluxo de caixa ao registrar vendas"
```

---

### Task 3: Componentes de Visualização, Gráficos e Filtros do Caixa

**Files:**
- Create: `src/features/caixa/GraficosCaixa.tsx`
- Create: `src/features/caixa/ModalLancamento.tsx`
- Create: `src/features/caixa/RelatorioImprimir.tsx`
- Create: `src/features/caixa/Caixa.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Casca.tsx`
- Modify: `src/features/mais/Mais.tsx`

**Interfaces:**
- Produces: `<Caixa />`, route `/caixa`, bottom nav item `Caixa` for `dono`, link in `Mais.tsx`.

- [ ] **Step 1: Implement `GraficosCaixa.tsx`**
Create clean, accessible SVG charts:
1. Comparativo Entradas vs Saídas por dia/semana (barras duplas verde e vermelho com valores e tooltips).
2. Distribuição por Categoria (barras horizontais proporcionais com porcentagens, valores e badges coloridos).
3. Evolução do Saldo no Período (trajetória do saldo acumulado dia a dia).

- [ ] **Step 2: Implement `ModalLancamento.tsx`**
Create the modal/drawer for manual entry:
- Toggle: Entrada ou Saída.
- Valor (R$) com formatação monetária.
- Seleção de Categoria:
  - Saídas: "Matéria Prima", "Pessoal", "Fornecedor", "Aluguel Empresarial", "Máquinas", "Marketing", "Logística", "Outro"
  - Entradas: "Venda Pontos Comerciais", "Venda Balcão", "Aporte", "Outro"
- Campo "O que foi?" obrigatório quando "Outro" for selecionado.
- Descrição / Observações.
- Forma de pagamento (Pix, Dinheiro, Cartão, Boleto).
- Data da movimentação (padrão: hoje).
- Validação com mensagens de erro claras antes de salvar.

- [ ] **Step 3: Implement `Caixa.tsx` and `RelatorioImprimir.tsx`**
- Period filters: "Hoje", "7 dias", "Este Mês", "Últimos 30 dias", "Personalizado" (com date picker `de` / `até`).
- Summary cards: Total Entradas (verde), Total Saídas (vermelho), Saldo Líquido do Período (com cor dinâmica), Quantidade de Movimentações.
- Extrato com lista de transações, filtros rápidos (Todas, Entradas, Saídas), busca por texto, e botão para excluir lançamentos manuais.
- Ação para gerar relatório limpo para impressão ou download CSV.

- [ ] **Step 4: Connect Routes and Navigation**
- Add route `/caixa` in `src/App.tsx` (papéis: `['dono', 'mentor']`).
- Add item `Caixa` in `src/components/Casca.tsx` (para papel `dono`).
- Add item `Caixa` in `src/features/mais/Mais.tsx` no grupo `Números`.

- [ ] **Step 5: Verify build and types**
Run: `npm run typecheck && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**
```bash
git add src/features/caixa/ src/App.tsx src/components/Casca.tsx src/features/mais/Mais.tsx
git commit -m "feat(caixa): tela de fluxo de caixa com graficos, relatorios, filtros e navegacao"
```

---

### Task 4: Testes de Regressão e Verificação End-to-End

**Files:**
- Test: `tests/caixa-fluxo.test.ts`

- [ ] **Step 1: Write integration tests covering all user requirements**
Test:
- Venda direta e venda a parceiro geram entrada no caixa.
- Lançamento manual de saída com categoria "Pessoal" e "Matéria Prima".
- Lançamento manual com categoria "Outro" falha se descrição vazia e passa se preenchida.
- Cálculo de saldo por período (filtrando por intervalo de datas).
- Relatório e agrupamento por categoria.

- [ ] **Step 2: Run all test suites**
Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**
```bash
git add tests/caixa-fluxo.test.ts
git commit -m "test(caixa): cobrir fluxo completo de caixa com testes integrados"
```

---

### Task 5: Deploy na Vercel e Validação em Produção

**Files:**
- Environment & Build validation

- [ ] **Step 1: Run production build locally**
Run: `npm run build`
Expected: Build passes with dist generated.

- [ ] **Step 2: Push commit to GitHub repository**
Run: `git push origin main`
Expected: Remote updated successfully.

- [ ] **Step 3: Deploy to Vercel and verify URL**
Run: `vercel --prod`
Expected: Production deployment URL returned and active.

- [ ] **Step 4: Verify production health**
Verify that the app loads properly and the new menu Caixa is live.
