import { useState, useCallback, useReducer, useMemo } from 'react';
import { getHouseholdId, setHouseholdId } from '../../data/http/client';
import * as householdRepo    from '../../data/repositories/householdRepository';
import * as accountRepo      from '../../data/repositories/accountRepository';
import * as categoryRepo     from '../../data/repositories/categoryRepository';
import * as cardRepo         from '../../data/repositories/cardRepository';
import * as txRepo           from '../../data/repositories/transactionRepository';
import * as budgetRepo      from '../../data/repositories/budgetRepository';
import {
  normalizeAccount, buildAccountPayload, normalizeCategory, normalizeCard, buildCardPayload, sortCategories, sortByName,
  normalizeTransaction, normalizeProfile, normalizeSavingsBoxEvent,
  txToApi, CAT_TYPE_TO_API, TYPE_TO_API,
} from '../mappers';
import { describeCreateTransactionResponse } from '../createTransactionPayload';

const RECURRENCE_MODE      = { 1: 'OnlyThis', 2: 'ThisAndFuture', 3: 'All' };
const INSTALLMENT_EDIT_MODE = { 1: 'All', 2: 'ThisAndFuture' };

export function useAppData(notify) {
  const [transactionsReloadGeneration, bumpTransactionsReload] = useReducer(x => x + 1, 0);

  const [loading,      setLoading]      = useState(false);
  const [allTransactions, setTransactions] = useState([]);

  // Separado na origem, não em cada tela. Movimento de cofrinho só existe para
  // a tela do cofrinho; deixá-lo na lista geral e confiar que todo consumidor
  // vai filtrar é o tipo de regra que uma tela nova esquece.
  const transactions = useMemo(
    () => allTransactions.filter(t => t.type !== 'savings'), [allTransactions]);
  const savingsTransactions = useMemo(
    () => allTransactions.filter(t => t.type === 'savings'), [allTransactions]);
  const [accounts,     setAccounts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [cards,        setCards]        = useState([]);
  const [members,      setMembers]      = useState([]);
  const [savingsEvents, setSavingsEvents] = useState([]);
  const [budgets,      setBudgets]      = useState([]);

  /* ── Individual loaders ───────────────────────────────────── */
  const loadTx = useCallback(async () => {
    const raw = await txRepo.listTransactions();
    setTransactions((raw || []).map(normalizeTransaction));
    bumpTransactionsReload();
  }, []);

  const loadAcc = useCallback(async () => {
    const raw = await accountRepo.listAccounts();
    setAccounts(sortByName((raw || []).map(normalizeAccount)));
  }, []);

  // O histórico é complemento da tela do cofrinho: se falhar, avisa e segue
  // sem derrubar o carregamento do resto. Devolve null na falha para quem
  // chama decidir se mantém a lista anterior.
  const fetchSavingsEvents = useCallback(async () => {
    try {
      const raw = await accountRepo.listSavingsBoxEvents();
      return (raw || []).map(normalizeSavingsBoxEvent);
    } catch (e) {
      notify('Erro ao carregar o histórico das caixinhas: ' + e.message, 'error');
      return null;
    }
  }, [notify]);

  const loadSavingsEvents = useCallback(async () => {
    const events = await fetchSavingsEvents();
    if (events) setSavingsEvents(events);
  }, [fetchSavingsEvents]);

  const loadCats = useCallback(async () => {
    const raw = await categoryRepo.listCategories();
    setCategories(sortCategories((raw || []).map(normalizeCategory)));
  }, []);

  const loadCards = useCallback(async () => {
    const raw = await cardRepo.listCards();
    setCards(sortByName((raw || []).map(normalizeCard).filter(Boolean)));
  }, []);

  const loadBudgets = useCallback(async (month, year) => {
    const raw = await budgetRepo.listBudgets(month, year);
    setBudgets(raw || []);
  }, []);

  const loadMembers = useCallback(async (hid) => {
    const raw = await householdRepo.listProfiles(hid || getHouseholdId());
    setMembers(sortByName((raw || []).map(normalizeProfile).filter(Boolean)));
  }, []);

  /* ── Bulk initial load ────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const houseList = await householdRepo.listHouseholds();
      if (!houseList?.length) { notify('Nenhum lar encontrado na conta.', 'error'); return; }

      const hid = getHouseholdId() || houseList[0].id;
      setHouseholdId(hid);

      const [accs, cats, cds, txs, profs, events] = await Promise.all([
        accountRepo.listAccounts(),
        categoryRepo.listCategories(),
        cardRepo.listCards(),
        txRepo.listTransactions(),
        householdRepo.listProfiles(hid),
        fetchSavingsEvents(),
      ]);

      setAccounts(sortByName((accs   || []).map(normalizeAccount)));
      setCategories(sortCategories((cats || []).map(normalizeCategory)));
      setCards(sortByName((cds       || []).map(normalizeCard).filter(Boolean)));
      setTransactions((txs || []).map(normalizeTransaction));
      bumpTransactionsReload();
      setMembers(sortByName((profs   || []).map(normalizeProfile).filter(Boolean)));
      setSavingsEvents(events || []);
    } catch (e) {
      notify('Erro ao carregar dados: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, fetchSavingsEvents]);

  const clearData = useCallback(() => {
    setTransactions([]); setCategories([]); setMembers([]); setAccounts([]); setCards([]); setSavingsEvents([]);
  }, []);

  /* ── Transaction CRUD ─────────────────────────────────────── */
  const txOps = {
    /**
     * Criação para importação em lote.
     *
     * Diferente de onAdd em dois pontos que importam num laço de dezenas de
     * linhas: propaga o erro em vez de engolir num toast, para quem chama
     * saber qual linha falhou; e não recarrega a lista a cada item, o que
     * seriam 50 requisições extras. Quem importa recarrega uma vez no fim.
     */
    onImportOne: async (tx) => {
      await txRepo.createTransaction(txToApi(tx));
    },

    onAdd: async (tx) => {
      try {
        const data = await txRepo.createTransaction(txToApi(tx));
        await loadTx();
        const outcome = describeCreateTransactionResponse(data);
        if (outcome.kind === 'transfer') notify('Transferência registrada.');
        else if (outcome.kind === 'transaction') notify('Lançamento adicionado.');
        else notify('Operação concluída.');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (tx) => {
      try {
        const isInstallment = tx.recurrence === 'installment';
        const isFixed       = tx.recurrence === 'fixed';
        const editMode      = tx.recurrenceEditMode ?? 1;

        if (isInstallment) {
          if (editMode === 1) {
            // Este lançamento apenas — endpoint único suporta campo + troca de fatura
            await txRepo.updateTransaction(tx.id, {
              // O backend aceita reclassificar receita/despesa; sem enviar o tipo,
              // um estorno cadastrado como despesa ficava assim para sempre.
              type:               TYPE_TO_API[tx.type] || undefined,
              amount:               tx.amount      || undefined,
              date:                 tx.date        || undefined,
              description:          tx.description || undefined,
              categoryId:           tx.categoryId  || undefined,
              attributionProfileId: tx.memberId    || undefined,
              statementMonth:       tx.statementMonth || undefined,
              statementYear:        tx.statementYear  || undefined,
              observations:         tx.notes ?? null,
            });
          } else {
            // Este e futuros (2) ou Todos (3) — usar endpoint dedicado de parcelas
            // Backend InstallmentEditMode: All=1, ThisAndFuture=2
            const installmentEditMode = editMode === 3 ? 1 : 2;
            await txRepo.updateInstallmentStatement(tx.id, {
              statementMonth: tx.statementMonth,
              statementYear:  tx.statementYear,
              editMode:       INSTALLMENT_EDIT_MODE[installmentEditMode] ?? 'All',
              // Without these the endpoint moved the statement and discarded
              // everything else the user had edited, silently.
              categoryId:           tx.categoryId || null,
              attributionProfileId: tx.memberId   || null,
              observations:         tx.notes ?? null,
            });
          }
        } else if (isFixed) {
          await txRepo.updateRecurringTransaction(tx.id, {
            // O backend aceita reclassificar receita/despesa; sem enviar o tipo,
            // um estorno cadastrado como despesa ficava assim para sempre.
            type:               TYPE_TO_API[tx.type] || undefined,
            amount:               tx.amount      || undefined,
            date:                 tx.date        || undefined,
            description:          tx.description || undefined,
            categoryId:           tx.categoryId  || undefined,
            attributionProfileId: tx.memberId    || undefined,
            recurrenceEditMode:   RECURRENCE_MODE[editMode] ?? 'OnlyThis',
            observations:         tx.notes ?? null,
          });
        } else {
          await txRepo.updateTransaction(tx.id, {
            // O backend aceita reclassificar receita/despesa; sem enviar o tipo,
            // um estorno cadastrado como despesa ficava assim para sempre.
            type:               TYPE_TO_API[tx.type] || undefined,
            amount:               tx.amount      || undefined,
            date:                 tx.date        || undefined,
            description:          tx.description || undefined,
            categoryId:           tx.categoryId  || undefined,
            attributionProfileId: tx.memberId    || undefined,
            statementMonth:       tx.statementMonth || undefined,
            statementYear:        tx.statementYear  || undefined,
            observations:         tx.notes ?? null,
          });
        }
        await loadTx();
        notify('Lançamento atualizado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id, { recurrence, recurrenceDeleteMode } = {}) => {
      try {
        const isRecurring = recurrence === 'fixed' || recurrence === 'installment';
        const r = isRecurring
          ? await txRepo.deleteRecurringTransaction(id, RECURRENCE_MODE[recurrenceDeleteMode ?? 1] ?? 'OnlyThis')
          : await txRepo.deleteTransaction(id);
        await loadTx();
        if (isRecurring) {
          const msg = r?.message?.trim();
          notify(
            msg || (r?.deletedCount === 0 ? 'Nenhuma transação foi excluída.' : 'Lançamento(s) removido(s).'),
            r?.deletedCount === 0 ? 'error' : 'success',
          );
        } else if (r?.skippedCount > 0) {
          notify('Lançamento concluído não pode ser removido', 'error');
        } else {
          notify('Lançamento removido');
        }
      } catch (e) { notify(e.message, 'error'); }
    },
    onToggleReviewed: async (tx) => {
      try {
        await txRepo.setReviewed(tx.id, !tx.reviewed);
        await loadTx();
      } catch (e) { notify(e.message, 'error'); }
    },
    onBatchDelete: async (ids) => {
      try {
        await txRepo.batchDelete(ids);
        await loadTx();
        notify(`${ids.length} lançamento(s) removido(s)`);
      } catch (e) { notify(e.message, 'error'); }
    },
    onBulkImport: async (rows, defaultAccountId) => {
      const result = await txRepo.importTransactions({ rows, defaultAccountId });
      await loadTx();
      return result;
    },
  };

  /* ── Account CRUD ─────────────────────────────────────────── */
  const accOps = {
    /**
     * Guardar e resgatar são a mesma transferência com origem e destino
     * trocados. Reusa o fluxo de transferência que já existe, então o valor
     * sai do disponível sem virar despesa e o movimento fica no histórico.
     */
    onMoveSavings: async ({ box, direction, amount, reason }) => {
      if (direction === 'in') {
        await accountRepo.depositToSavingsBox(box.id, Number(amount), reason || null);
      } else {
        await accountRepo.withdrawFromSavingsBox(box.id, Number(amount), reason || null);
      }
      await loadAcc();
      // O movimento é um lançamento: sem recarregar, o extrato não mostra o
      // que acabou de acontecer.
      await loadTx();
      await loadSavingsEvents();
    },

    onCreateSavingsBox: async (parentAccountId, name) => {
      // Devolve o id para o chamador poder gravar a meta em seguida: o
      // endpoint de criação não aceita meta, ela tem rota própria.
      const created = await accountRepo.createSavingsBox(parentAccountId, name);
      await loadAcc();
      await loadSavingsEvents();
      // O client já desembrulha o ApiResponse, então o id vem direto.
      return created?.id ?? null;
    },

    onSetSavingsGoal: async (accountId, goal) => {
      await accountRepo.setSavingsGoal(accountId, goal);
      await loadAcc();
    },

    onRenameSavingsBox: async (accountId, name) => {
      await accountRepo.renameSavingsBox(accountId, name);
      await loadAcc();
    },

    /**
     * Exclui a caixinha. Propaga o erro: o modal o mostra e continua aberto.
     * O saldo vira um depósito na caixinha de destino e a exclusão entra no
     * histórico, então recarrega contas, lançamentos e eventos. Se só o
     * recarregamento falhar, a exclusão já valeu: devolve `refreshFailed` em
     * vez de lançar, para o modal não sugerir uma nova tentativa.
     */
    onDeleteSavingsBox: async (accountId, { reason, destinationAccountId } = {}) => {
      await accountRepo.deleteSavingsBox(accountId, { reason, destinationAccountId });
      try {
        await loadAcc();
        await loadTx();
        await loadSavingsEvents();
      } catch {
        return { refreshFailed: true };
      }
      return { refreshFailed: false };
    },

    onAdd: async (acc) => {
      try {
        await accountRepo.createAccount(buildAccountPayload(acc));
        await loadAcc();
        notify('Conta adicionada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (acc) => {
      try {
        await accountRepo.updateAccount(acc.id, buildAccountPayload(acc));
        await loadAcc();
        notify('Conta atualizada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try { await accountRepo.deleteAccount(id); await loadAcc(); notify('Conta removida'); }
      catch (e) { notify(e.message, 'error'); }
    },
  };

  /* ── Category CRUD ────────────────────────────────────────── */
  const catOps = {
    onAdd: async (cat) => {
      try {
        await categoryRepo.createCategory({ name: cat.name, type: CAT_TYPE_TO_API[cat.type] || 'Expense', icon: cat.icon, color: cat.color });
        await loadCats();
        notify('Categoria adicionada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (cat) => {
      try {
        await categoryRepo.updateCategory(cat.id, { categoryId: cat.id, name: cat.name, type: CAT_TYPE_TO_API[cat.type] || 'Expense', icon: cat.icon, color: cat.color });
        await loadCats();
        notify('Categoria atualizada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try { await categoryRepo.deleteCategory(id); await loadCats(); notify('Categoria removida'); }
      catch (e) { notify(e.message, 'error'); }
    },
  };

  /* ── Card CRUD ────────────────────────────────────────────── */
  const cardOps = {
    onAdd: async (card) => {
      try {
        await cardRepo.createCard(buildCardPayload(card));
        await loadCards();
        notify('Cartão adicionado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (card) => {
      try {
        await cardRepo.updateCard(card.id, buildCardPayload(card));
        await loadCards();
        notify('Cartão atualizado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onReviewStatement: async (cardId, statementId, reviewed) => {
      try {
        await cardRepo.setStatementReviewed(cardId, statementId, reviewed);
        await loadTx();
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try {
        await cardRepo.deleteCard(id);
        await loadCards();
        notify('Cartão removido');
      }
      catch (e) { notify(e.message, 'error'); }
    },
  };

  /* ── Member CRUD ──────────────────────────────────────────── */
  const mbrOps = {
    onAdd: async (m) => {
      try {
        await householdRepo.createProfile(getHouseholdId(), { displayName: m.name, emoji: m.emoji, color: m.color });
        await loadMembers();
        notify('Membro adicionado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (m) => {
      try {
        await householdRepo.updateProfile(getHouseholdId(), m.id, { displayName: m.name, emoji: m.emoji, color: m.color });
        await loadMembers();
        notify('Membro atualizado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDeleteProfile: async (removeProfileId, mergeIntoProfileId) => {
      try {
        await householdRepo.deleteProfileMerge(
          getHouseholdId(),
          removeProfileId,
          mergeIntoProfileId,
        );
        await loadMembers();
        notify('Perfil removido e dados migrados.');
      } catch (e) {
        notify(e.message, 'error');
        throw e;
      }
    },
  };

  /* ── Budget CRUD ──────────────────────────────────────────── */
  const budgetOps = {
    onUpsert: async (b) => {
      try {
        await budgetRepo.upsertBudget(b);
        await loadBudgets(b.month, b.year);
        notify('Orçamento salvo.');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id, month, year) => {
      try {
        await budgetRepo.deleteBudget(id);
        await loadBudgets(month, year);
        notify('Orçamento removido.');
      } catch (e) { notify(e.message, 'error'); }
    },
  };

  return {
    loading, transactions, savingsTransactions, savingsEvents, accounts, categories, cards, members,
    budgets,
    transactionsReloadGeneration,
    loadAll, loadTx, loadBudgets, clearData,
    txOps, accOps, catOps, cardOps, mbrOps, budgetOps,
  };
}
