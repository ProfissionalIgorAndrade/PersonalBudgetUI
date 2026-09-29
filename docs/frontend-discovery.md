# Frontend Discovery — PersonalBudgetUI

> **Projeto:** PersonalBudgetUI
> **Stack:** React 19 + Vite 8 + JavaScript + Chart.js 4 + Framer Motion
> **Data:** Setembro 2026
> **Relacionado:** [Backend Discovery](../../PersonalBudget/docs/backend-discovery.md) · [Product Vision](../../PersonalBudget/docs/product-vision.md)

---

## Executive Summary

O frontend é uma SPA React madura com arquitetura bem organizada em três camadas (data / application / presentation), design system próprio e 9 telas funcionais. O código demonstra boas práticas como separação de repositórios, normalização de dados e hooks customizados.

Os maiores riscos atuais são **performance em mobile**, **ausência de cache de API** e **o hook `useAppData` monolítico** que dificulta manutenção conforme o app cresce. Não há responsividade mobile implementada.

### Top 3 Prioridades

| # | Prioridade | Impacto |
|---|-----------|---------|
| 1 | 🔴 Responsividade mobile | Usuários em celular têm experiência quebrada |
| 2 | 🔴 Cache de API (React Query / SWR) | Toda navegação re-fetcha tudo; UX lenta |
| 3 | 🟡 Code splitting por rota | Bundle único atrasa o primeiro carregamento |

---

## 1. Performance

### 1.1 Sem Virtualização de Listas 🔴 Alta

**Problema:** Listas de transações carregam todos os itens no DOM de uma vez. Em meses com 100+ transações, o navegador renderiza e mantém centenas de nós DOM simultaneamente.

**Impacto:** Scroll lento, alto uso de memória, travamentos em dispositivos fracos.

**Solução:** Adotar `@tanstack/react-virtual` (ou `react-window`) nas listas de transações e faturas.

```jsx
// Antes
transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)

// Depois
const rowVirtualizer = useVirtualizer({
  count: transactions.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64,
})
rowVirtualizer.getVirtualItems().map(vRow => (
  <TransactionRow key={vRow.key} tx={transactions[vRow.index]} style={{ transform: `translateY(${vRow.start}px)` }} />
))
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Alto | Baixo |

---

### 1.2 Sem Cache de API 🔴 Alta

**Problema:** `useAppData` chama `loadAll()` a cada montagem relevante. Ao navegar entre telas (ex: Dashboard → Transactions → Dashboard), os dados são re-buscados mesmo que não tenham mudado.

**Impacto:** Latência desnecessária, requests excessivos ao backend, UX percebida como lenta.

**Solução:** Substituir fetch manual por **TanStack Query (React Query)**:

```jsx
// Antes (em useAppData.js)
const loadTx = useCallback(async () => {
  const raw = await txRepo.listTransactions();
  setTransactions((raw || []).map(normalizeTransaction));
}, []);

// Depois
const { data: transactions } = useQuery({
  queryKey: ['transactions', activeMonth, householdId],
  queryFn: () => txRepo.listTransactions(activeMonth),
  staleTime: 60_000, // 1 minuto de cache
  select: data => (data || []).map(normalizeTransaction),
})
```

**Benefícios adicionais:** Loading states automáticos, refetch on focus, retry automático, invalidação precisa após mutações.

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Alto | Alto | Médio |

---

### 1.3 Sem Code Splitting 🟡 Média

**Problema:** Todas as 9 telas são importadas estaticamente em `App.jsx`, resultando em um bundle único.

**Solução:** Lazy loading por rota com `React.lazy` + `Suspense`:

```jsx
// App.jsx
const DashboardView = lazy(() => import('./presentation/dashboard/DashboardView'))
const TransactionsView = lazy(() => import('./presentation/transactions/TransactionsView'))
// ...

<Suspense fallback={<LoadingOverlay />}>
  {views[activeView]}
</Suspense>
```

**Resultado esperado:** Redução de 40–60% no bundle inicial, first contentful paint mais rápido.

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Baixo | Médio | Baixo |

---

### 1.4 Memory Leak em Chart.js 🟡 Média

**Problema:** Os wrappers de Chart.js (`BarLine.jsx`, `Donut.jsx`, `GroupedBars.jsx`) provavelmente não destroem as instâncias no cleanup do `useEffect`, causando memory leaks em navegações rápidas.

**Solução:** Garantir `chart.destroy()` no cleanup:

```jsx
useEffect(() => {
  const chart = new Chart(canvasRef.current, config)
  return () => chart.destroy() // cleanup obrigatório
}, [data])
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Baixo | Médio | Baixo |

---

### 1.5 `useAppData` Monolítico 🟡 Média

**Problema:** Um único hook (`/src/application/hooks/useAppData.js`) gerencia o estado de transações, contas, cartões, categorias e membros. Qualquer mudança neste arquivo afeta toda a aplicação.

**Solução:** Decompor em hooks de domínio com React Query:
- `useTransactions(month)` → cache e mutações de transações
- `useAccounts()` → cache e mutações de contas
- `useCards()` → cache e mutações de cartões
- `useCategories()` → cache (baixa mutação, longa duração)

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Alto | Médio | Médio |

---

## 2. UX / UI Gaps

### 2.1 Responsividade Mobile Inexistente 🔴 Alta

**Problema:** A sidebar é fixa com `width: 220px` e o layout geral não tem breakpoints responsivos. Em telas < 768px, a interface transborda horizontalmente e o conteúdo fica ilegível.

**Soluções:**

1. **Sidebar colapsável:** Transformar em drawer offcanvas em mobile, ativado por hamburguer menu
2. **Breakpoints no design system:** Adicionar variáveis CSS para sm/md/lg ao `global.css`
3. **Dashboard adaptativo:** Em mobile, widgets em coluna única (hoje fixo em 2 colunas)
4. **Formulários responsivos:** Campos em stack vertical em telas pequenas

```css
/* global.css — adicionar */
@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; position: fixed; bottom: 0; /* bottom nav */ }
  .main { padding: var(--sp-3); }
}
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Alto | Alto | Baixo |

---

### 2.2 Toggle Dark/Light Ausente 🟢 Baixa

**Problema:** A infraestrutura existe (variável `pb_theme` no localStorage, `data-theme` no HTML root, CSS vars para ambos os temas), mas não há nenhum botão/toggle na interface para o usuário mudar o tema.

**Solução:** Adicionar toggle no header ou nas configurações de perfil:

```jsx
// useTheme.js (já existe como useLocalStorage)
const [theme, setTheme] = useLocalStorage('pb_theme', 'dark')
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
}, [theme])

// No ProfileView ou Sidebar:
<button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
</button>
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Muito Baixo | Baixo | Baixo |

---

### 2.3 Formulário de Transação Complexo 🟡 Média

**Problema:** O formulário de criação/edição de transação (`TxForm`) exibe todos os campos simultaneamente. Dependendo do tipo (Account / CreditCard / Transfer / Recorrente / Parcelado), combinações diferentes de campos são relevantes — criando sobrecarga cognitiva.

**Solução:** Progressive disclosure com formulário em etapas:
1. **Passo 1:** Tipo (Entrada / Saída) + Valor + Data
2. **Passo 2:** Descrição + Categoria + Membro
3. **Passo 3 (condicional):** Meio de pagamento (conta / cartão / transferência)
4. **Passo 4 (condicional):** Recorrência / parcelamento

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Médio | Baixo |

---

### 2.4 Filtros de Transação Não Persistidos 🟡 Média

**Problema:** Os filtros ativos na tela de Transações (tipo, membro, categoria, status) são perdidos ao navegar para outra tela e voltar.

**Solução:** Persistir filtros no localStorage (chave `pb_tx_filters`) ou na URL como query params (melhor para compartilhamento):

```
/transactions?month=2026-09&category=alimentacao&member=igor
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Baixo | Médio | Baixo |

---

### 2.5 Sem Alertas e Notificações In-App 🟡 Média

**Problema:** O sistema de notificações atual (`useNotify`) serve apenas para toasts de erro/sucesso de operações. Não há alertas proativos como:
- Fatura de cartão próxima do vencimento
- Meta de economia atingida ou em risco
- Transações recorrentes prestes a expirar (deadline Set/2027)
- Saldo de conta abaixo de um threshold

**Solução:** Adicionar widget de "Avisos e Alertas" no Dashboard (já existe `TipsWidget`) e um badge no ícone da sidebar:

```jsx
// Lógica de alerts no useAppData ou hook dedicado
const alerts = useMemo(() => {
  const result = []
  cards.forEach(card => {
    const daysUntilDue = differenceInDays(card.currentStatement?.dueDate, new Date())
    if (daysUntilDue <= 3) result.push({ type: 'card-due', card, daysUntilDue })
  })
  return result
}, [cards])
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Alto | Baixo |

---

### 2.6 Simulator Desconectado 🟢 Baixa

**Problema:** O SimulatorView é uma ferramenta excelente, mas opera em completo isolamento dos dados reais. Não há como comparar "cenário simulado" vs "realidade atual" na mesma tela.

**Solução:** Adicionar modo de comparação side-by-side no Simulator:
- Coluna esquerda: projeção com dados reais
- Coluna direita: projeção com cenário simulado
- Delta visual (positivo/negativo) entre as duas

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Médio | Baixo |

---

## 3. Funcionalidades Ausentes

### 3.1 Exportação de Dados 🔴 Alta

Nenhuma funcionalidade de exportação existe atualmente.

**O que implementar:**
- Export CSV de transações do mês (filtradas)
- Export PDF de fatura de cartão
- Relatório mensal consolidado (PDF) com resumo de categorias + cashflow

**Biblioteca sugerida:** `jspdf` + `jspdf-autotable` para PDF; exportação CSV é nativa (Blob + link).

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Alto | Baixo |

---

### 3.2 Busca Global 🟡 Média

**Problema:** Não há campo de busca por descrição de transação. Para encontrar uma transação específica, o usuário precisa navegar mês a mês manualmente.

**Solução:** Campo de busca na tela de Transações com debounce + filtro client-side (ou endpoint de busca no backend):

```jsx
const filtered = useMemo(() =>
  transactions.filter(tx =>
    tx.description.toLowerCase().includes(search.toLowerCase())
  ), [transactions, search])
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Baixo | Alto | Baixo |

---

### 3.3 PWA / Instalação Mobile 🟡 Média

**Problema:** O app não é instalável como PWA. Usuários mobile precisam usar o browser.

**O que adicionar:**
1. `manifest.json` com ícones e `display: standalone`
2. Service Worker básico (cache de assets estáticos com Workbox via `vite-plugin-pwa`)
3. Offline fallback page

```js
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'
export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PersonalBudget',
        short_name: 'Budget',
        theme_color: '#2dd4bf',
        display: 'standalone',
      }
    })
  ]
}
```

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Baixo | Alto | Baixo |

---

### 3.4 Relatórios por Período Customizado 🟢 Baixa

**Problema:** Todos os filtros são mensais. Não há relatórios de 30/60/90 dias, trimestres ou anos completos.

**Solução:** Date range picker na tela de Transações e no Dashboard, com endpoint correspondente no backend.

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Alto | Alto | Médio |

---

## 4. Melhorias de Código

### 4.1 Migração para TypeScript 🟡 Média

**Contexto:** O backend é C# com tipos fortemente definidos (DTOs, enums, value objects). O frontend em JavaScript puro perde essa garantia nos limites de API, o que já causou divergências (ver `FRONTEND_API_CHANGES.txt` no backend).

**Abordagem sugerida:** Migração incremental arquivo a arquivo:
1. Renomear `vite.config.js` → `.ts`, adicionar `tsconfig.json`
2. Migrar primeiro os repositórios (`/data/repositories/`) — maior benefício imediato
3. Depois os mappers e hooks de aplicação
4. Por último os componentes de apresentação

**Benefício imediato:** Geração automática de tipos a partir do Swagger do backend (`openapi-typescript`).

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Alto | Médio | Médio |

---

### 4.2 Substituir Hash Routing por React Router v7 🟢 Baixa

**Problema:** O roteamento atual usa hash (`#/dashboard`) via hook `useHashView` customizado. Isso impede:
- URLs compartilháveis com parâmetros de filtro
- Deep linking (ex: `/transactions/2026-08`)
- Suporte a SSR futuro

**Solução:** Migrar para React Router v7 com rotas declarativas.

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Médio | Médio |

---

### 4.3 Testes de Integração de Telas 🟡 Média

**Situação atual:** Testes unitários de hooks e utilitários existem, mas nenhum teste de integração das telas principais (Dashboard, TransactionsView, CardsView).

**O que adicionar com React Testing Library:**
- Testes do fluxo de criação de transação (form → submit → lista atualizada)
- Testes do Dashboard com dados mockados
- Testes de autenticação (login → redirect → logout)

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Médio | Baixo |

---

### 4.4 Acessibilidade (a11y) 🟡 Média

**Situação atual:** Sem ESLint plugin de acessibilidade configurado.

**O que adicionar:**
- `eslint-plugin-jsx-a11y` para catching de erros comuns
- Atributos `aria-label` em botões de ícone
- Navegação por teclado nos modais (focus trap)
- Contraste verificado nas cores do design system (palette.js já tem cálculo de luminância — usar isso)

| Esforço | Impacto | Risco |
|---------|---------|-------|
| Médio | Médio | Baixo |

---

## 5. Tabela Consolidada de Prioridades

| Item | Prioridade | Impacto | Esforço | Quick Win? |
|------|-----------|---------|---------|------------|
| Cache de API (React Query) | 🔴 Alta | Alto | Alto | Não |
| Responsividade Mobile | 🔴 Alta | Alto | Alto | Não |
| Busca global de transações | 🔴 Alta | Alto | Baixo | ✅ Sim |
| Exportação CSV/PDF | 🔴 Alta | Alto | Médio | ✅ Sim |
| PWA / instalação mobile | 🟡 Média | Alto | Baixo | ✅ Sim |
| Code splitting por rota | 🟡 Média | Médio | Baixo | ✅ Sim |
| Chart.js memory leak fix | 🟡 Média | Médio | Baixo | ✅ Sim |
| Alertas in-app de vencimento | 🟡 Média | Alto | Médio | Não |
| Persistência de filtros | 🟡 Média | Médio | Baixo | ✅ Sim |
| Formulário de transação wizard | 🟡 Média | Médio | Médio | Não |
| Testes de integração | 🟡 Média | Médio | Médio | Não |
| Toggle dark/light | 🟢 Baixa | Baixo | Muito Baixo | ✅ Sim |
| TypeScript migration | 🟢 Baixa | Médio | Alto | Não |
| Simulator side-by-side | 🟢 Baixa | Médio | Médio | Não |
| Relatórios por período | 🟢 Baixa | Alto | Alto | Não |

---

*Documento gerado em Setembro 2026. Para roadmap de produto completo, ver [product-vision.md](../../PersonalBudget/docs/product-vision.md).*
