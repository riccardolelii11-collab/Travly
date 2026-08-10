import React, { useState, useEffect, useTransition, useMemo } from 'react';
import {
  AppDatabase,
  CategoryItem,
  ContributorItem,
  Currency,
  DepositItem,
  DepositMethod,
  ExpenseItem,
  Language,
  Page,
  Theme,
  Trip,
  TripData,
} from './types';
import {
  CATS,
  CURRENCIES,
  getBlankData,
  getExampleData,
  RATES,
} from './constants/translations';
import { catName, computeMetrics, t, today } from './utils/calculations';
import { SidebarRail } from './components/SidebarRail';
import { HeaderTopbar } from './components/HeaderTopbar';
import { OverviewPage } from './components/OverviewPage';
import { BudgetPage } from './components/BudgetPage';
import { SavingsPage } from './components/SavingsPage';
import { TeamPage } from './components/TeamPage';
import { TripExpensesPage } from './components/TripExpensesPage';
import { TravelModePage } from './components/TravelModePage';
import { TripReportModal } from './components/TripReportModal';
import { OnboardingResult, WelcomeModal } from './components/WelcomeModal';
import { CurrencyModal } from './components/CurrencyModal';
import { TooltipBox } from './components/TooltipBox';
import { SupabaseModal } from './components/SupabaseModal';
import { ActivationModal } from './components/ActivationModal';
import { AdminGeneratorModal } from './components/AdminGeneratorModal';
import { isAppActivated, clearAppActivated, markAccountDeletedInSupabase, verifyLoginAccount } from './utils/license';
import {
  getSupabaseCredentials,
  getSupabaseClient,
  loadFromSupabase,
  saveToSupabase,
  getStoredUserAccount,
  saveStoredUserAccount,
  clearStoredUserAccount,
  deleteAccountAndData,
} from './utils/supabase';

const STORAGE_KEY = 'travly_v2';
const OLD_STORAGE_KEY = 'voyage_v1';

const newId = () =>
  't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function normalizeTripData(st: any): TripData {
  if (!st || !st.budget) return getExampleData();
  const page: Page =
    ['overview', 'budget', 'savings', 'trip', 'team'].indexOf(st.page) >= 0
      ? st.page
      : 'overview';
  const contributors =
    Array.isArray(st.contributors) && st.contributors.length
      ? st.contributors
      : [{ name: 'Tu', share: '100' }];
  const rawSavings = Array.isArray(st.savings) ? st.savings : [];
  const savings = rawSavings.map((s: any, i: number) => ({
    ...s,
    id: s.id || `dep_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
    who: s.who == null ? 0 : s.who,
  }));
  const rawExpenses = Array.isArray(st.expenses) ? st.expenses : [];
  const expenses = rawExpenses.map((e: any, i: number) => ({
    ...e,
    id: e.id || `exp_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
    paid: e.paid ?? '0',
    dueDate: e.dueDate ?? '',
    bookingStatus: e.bookingStatus ?? 'to_search',
  }));
  const savingsGoals = Array.isArray(st.savingsGoals) ? st.savingsGoals : [];
  const currency: Currency =
    RATES[st.currency as Currency] != null ? st.currency : 'EUR';

  let reserve = 0;
  if (typeof st.reserve === 'boolean') {
    reserve = st.reserve ? 15 : 0;
  } else if (typeof st.reserve === 'number') {
    reserve = isNaN(st.reserve) ? 0 : Math.max(0, st.reserve);
  } else if (st.reserve != null) {
    const parsed = parseFloat(String(st.reserve));
    reserve = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  return {
    page,
    lang: st.lang || 'it',
    currency,
    theme: st.theme || 'light',
    reserve,
    destination: st.destination || '',
    departure: st.departure || '',
    returnDate: st.returnDate || '',
    tripLabel: st.tripLabel,
    contributors,
    budget: Array.isArray(st.budget) ? st.budget : CATS.map((key) => ({ key, amount: '' })),
    savings,
    expenses,
    savingsGoals,
  };
}

function loadInitialDatabase(): AppDatabase {
  let db: any = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) db = JSON.parse(raw);
  } catch {}

  if (!db || !Array.isArray(db.trips) || !db.trips.length) {
    let old: any = null;
    try {
      const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldRaw) old = JSON.parse(oldRaw);
    } catch {}

    const firstData = normalizeTripData(old && old.budget ? old : getExampleData());
    db = {
      v: 2,
      activeId: 't1',
      lang: firstData.lang || 'it',
      theme: firstData.theme || 'light',
      page: firstData.page || 'overview',
      trips: [{ id: 't1', data: firstData }],
    };
  }

  // Ensure active trip exists
  let active = db.trips.find((x: any) => x.id === db.activeId);
  if (!active) {
    active = db.trips[0];
    db.activeId = active.id;
  }
  active.data = normalizeTripData(active.data);

  return db;
}

export default function App() {
  const [db, setDb] = useState<AppDatabase>(loadInitialDatabase);
  const [, startTransition] = useTransition();

  // Active trip data reference
  const activeTrip = db.trips.find((x) => x.id === db.activeId) || db.trips[0];
  const state = activeTrip.data;

  // Account & Activation state
  const storedAcc = getStoredUserAccount().account;
  const [accountName, setAccountName] = useState<string>(storedAcc);

  const [isActivated, setIsActivated] = useState<boolean>(() => isAppActivated());
  const [activationOpen, setActivationOpen] = useState<boolean>(!isAppActivated());
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('admin') ||
      window.location.search.includes('generator')
    );
  });

  // Modals & UI states (Only show welcome prompt if user is brand new and not logged in)
  const isNewClient = !db.seen && !storedAcc;
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(isNewClient);
  const [supabaseOpen, setSupabaseOpen] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'saved' | 'error' | 'unconfigured'
  >('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [pendingCurrency, setPendingCurrency] = useState<{
    from: Currency;
    to: Currency;
  } | null>(null);
  const [activeTip, setActiveTip] = useState<{
    text: string;
    rect: DOMRect;
  } | null>(null);

  const isSupabaseConfigured = !!getSupabaseCredentials().url;

  // Sync theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme || 'light');
    document.documentElement.lang = state.lang || 'it';
  }, [state.theme, state.lang]);

  // Initial load from Supabase if configured or if returning user logged in
  useEffect(() => {
    async function initSupabaseSync() {
      const activeAccount = accountName || 'main';
      if (!isSupabaseConfigured && !accountName) {
        setSyncStatus('unconfigured');
        return;
      }
      try {
        setSyncStatus('syncing');
        let remoteDb = await loadFromSupabase(activeAccount);

        if (remoteDb && Array.isArray(remoteDb.trips) && remoteDb.trips.length > 0) {
          setDb(remoteDb);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDb));
          setLastSyncedAt(new Date());
          setSyncStatus('saved');
          setWelcomeOpen(false); // Suppress example prompt for returning clients
        } else {
          setSyncStatus('idle');
        }
      } catch (err) {
        console.warn('Initial Supabase sync error:', err);
        setSyncStatus('error');
      }
    }
    initSupabaseSync();
  }, [accountName]);

  // Continuous Multi-Device Real-Time Syncing Across PC, Phone, and Tablet
  useEffect(() => {
    const activeAccount = accountName || 'main';
    const client = getSupabaseClient();
    if (!client) return;

    let isSubscribed = true;

    const pullRemoteChanges = async () => {
      try {
        const remoteDb = await loadFromSupabase(activeAccount);
        if (!isSubscribed) return;
        if (remoteDb && Array.isArray(remoteDb.trips) && remoteDb.trips.length > 0) {
          const remoteStr = JSON.stringify(remoteDb);
          const localStr = localStorage.getItem(STORAGE_KEY);
          if (remoteStr !== localStr) {
            setDb(remoteDb);
            localStorage.setItem(STORAGE_KEY, remoteStr);
            setLastSyncedAt(new Date());
            setSyncStatus('saved');
          }
        }
      } catch (err) {
        console.warn('Multi-device background sync note:', err);
      }
    };

    // Auto-sync on window focus or tab becoming visible (switching between devices)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullRemoteChanges();
      }
    };

    window.addEventListener('focus', pullRemoteChanges);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Real-time Supabase postgres changes channel for instantaneous multi-device updates
    let channel: any = null;
    try {
      channel = client
        .channel(`sync_live_${activeAccount}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'travly_db',
            filter: `id=eq.${activeAccount}`,
          },
          (payload: any) => {
            if (!isSubscribed) return;
            if (payload?.new?.data) {
              const remoteDb = payload.new.data as AppDatabase;
              const remoteStr = JSON.stringify(remoteDb);
              const localStr = localStorage.getItem(STORAGE_KEY);
              if (remoteStr !== localStr) {
                setDb(remoteDb);
                localStorage.setItem(STORAGE_KEY, remoteStr);
                setLastSyncedAt(new Date());
                setSyncStatus('saved');
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscription notice:', e);
    }

    // Fast polling fallback (every 3s) for multi-device sync
    const interval = setInterval(pullRemoteChanges, 3000);

    return () => {
      isSubscribed = false;
      window.removeEventListener('focus', pullRemoteChanges);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      if (channel && client) {
        try {
          client.removeChannel(channel);
        } catch {}
      }
    };
  }, [accountName]);

  // Persist to localStorage whenever database changes + sync to Supabase
  const saveDb = (updated: AppDatabase) => {
    setDb(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    const activeAccount = accountName || 'main';
    if (getSupabaseClient()) {
      setSyncStatus('syncing');
      saveToSupabase(updated, activeAccount)
        .then((ok) => {
          if (ok) {
            setSyncStatus('saved');
            setLastSyncedAt(new Date());
          } else {
            setSyncStatus('error');
          }
        })
        .catch(() => setSyncStatus('error'));
    }
  };

  const handleLoginAccount = async (acc: string, pass: string) => {
    // Verify that this account exists and has a valid activated license
    const verifyRes = await verifyLoginAccount(acc, pass);
    if (!verifyRes.success) {
      throw new Error(verifyRes.message || `L'account '${acc}' non esiste o è stato eliminato.`);
    }

    saveStoredUserAccount(acc, pass);
    setAccountName(acc);
    setWelcomeOpen(false); // Hide example modal

    setSyncStatus('syncing');
    try {
      const remoteDb = await loadFromSupabase(acc);
      if (remoteDb && Array.isArray(remoteDb.trips) && remoteDb.trips.length > 0) {
        setDb(remoteDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDb));
        setLastSyncedAt(new Date());
        setSyncStatus('saved');
      } else {
        // Upload current database to this new account key
        await saveToSupabase(db, acc);
        setLastSyncedAt(new Date());
        setSyncStatus('saved');
      }
    } catch (err: any) {
      setSyncStatus('error');
      throw err;
    }
  };

  const handleLogoutAccount = () => {
    clearStoredUserAccount();
    clearAppActivated();
    setIsActivated(false);
    setActivationOpen(true);
    setAccountName('');
    setSyncStatus('idle');

    // Reset local database state to isolated example so previous user data is protected
    const freshDb: AppDatabase = {
      v: 2,
      activeId: 't1',
      lang: 'it',
      theme: 'light',
      page: 'overview',
      trips: [{ id: 't1', data: getExampleData() }],
    };
    setDb(freshDb);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshDb));
    } catch (e) {}
  };

  const handleDeleteAccount = async () => {
    if (!accountName) return;
    await markAccountDeletedInSupabase(accountName);
    await deleteAccountAndData(accountName);
    clearStoredUserAccount();
    clearAppActivated();
    setIsActivated(false);
    setActivationOpen(true);
    setAccountName('');
    setSyncStatus('idle');

    const freshDb: AppDatabase = {
      v: 2,
      activeId: 't1',
      lang: 'it',
      theme: 'light',
      page: 'overview',
      trips: [{ id: 't1', data: getExampleData() }],
    };
    setDb(freshDb);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshDb));
    } catch (e) {}
  };

  const handleRestoreDatabase = (newDb: AppDatabase) => {
    saveDb(newDb);
  };

  const handlePullFromSupabase = async () => {
    const activeAccount = accountName || 'main';
    setSyncStatus('syncing');
    try {
      const remoteDb = await loadFromSupabase(activeAccount);
      if (remoteDb && Array.isArray(remoteDb.trips) && remoteDb.trips.length > 0) {
        setDb(remoteDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDb));
        setLastSyncedAt(new Date());
        setSyncStatus('saved');
      } else {
        setSyncStatus('idle');
        alert(
          state.lang === 'it'
            ? `Nessun dato trovato per l'account "${activeAccount}"`
            : `No data found for account "${activeAccount}"`
        );
      }
    } catch (err: any) {
      setSyncStatus('error');
      alert(
        (state.lang === 'it' ? 'Errore caricamento Supabase: ' : 'Supabase load error: ') +
          (err.message || err)
      );
    }
  };

  const handlePushToSupabase = async () => {
    const activeAccount = accountName || 'main';
    setSyncStatus('syncing');
    try {
      const ok = await saveToSupabase(db, activeAccount);
      if (ok) {
        setSyncStatus('saved');
        setLastSyncedAt(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch (err: any) {
      setSyncStatus('error');
      alert(
        (state.lang === 'it' ? 'Errore salvataggio Supabase: ' : 'Supabase save error: ') +
          (err.message || err)
      );
    }
  };

  const updateActiveTripData = (updater: (prev: TripData) => TripData) => {
    const nextData = updater(activeTrip.data);
    const updatedTrips = db.trips.map((t) =>
      t.id === db.activeId ? { ...t, data: nextData } : t
    );
    saveDb({
      ...db,
      lang: nextData.lang,
      theme: nextData.theme,
      page: nextData.page,
      trips: updatedTrips,
    });
  };

  // Computed Metrics
  const metrics = useMemo(() => computeMetrics(state), [state]);

  // Actions
  const handleSelectPage = (page: Page) => {
    updateActiveTripData((prev) => ({ ...prev, page }));
  };

  const handleToggleTheme = () => {
    const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
    updateActiveTripData((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleSwitchTrip = (id: string) => {
    const target = db.trips.find((x) => x.id === id);
    if (!target) return;
    saveDb({
      ...db,
      activeId: id,
      page: target.data.page || 'overview',
      lang: target.data.lang || db.lang,
      theme: target.data.theme || db.theme,
    });
  };

  const handleNewTrip = () => {
    const newData = normalizeTripData(getBlankData(state));
    const newTripObj: Trip = { id: newId(), data: newData };
    const updated = {
      ...db,
      activeId: newTripObj.id,
      trips: [...db.trips, newTripObj],
    };
    saveDb(updated);
  };

  const handleDuplicateTrip = () => {
    const copyData = normalizeTripData(JSON.parse(JSON.stringify(state)));
    copyData.destination =
      (state.destination || t('untitled', state.lang)) +
      ' (' +
      t('copy_sfx', state.lang) +
      ')';
    const newTripObj: Trip = { id: newId(), data: copyData };
    saveDb({
      ...db,
      activeId: newTripObj.id,
      trips: [...db.trips, newTripObj],
    });
  };

  const handleDeleteTrip = () => {
    const nm = state.destination || t('untitled', state.lang);
    if (
      !confirm(
        t('confirm_del_trip', state.lang).replace('{n}', nm)
      )
    )
      return;

    if (db.trips.length <= 1) {
      const resetData = normalizeTripData(getBlankData(state));
      saveDb({
        ...db,
        trips: [{ id: db.activeId, data: resetData }],
      });
      return;
    }

    const remainingTrips = db.trips.filter((x) => x.id !== db.activeId);
    const nextActive = remainingTrips[0];
    saveDb({
      ...db,
      activeId: nextActive.id,
      trips: remainingTrips,
    });
  };

  const handleRequestChangeCurrency = (to: Currency) => {
    if (state.currency === to) return;
    setPendingCurrency({ from: state.currency, to });
  };

  const handleConvertCurrency = (rate: number) => {
    if (!pendingCurrency) return;
    const m = (x: string) => {
      if (x === '' || x == null) return x;
      const n = parseFloat(x);
      return isNaN(n) ? x : String(Math.round(n * rate * 100) / 100);
    };

    updateActiveTripData((prev) => ({
      ...prev,
      currency: pendingCurrency.to,
      budget: prev.budget.map((c) => ({ ...c, amount: m(c.amount) })),
      savings: prev.savings.map((s) => ({ ...s, amount: m(s.amount) })),
      expenses: prev.expenses.map((e) => ({
        ...e,
        budgeted: m(e.budgeted),
        actual: m(e.actual),
      })),
    }));
    setPendingCurrency(null);
  };

  const handleRelabelCurrency = () => {
    if (!pendingCurrency) return;
    updateActiveTripData((prev) => ({
      ...prev,
      currency: pendingCurrency.to,
    }));
    setPendingCurrency(null);
  };

  const handleSelectLang = (lang: Language) => {
    updateActiveTripData((prev) => ({ ...prev, lang }));
    saveDb({ ...db, lang });
  };

  const handleSave = () => {
    saveDb({ ...db });
  };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travly-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length) {
          parsed.trips.forEach((x: any) => {
            x.data = normalizeTripData(x.data);
          });
          if (!parsed.trips.find((x: any) => x.id === parsed.activeId)) {
            parsed.activeId = parsed.trips[0].id;
          }
          saveDb(parsed);
        } else if (parsed && parsed.budget) {
          const singleData = normalizeTripData(parsed);
          const singleId = newId();
          saveDb({
            ...db,
            activeId: singleId,
            trips: [...db.trips, { id: singleId, data: singleData }],
          });
        } else {
          throw new Error('Invalid format');
        }
      } catch {
        alert(
          state.lang === 'en'
            ? 'Invalid backup file'
            : 'File di backup non valido'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const rows: string[][] = [['BUDGET'], ['Category', 'Amount']];
    state.budget.forEach((b) =>
      rows.push([catName(b, state.lang), b.amount])
    );
    rows.push([], ['SAVINGS'], ['Date', 'Amount', 'Method', 'Who', 'Note']);
    state.savings.forEach((s) =>
      rows.push([
        s.date,
        s.amount,
        s.method,
        (state.contributors[s.who || 0] || {}).name || '',
        s.note,
      ])
    );
    rows.push(
      [],
      ['EXPENSES'],
      ['Date', 'Category', 'Description', 'Budgeted', 'Actual']
    );
    state.expenses.forEach((e) =>
      rows.push([e.date, e.cat, e.desc, e.budgeted, e.actual])
    );

    const csvStr = rows
      .map((r) =>
        r
          .map((c) => {
            const v = c == null ? '' : String(c);
            return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.destination || 'travly'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoadExample = () => {
    const exData = normalizeTripData(getExampleData());
    exData.lang = state.lang;
    exData.currency = state.currency;
    exData.theme = state.theme;
    exData.page = state.page;
    updateActiveTripData(() => exData);
  };

  const handleClear = () => {
    if (confirm(t('confirm_clear', state.lang))) {
      const blankData = normalizeTripData(getBlankData(state));
      updateActiveTripData(() => blankData);
    }
  };

  const handleStartMyTrip = (res: OnboardingResult) => {
    const baseData = normalizeTripData(getBlankData(state));

    if (res.destination) {
      baseData.destination = res.destination;
    }
    if (res.departure) {
      baseData.departure = res.departure;
    }
    if (res.returnDate) {
      baseData.returnDate = res.returnDate;
    }
    if (res.contributors && res.contributors.length > 0) {
      baseData.contributors = res.contributors.map((c) => ({
        name: c.name,
        share: String(c.sharePct),
      }));
    }
    if (res.budgetAllocations && res.budgetAllocations.length > 0) {
      baseData.budget = res.budgetAllocations.map((b) => ({
        key: b.key,
        amount: b.amount ? String(b.amount) : '',
      }));
    }

    saveDb({ ...db, hideCk: false, seen: true });
    updateActiveTripData(() => baseData);
    setWelcomeOpen(false);
  };

  const handleExploreDemo = () => {
    saveDb({ ...db, seen: true });
    setWelcomeOpen(false);
  };

  // Helper handlers for pages
  const handleShowTip = (el: HTMLElement, text: string) => {
    const rect = el.getBoundingClientRect();
    if (activeTip && activeTip.text === text) {
      setActiveTip(null);
    } else {
      setActiveTip({ text, rect });
    }
  };

  return (
    <div className="shell flex flex-col lg:flex-row min-h-screen bg-[var(--bg)] text-[var(--ink)] font-sans antialiased transition-colors duration-300 max-w-full overflow-x-hidden">
      {/* Navigation Rail & Mobile Drawer */}
      <SidebarRail
        activePage={state.page}
        theme={state.theme}
        lang={state.lang}
        departure={state.departure}
        trips={db.trips}
        activeId={db.activeId}
        onSwitchTrip={handleSwitchTrip}
        onNewTrip={handleNewTrip}
        onSelectPage={handleSelectPage}
        onToggleTheme={handleToggleTheme}
        onOpenSupabase={() => setSupabaseOpen(true)}
        isSupabaseConfigured={isSupabaseConfigured}
        onOpenReport={() => setReportOpen(true)}
        onHelp={() => setWelcomeOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main flex-1 min-w-0 max-w-full overflow-x-hidden p-3 pt-3 pb-24 sm:p-5 sm:pb-24 lg:p-[24px_40px_72px]">
        <HeaderTopbar
          trips={db.trips}
          activeId={db.activeId}
          tripLabel={
            state.tripLabel == null ? t('trip_to', state.lang) : state.tripLabel
          }
          destination={state.destination}
          departure={state.departure}
          currency={state.currency}
          lang={state.lang}
          onSwitchTrip={handleSwitchTrip}
          onNewTrip={handleNewTrip}
          onUpdateTripLabel={(val) =>
            updateActiveTripData((prev) => ({ ...prev, tripLabel: val }))
          }
          onUpdateDestination={(val) =>
            updateActiveTripData((prev) => ({ ...prev, destination: val }))
          }
          onUpdateDeparture={(val) =>
            updateActiveTripData((prev) => ({ ...prev, departure: val }))
          }
          onRequestChangeCurrency={handleRequestChangeCurrency}
          onSelectLang={handleSelectLang}
          onSave={handleSave}
          onDuplicateTrip={handleDuplicateTrip}
          onDeleteTrip={handleDeleteTrip}
          onBackup={handleBackup}
          onRestore={handleRestore}
          onExportCSV={handleExportCSV}
          onPrint={handlePrint}
          onOpenReport={() => setReportOpen(true)}
          onLoadExample={handleLoadExample}
          onHelp={() => setWelcomeOpen(true)}
          onClear={handleClear}
          onOpenSupabase={() => setSupabaseOpen(true)}
          onOpenActivation={() => setActivationOpen(true)}
          onOpenAdminGenerator={() => setAdminModalOpen(true)}
          isSupabaseConfigured={isSupabaseConfigured}
        />

        {/* Page Render */}
        <div id="pages" className="animate-[rise_0.4s_ease_both]">
          {state.page === 'overview' && (
            <OverviewPage
              state={state}
              metrics={metrics}
              hideChecklist={!!db.hideCk}
              onHideChecklist={() => saveDb({ ...db, hideCk: true })}
              onNavigatePage={handleSelectPage}
              onShowTip={handleShowTip}
              onFocusDestination={() => {
                const el = document.getElementById(
                  'destInput'
                ) as HTMLInputElement;
                if (el) {
                  el.focus();
                  el.select();
                }
              }}
            />
          )}

          {state.page === 'budget' && (
            <BudgetPage
              state={state}
              metrics={metrics}
              onUpdateCategoryName={(idx, name) =>
                updateActiveTripData((prev) => {
                  const budget = [...prev.budget];
                  budget[idx] = { ...budget[idx], name };
                  return { ...prev, budget };
                })
              }
              onUpdateCategoryAmount={(idx, amount) =>
                updateActiveTripData((prev) => {
                  const budget = [...prev.budget];
                  budget[idx] = { ...budget[idx], amount };
                  return { ...prev, budget };
                })
              }
              onDeleteCategory={(idx) =>
                updateActiveTripData((prev) => {
                  const budget = [...prev.budget];
                  budget.splice(idx, 1);
                  return { ...prev, budget };
                })
              }
              onAddCategory={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  budget: [
                    ...prev.budget,
                    {
                      key: 'cx' + Date.now().toString(36),
                      name: '',
                      amount: '',
                    },
                  ],
                }))
              }
              onUpdateReserve={(val) =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  reserve: val,
                }))
              }
              onShowTip={handleShowTip}
            />
          )}

          {state.page === 'savings' && (
            <SavingsPage
              state={state}
              metrics={metrics}
              onUpdateDeposit={(idx, field, val) =>
                updateActiveTripData((prev) => {
                  const savings = [...prev.savings];
                  savings[idx] = { ...savings[idx], [field]: val };
                  return { ...prev, savings };
                })
              }
              onDeleteDeposit={(idx) =>
                updateActiveTripData((prev) => {
                  const savings = [...prev.savings];
                  savings.splice(idx, 1);
                  return { ...prev, savings };
                })
              }
              onAddDeposit={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  savings: [
                    ...prev.savings,
                    {
                      id: 'dep_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      date: today(),
                      amount: '',
                      method: 'auto',
                      note: '',
                      who: 0,
                    },
                  ],
                }))
              }
              onUpdateSavingsGoal={(idx, field, val) =>
                updateActiveTripData((prev) => {
                  const savingsGoals = [...(prev.savingsGoals || [])];
                  savingsGoals[idx] = { ...savingsGoals[idx], [field]: val };
                  return { ...prev, savingsGoals };
                })
              }
              onDeleteSavingsGoal={(idx) =>
                updateActiveTripData((prev) => {
                  const savingsGoals = [...(prev.savingsGoals || [])];
                  savingsGoals.splice(idx, 1);
                  return { ...prev, savingsGoals };
                })
              }
              onAddSavingsGoal={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  savingsGoals: [
                    ...(prev.savingsGoals || []),
                    {
                      id: 'sg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      label: '',
                      targetAmount: '',
                    },
                  ],
                }))
              }
              onShowTip={handleShowTip}
            />
          )}

          {state.page === 'team' && (
            <TeamPage
              state={state}
              metrics={metrics}
              onUpdateContributor={(idx, field, val) =>
                updateActiveTripData((prev) => {
                  const contributors = [...prev.contributors];
                  contributors[idx] = { ...contributors[idx], [field]: val };
                  return { ...prev, contributors };
                })
              }
              onDeleteContributor={(idx) =>
                updateActiveTripData((prev) => {
                  if (prev.contributors.length <= 1) return prev;
                  const contributors = [...prev.contributors];
                  contributors.splice(idx, 1);
                  const savings = prev.savings.map((s) => {
                    const w = s.who || 0;
                    if (w === idx) return { ...s, who: 0 };
                    if (w > idx) return { ...s, who: w - 1 };
                    return s;
                  });
                  return { ...prev, contributors, savings };
                })
              }
              onAddContributor={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  contributors: [
                    ...prev.contributors,
                    { name: '', share: '0' },
                  ],
                }))
              }
              onShowTip={handleShowTip}
            />
          )}

          {state.page === 'trip' && (
            <TripExpensesPage
              state={state}
              metrics={metrics}
              onUpdateExpense={(idx, field, val) =>
                updateActiveTripData((prev) => {
                  const expenses = [...prev.expenses];
                  expenses[idx] = { ...expenses[idx], [field]: val };
                  return { ...prev, expenses };
                })
              }
              onDeleteExpense={(idx) =>
                updateActiveTripData((prev) => {
                  const expenses = [...prev.expenses];
                  expenses.splice(idx, 1);
                  return { ...prev, expenses };
                })
              }
              onAddExpense={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  expenses: [
                    ...prev.expenses,
                    {
                      id: 'exp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      date: today(),
                      cat: 'food',
                      desc: '',
                      budgeted: '',
                      actual: '',
                      paid: '0',
                      dueDate: '',
                      bookingStatus: 'to_search',
                    },
                  ],
                }))
              }
            />
          )}

          {state.page === 'travel' && (
            <TravelModePage
              state={state}
              metrics={metrics}
              onUpdateReturnDate={(val) =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  returnDate: val,
                }))
              }
              onAddExpense={() =>
                updateActiveTripData((prev) => ({
                  ...prev,
                  expenses: [
                    ...prev.expenses,
                    {
                      id: 'exp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      date: today(),
                      cat: 'food',
                      desc: '',
                      budgeted: '',
                      actual: '',
                      paid: '0',
                      dueDate: '',
                      bookingStatus: 'to_search',
                    },
                  ],
                }))
              }
              onUpdateExpense={(idx, field, val) =>
                updateActiveTripData((prev) => {
                  const expenses = [...prev.expenses];
                  expenses[idx] = { ...expenses[idx], [field]: val };
                  return { ...prev, expenses };
                })
              }
              onDeleteExpense={(idx) =>
                updateActiveTripData((prev) => {
                  const expenses = [...prev.expenses];
                  expenses.splice(idx, 1);
                  return { ...prev, expenses };
                })
              }
              onOpenReport={() => setReportOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Modals & Overlay Tooltips */}
      {reportOpen && (
        <TripReportModal
          state={state}
          metrics={metrics}
          onClose={() => setReportOpen(false)}
        />
      )}

      <WelcomeModal
        isOpen={welcomeOpen}
        lang={state.lang}
        onStartMyTrip={handleStartMyTrip}
        onExploreDemo={handleExploreDemo}
      />

      <CurrencyModal
        pendingCurrency={pendingCurrency}
        lang={state.lang}
        onConvert={handleConvertCurrency}
        onRelabel={handleRelabelCurrency}
        onCancel={() => setPendingCurrency(null)}
      />

      <SupabaseModal
        isOpen={supabaseOpen}
        lang={state.lang}
        onClose={() => setSupabaseOpen(false)}
        db={db}
        onRestoreDatabase={handleRestoreDatabase}
        onPushCurrentData={handlePushToSupabase}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        accountName={accountName}
        onLoginAccount={handleLoginAccount}
        onLogoutAccount={handleLogoutAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      <ActivationModal
        isOpen={activationOpen || !isActivated}
        isOverlay={!isActivated}
        lang={state.lang}
        accountName={accountName}
        onActivated={(accName, pass) => {
          setIsActivated(true);
          setActivationOpen(false);
          if (accName) {
            setAccountName(accName);
            saveStoredUserAccount(accName, pass || 'travly123');
          }
          if (!db.seen) {
            setWelcomeOpen(true);
          }
        }}
      />

      <AdminGeneratorModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        lang={state.lang}
      />

      <TooltipBox activeTip={activeTip} onClose={() => setActiveTip(null)} />
    </div>
  );
}
