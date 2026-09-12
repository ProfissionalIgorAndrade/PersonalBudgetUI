# Recorrência fixa — estado atual e pendência

## Como funciona

"Fixa" não é uma regra no domínio. É um atalho: no cadastro, o
`TransactionService` lê `repeatCount` e materializa N transações
independentes de uma vez. Depois disso não há nada ligando uma ocorrência à
próxima além do `RecurrenceId`.

O usuário não informa mais o N. A janela é fixa em 12 meses,
`FIXED_WINDOW_MONTHS` em `src/application/createTransactionPayload.js` —
perguntar o prazo expunha o detalhe de implementação, e do ponto de vista de
quem cadastra um aluguel, fixa é fixa.

Reajustar valor já funciona: `RecurrenceEditMode.ThisAndFuture` no backend
seleciona `allInSeries.Where(t => t.Date.Value >= pivot.Date.Value)`, então
editar a ocorrência de novembro com "Este e futuros" deixa as anteriores
intactas.

## Pendência: a série termina em silêncio

Ao fim dos 12 meses os lançamentos simplesmente param de existir. Nada avisa,
nada estende. Um aluguel cadastrado em setembro de 2026 desaparece a partir de
setembro de 2027, e a pessoa só descobre quando estranhar o saldo.

Isto **precisa ser resolvido antes de setembro de 2027**. Não é um nice to
have: é o custo de ter escolhido materializar em vez de modelar a regra.

### Opções

**Job no backend.** Um processo periódico procura séries fixas cujo último
lançamento está a menos de X meses e estende. É o correto. Exige
infraestrutura de agendamento, que hoje não existe no projeto.

**Extensão sob demanda.** Ao carregar os dados, o app detecta séries perto do
fim e pede a extensão. Mais barato e sem infra nova, mas depende de alguém
abrir o app, e duplica a lógica no cliente.

**Modelar a regra de verdade.** Uma entidade de recorrência com valor, dia,
categoria, conta, início e fim opcional; as transações passam a ser geradas a
partir dela. Resolve a extensão, o reajuste e a edição em massa de uma vez —
mudar o aluguel vira mudar um registro, não doze.

É a resposta certa e a mais cara, e exige decidir o que fazer com as séries já
materializadas.

### Decisão em aberto

Um lançamento fixo deve poder ter fim? Aluguel não tem; financiamento tem 48
parcelas. Se os dois precisam caber no mesmo conceito, a regra precisa de data
final opcional — e isso muda o desenho desde o início.
