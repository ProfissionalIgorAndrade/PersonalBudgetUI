import { useState, useCallback, useReducer } from 'react';
import { getHouseholdId, setHouseholdId } from '../../data/http/client';
import * as householdRepo    from '../../data/repositories/householdRepository';
import * as accountRepo      from '../../data/repositories/accountRepository';
import * as categoryRepo     from '../../data/repositories/categoryRepository';
import * as cardRepo         from '../../data/repositories/cardRepository';
import * as txRepo           from '../../data/repositories/transactionRepository';
import {
  normalizeAccount, normalizeCategory, normalizeCard,
  normalizeTransaction, normalizeProfile,
  txToApi, CAT_TYPE_TO_API, catVisuals, memberVisuals, cardVisuals,
} from '../mappers';

export function useAppData(notify) {
  const [transactionsReloadGeneration, bumpTransactionsReload] = useReducer(x => x + 1, 0);

  const [loading,      setLoading]      = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accounts,     setAccounts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [cards,        setCards]        = useState([]);
  const [members,      setMembers]      = useState([]);

  /* ── Individual loaders ───────────────────────────────────── */
  const loadTx = useCallback(async () => {
    const raw = await txRepo.listTransactions();
    setTransactions((raw || []).map(normalizeTransaction));
    bumpTransactionsReload();
  }, []);

  const loadAcc = useCallback(async () => {
    const raw = await accountRepo.listAccounts();
    setAccounts((raw || []).map(normalizeAccount));
  }, []);

  const loadCats = useCallback(async () => {
    const raw = await categoryRepo.listCategories();
    setCategories((raw || []).map(normalizeCategory));
  }, []);

  const loadCards = useCallback(async () => {
    const raw = await cardRepo.listCards();
    setCards((raw || []).map(normalizeCard).filter(Boolean));
  }, []);

  const loadMembers = useCallback(async (hid) => {
    const raw = await householdRepo.listProfiles(hid || getHouseholdId());
    setMembers((raw || []).map(normalizeProfile).filter(Boolean));
  }, []);

  /* ── Bulk initial load ────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const houseList = await householdRepo.listHouseholds();
      if (!houseList?.length) { notify('Nenhum lar encontrado na conta.', 'error'); return; }

      const hid = getHouseholdId() || houseList[0].id;
      setHouseholdId(hid);

      const [accs, cats, cds, txs, profs] = await Promise.all([
        accountRepo.listAccounts(),
        categoryRepo.listCategories(),
        cardRepo.listCards(),
        txRepo.listTransactions(),
        householdRepo.listProfiles(hid),
      ]);

      setAccounts((accs   || []).map(normalizeAccount));
      setCategories((cats || []).map(normalizeCategory));
      setCards((cds       || []).map(normalizeCard).filter(Boolean));
      setTransactions((txs || []).map(normalizeTransaction));
      bumpTransactionsReload();
      setMembers((profs   || []).map(normalizeProfile).filter(Boolean));
    } catch (e) {
      notify('Erro ao carregar dados: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const clearData = useCallback(() => {
    setTransactions([]); setCategories([]); setMembers([]); setAccounts([]); setCards([]);
  }, []);

  /* ── Transaction CRUD ─────────────────────────────────────── */
  const txOps = {
    onAdd: async (tx) => {
      try {
        await txRepo.createTransaction(txToApi(tx));
        await loadTx();
        notify('Lançamento adicionado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (tx) => {
      try {
        await txRepo.updateTransaction(tx.id, {
          amount:               tx.amount      || undefined,
          date:                 tx.date        || undefined,
          description:          tx.description || undefined,
          categoryId:           tx.categoryId  || undefined,
          attributionProfileId: tx.memberId    || undefined,
        });
        await loadTx();
        notify('Lançamento atualizado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try {
        const r = await txRepo.deleteTransaction(id);
        await loadTx();
        if (r?.skippedCount > 0) notify('Lançamento concluído não pode ser removido', 'error');
        else notify('Lançamento removido');
      } catch (e) { notify(e.message, 'error'); }
    },
    onUpdateStatus: async (id, uiStatus) => {
      try {
        const msg = await txRepo.patchTransactionStatus(id, uiStatus);
        setTransactions(prev => prev.map(t => String(t.id) === String(id) ? { ...t, status: uiStatus } : t));
        notify(msg);
      } catch (e) {
        notify(e.message, 'error');
        throw e;
      }
    },
  };

  /* ── Account CRUD ─────────────────────────────────────────── */
  const accOps = {
    onAdd: async (acc) => {
      try {
        await accountRepo.createAccount({
          bank:           acc.bank,
          agency:         acc.agency         || '',
          accountNumber:  acc.accountNumber  || '',
          initialBalance: Number(acc.initialBalance || 0),
        });
        await loadAcc();
        notify('Conta adicionada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (acc) => {
      try {
        await accountRepo.updateAccount(acc.id, { bank: acc.bank, agency: acc.agency || '', accountNumber: acc.accountNumber || '' });
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
        const r = await categoryRepo.createCategory({ name: cat.name, type: CAT_TYPE_TO_API[cat.type] || 'Expense' });
        if (r?.id) catVisuals.save(r.id, { icon: cat.icon, color: cat.color });
        await loadCats();
        notify('Categoria adicionada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (cat) => {
      try {
        await categoryRepo.updateCategory(cat.id, { categoryId: cat.id, name: cat.name, type: CAT_TYPE_TO_API[cat.type] || 'Expense' });
        catVisuals.save(cat.id, { icon: cat.icon, color: cat.color });
        await loadCats();
        notify('Categoria atualizada');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try { await categoryRepo.deleteCategory(id); catVisuals.remove(id); await loadCats(); notify('Categoria removida'); }
      catch (e) { notify(e.message, 'error'); }
    },
  };

  /* ── Card CRUD ────────────────────────────────────────────── */
  const cardOps = {
    onAdd: async (card) => {
      try {
        const created = await cardRepo.createCard({
          accountId:  card.accountId,
          name:       card.name,
          limit:      Number(card.limit      || 0),
          closingDay: Number(card.closingDay || 1),
          dueDay:     Number(card.dueDay     || 10),
          color:      card.color,
          flag:       card.flag,
          lastDigits: card.lastDigits || '',
          memberId:   card.memberId || undefined,
        });
        const persistedId = created?.id ?? created?.Id ?? card.id;
        if (persistedId != null && card.color)
          cardVisuals.save(String(persistedId), { color: card.color });
        await loadCards();
        notify('Cartão adicionado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (card) => {
      try {
        await cardRepo.updateCard(card.id, {
          accountId:  card.accountId,
          name:       card.name,
          limit:      Number(card.limit      || 0),
          closingDay: Number(card.closingDay || 1),
          dueDay:     Number(card.dueDay     || 10),
          color:      card.color,
          flag:       card.flag,
          lastDigits: card.lastDigits || '',
          memberId:   card.memberId || undefined,
        });
        if (card.color != null && card.color !== '')
          cardVisuals.save(String(card.id), { color: card.color });
        await loadCards();
        notify('Cartão atualizado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onDelete: async (id) => {
      try {
        await cardRepo.deleteCard(id);
        cardVisuals.remove(String(id));
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
        const r = await householdRepo.createProfile(getHouseholdId(), m.name);
        if (r?.id) memberVisuals.save(r.id, { emoji: m.emoji, color: m.color });
        await loadMembers();
        notify('Membro adicionado');
      } catch (e) { notify(e.message, 'error'); }
    },
    onEdit: async (m) => {
      memberVisuals.save(m.id, { emoji: m.emoji, color: m.color });
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x));
      notify('Membro atualizado');
    },
    onDeleteProfile: async (removeProfileId, mergeIntoProfileId) => {
      try {
        await householdRepo.deleteProfileMerge(
          getHouseholdId(),
          removeProfileId,
          mergeIntoProfileId,
        );
        memberVisuals.remove(removeProfileId);
        await loadMembers();
        notify('Perfil removido e dados migrados.');
      } catch (e) {
        notify(e.message, 'error');
        throw e;
      }
    },
  };

  return {
    loading, transactions, accounts, categories, cards, members,
    transactionsReloadGeneration,
    loadAll, loadTx, clearData,
    txOps, accOps, catOps, cardOps, mbrOps,
  };
}
