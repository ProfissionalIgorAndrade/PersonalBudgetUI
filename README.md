# PersonalBudgetUI

Aplicação web de controle financeiro pessoal e familiar. Permite gerenciar contas, cartões, transações e categorias, com dashboard visual e suporte a múltiplos membros por domicílio.

## Tecnologias

- **React 19** — interface de usuário
- **Vite 8** — build e servidor de desenvolvimento
- **Chart.js 4** — gráficos e visualizações
- **Framer Motion 12** — animações
- **Fetch API** — comunicação com o backend (sem dependências externas de HTTP)

## Pré-requisitos

- Node.js 18+
- Backend da API rodando em `http://localhost:5000` ([PersonalBudgetAPI](https://github.com/ProfissionalIgorAndrade))

## Instalação

```bash
# Clone o repositório
git clone git@github.com:ProfissionalIgorAndrade/PersonalBudgetUI.git
cd PersonalBudgetUI

# Instale as dependências
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_BASE=http://localhost:5000
```

> O arquivo `.env` não é versionado. Ajuste a URL conforme o ambiente.

## Uso

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Funcionalidades

- **Autenticação** — cadastro e login com JWT
- **Dashboard** — visão geral com gráficos de cashflow, despesas por categoria, faturas e resumo por membro
- **Transações** — registro de receitas e despesas com categorização
- **Contas** — gerenciamento de contas bancárias
- **Cartões** — controle de cartões de crédito e suas faturas
- **Categorias** — criação e organização de categorias de gastos e receitas
- **Membros** — suporte a múltiplos perfis por domicílio com convite por e-mail

## Estrutura do Projeto

```
src/
├── application/        # Hooks de estado e lógica de negócio
├── core/               # Utilitários, constantes e hooks genéricos
├── data/               # Repositórios e cliente HTTP
│   ├── http/           # Wrapper do Fetch com injeção de JWT
│   └── repositories/   # Uma classe por domínio (auth, contas, cartões...)
├── presentation/       # Componentes e views por funcionalidade
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   ├── accounts/
│   ├── cards/
│   ├── categories/
│   ├── members/
│   └── shared/         # Componentes reutilizáveis (Modal, Sidebar, Toast...)
└── styles/             # CSS global
```

## Variáveis de Ambiente

| Variável        | Descrição                  | Padrão                    |
|-----------------|----------------------------|---------------------------|
| `VITE_API_BASE` | URL base da API backend    | `http://localhost:5000`   |
