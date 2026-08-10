import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  AlertCircle,
  User,
  Key,
  Download,
  Trash2,
  PlusCircle,
  LogOut,
  History,
} from 'lucide-react';
import { Language, AppDatabase } from '../types';
import {
  getStoredUserAccount,
  fetchBackupSnapshots,
  createBackupSnapshot,
  deleteBackupSnapshot,
  BackupSnapshot,
} from '../utils/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  db: AppDatabase;
  onRestoreDatabase: (newDb: AppDatabase) => void;
  onPushCurrentData: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'unconfigured';
  lastSyncedAt: Date | null;
  accountName: string;
  onLoginAccount: (account: string, pass: string) => Promise<void>;
  onLogoutAccount: () => void;
  onDeleteAccount: () => Promise<void>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  lang,
  onClose,
  db,
  onRestoreDatabase,
  onPushCurrentData,
  syncStatus,
  lastSyncedAt,
  accountName,
  onLoginAccount,
  onLogoutAccount,
  onDeleteAccount,
}) => {
  // Login form state
  const [inputAccount, setInputAccount] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [inputPassConfirm, setInputPassConfirm] = useState('');
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  // Backups history state
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmCheck1, setConfirmCheck1] = useState(false);
  const [confirmCheck2, setConfirmCheck2] = useState(false);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isIt = lang === 'it';
  const isLoggedIn = !!accountName;

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredUserAccount();
      setInputAccount(stored.account || accountName || '');
      setInputPass(stored.pass || '');
      setInputPassConfirm(stored.pass || '');

      setLoginMessage(null);

      if (accountName) {
        loadBackupsList(accountName);
      } else {
        setBackups([]);
      }
    }
  }, [isOpen, accountName]);

  const loadBackupsList = async (accKey: string) => {
    if (!accKey.trim()) {
      setBackups([]);
      return;
    }
    setLoadingBackups(true);
    try {
      const list = await fetchBackupSnapshots(accKey.trim());
      setBackups(list);
    } catch (err) {
      console.warn('Error loading backup snapshots:', err);
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAccount.trim()) {
      setLoginMessage(isIt ? 'Inserisci un nome account' : 'Please enter an account name');
      return;
    }
    if (inputPass.trim() !== inputPassConfirm.trim()) {
      setLoginMessage(
        isIt
          ? 'Le password non coincidono. Inserisci la stessa password in entrambi i campi.'
          : 'Passwords do not match. Please enter the matching password in both fields.'
      );
      return;
    }
    setLoginMessage(null);
    try {
      await onLoginAccount(inputAccount.trim(), inputPass.trim());
      await loadBackupsList(inputAccount.trim());
      setLoginMessage(isIt ? 'Accesso effettuato con successo!' : 'Logged in successfully!');
    } catch (err: any) {
      setLoginMessage(err?.message || (isIt ? 'Errore durante il login' : 'Login error'));
    }
  };

  const handleLogoutClick = () => {
    onLogoutAccount();
    setBackups([]);
    setInputAccount('');
    setInputPass('');
    setInputPassConfirm('');
    setLoginMessage(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleConfirmDeleteAccount = async () => {
    const isTypedValid =
      typedConfirmName.trim().toLowerCase() === accountName.trim().toLowerCase() ||
      typedConfirmName.trim().toUpperCase() === 'ELIMINA' ||
      typedConfirmName.trim().toUpperCase() === 'DELETE';

    if (!confirmCheck1 || !confirmCheck2 || !isTypedValid) return;
    setDeletingAccount(true);
    try {
      await onDeleteAccount();
      setBackups([]);
      setInputAccount('');
      setInputPass('');
      setInputPassConfirm('');
      setShowDeleteConfirm(false);
      setConfirmCheck1(false);
      setConfirmCheck2(false);
      setTypedConfirmName('');
      setLoginMessage(
        isIt
          ? 'Account e tutti i dati cloud eliminati con successo dal database!'
          : 'Account and all cloud data deleted successfully from database!'
      );
      onClose();
    } catch (err: any) {
      console.error('Delete account failed:', err);
      setLoginMessage(
        isIt
          ? `Errore eliminazione: ${err?.message || 'Permessi insufficienti su Supabase'}`
          : `Delete error: ${err?.message || 'Insufficient permissions on Supabase'}`
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCreateNewBackup = async () => {
    const accKey = accountName.trim();
    if (!accKey) {
      setLoginMessage(isIt ? 'Devi prima accedere con il tuo account per salvare un backup!' : 'Log in first to save a backup!');
      return;
    }
    setCreatingBackup(true);
    try {
      await createBackupSnapshot(accKey, db, backupLabel.trim());
      setBackupLabel('');
      await loadBackupsList(accKey);
      await onPushCurrentData();
    } catch (err) {
      console.error('Backup creation failed:', err);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = (snap: BackupSnapshot) => {
    const confirmMsg = isIt
      ? `Vuoi ripristinare il backup "${snap.label}" creato il ${new Date(snap.createdAt).toLocaleString()}?\nEventuali modifiche non salvate verranno sostituite.`
      : `Do you want to restore backup "${snap.label}" from ${new Date(snap.createdAt).toLocaleString()}?`;

    if (window.confirm(confirmMsg)) {
      onRestoreDatabase(snap.data);
      onClose();
    }
  };

  const handleDeleteSnap = async (id: string) => {
    const accKey = accountName.trim();
    if (!accKey) return;
    if (window.confirm(isIt ? 'Eliminare questo backup?' : 'Delete this backup snapshot?')) {
      await deleteBackupSnapshot(id, accKey);
      setBackups((prev) => prev.filter((b) => b.id !== id));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#0B1B3A]/60 backdrop-blur-xs grid place-items-center z-[120] p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] sm:rounded-[22px] shadow-2xl p-4 sm:p-6 max-w-[620px] w-full text-[var(--ink)] my-auto max-h-[92vh] overflow-y-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#3ECF8E]/10 text-[#3ECF8E] flex items-center justify-center border border-[#3ECF8E]/20 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-black tracking-tight flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>{isIt ? 'Sync Cloud & Multi-Dispositivo' : 'Cloud & Multi-Device Sync'}</span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3ECF8E]/15 text-[#3ECF8E] border border-[#3ECF8E]/30">
                  Computer • Smartphone • Tablet
                </span>
              </h3>
              <p className="text-[11.5px] sm:text-[12.5px] text-[var(--sub)]">
                {isIt
                  ? 'Sincronizzazione in tempo reale tra tutti i tuoi dispositivi'
                  : 'Real-time synchronization across all your devices'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sub)] hover:text-[var(--ink)] p-2 rounded-lg hover:bg-[var(--soft)] cursor-pointer text-[18px] shrink-0"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Multi-Device Sync Callout Banner */}
        <div className="mt-3 p-3 rounded-[12px] bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-[12.5px] text-[var(--ink)] font-medium flex items-center gap-2.5">
          <span className="text-[18px] shrink-0">📱💻</span>
          <p className="leading-snug">
            {isIt
              ? 'Connetti lo stesso nome account su Computer, Smartphone e Tablet: tutte le modifiche e i risparmi si aggiorneranno in tempo reale su ogni dispositivo!'
              : 'Connect the same account name on PC, Phone and Tablet: all changes and savings sync live in real-time!'}
          </p>
        </div>

        {/* User Account Login Card */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-[14px] bg-[var(--soft)] border border-[var(--line)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13.5px] sm:text-[14px] font-extrabold text-[var(--ink)]">
              <User className="w-4 h-4 text-[#3ECF8E]" />
              <span>{isIt ? 'Account Cliente / Login' : 'Client Account / Login'}</span>
            </div>
            {isLoggedIn && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {isIt ? 'Loggato' : 'Logged in'}
              </span>
            )}
          </div>

          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--card)] p-3 rounded-[12px] border border-[var(--line)] gap-2.5">
                <div>
                  <div className="text-[13px] font-extrabold text-[var(--ink)]">
                    👤 {accountName}
                  </div>
                  <div className="text-[11px] sm:text-[11.5px] text-[var(--sub)] mt-0.5">
                    {isIt ? 'I tuoi viaggi vengono salvati automaticamente su questo account' : 'Your trips are saved automatically to this account'}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <button
                    onClick={handleLogoutClick}
                    className="px-3 py-1.5 rounded-lg bg-[var(--soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[var(--sub)]" />
                    <span>{isIt ? 'Disconnetti' : 'Logout'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(!showDeleteConfirm);
                      setConfirmCheck1(false);
                      setConfirmCheck2(false);
                      setTypedConfirmName('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isIt ? 'Elimina Account' : 'Delete Account'}</span>
                  </button>
                </div>
              </div>

              {showDeleteConfirm && (
                <div className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/30 space-y-3 text-[12.5px]">
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-[13px]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{isIt ? 'Eliminazione Definitiva Account e Dati' : 'Permanent Account & Data Deletion'}</span>
                  </div>
                  <p className="text-[12px] text-[var(--sub)] leading-relaxed">
                    {isIt
                      ? `Stai per eliminare definitivamente l'account "${accountName}" e tutti i dati e viaggi salvati nel cloud.`
                      : `You are about to permanently delete account "${accountName}" and all associated cloud data.`}
                  </p>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-[var(--ink)] font-medium">
                      <input
                        type="checkbox"
                        checked={confirmCheck1}
                        onChange={(e) => setConfirmCheck1(e.target.checked)}
                        className="mt-0.5 rounded accent-rose-500 w-4 h-4 shrink-0"
                      />
                      <span>
                        {isIt
                          ? "Confermo di voler eliminare l'account e tutti i viaggi salvati."
                          : 'I confirm that I want to delete the account and all saved trips.'}
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-[var(--ink)] font-medium">
                      <input
                        type="checkbox"
                        checked={confirmCheck2}
                        onChange={(e) => setConfirmCheck2(e.target.checked)}
                        className="mt-0.5 rounded accent-rose-500 w-4 h-4 shrink-0"
                      />
                      <span>
                        {isIt
                          ? "Prendo atto che l'operazione è irreversibile e i dati non potranno essere recuperati."
                          : 'I understand this action is irreversible and data cannot be recovered.'}
                      </span>
                    </label>
                  </div>

                  {/* Additional explicit typing security check */}
                  <div className="pt-2 border-t border-rose-500/20 space-y-1.5">
                    <label className="block text-[11.5px] font-bold text-rose-300">
                      {isIt
                        ? `Digita "${accountName}" oppure "ELIMINA" per confermare:`
                        : `Type "${accountName}" or "DELETE" to confirm:`}
                    </label>
                    <input
                      type="text"
                      placeholder={accountName}
                      value={typedConfirmName}
                      onChange={(e) => setTypedConfirmName(e.target.value)}
                      className="w-full bg-[var(--card)] border border-rose-500/40 rounded-[8px] px-3 py-1.5 text-[13px] font-mono text-[var(--ink)] outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3.5 py-1.5 rounded-[8px] bg-[var(--card)] border border-[var(--line)] text-[12px] font-bold text-[var(--ink)] hover:bg-[var(--soft)] cursor-pointer"
                    >
                      {isIt ? 'Annulla' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleConfirmDeleteAccount}
                      disabled={
                        !confirmCheck1 ||
                        !confirmCheck2 ||
                        deletingAccount ||
                        !(
                          typedConfirmName.trim().toLowerCase() === accountName.trim().toLowerCase() ||
                          typedConfirmName.trim().toUpperCase() === 'ELIMINA' ||
                          typedConfirmName.trim().toUpperCase() === 'DELETE'
                        )
                      }
                      className="px-3.5 py-1.5 rounded-[8px] bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[12px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {deletingAccount
                          ? (isIt ? 'Eliminazione...' : 'Deleting...')
                          : (isIt ? 'Conferma ed Elimina Definitivamente' : 'Confirm & Delete Permanently')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--sub)] mb-1">
                    {isIt ? 'Nome Account / Email / ID' : 'Account Name / ID'}
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--sub)]" />
                    <input
                      type="text"
                      placeholder={isIt ? 'Inserisci il tuo nome account' : 'Enter your account name'}
                      value={inputAccount}
                      onChange={(e) => setInputAccount(e.target.value)}
                      className="w-full bg-[var(--card)] border border-[var(--line)] rounded-[9px] pl-8 pr-3 py-2 text-[13px] font-medium outline-none focus:border-[#3ECF8E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--sub)] mb-1">
                    {isIt ? 'Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--sub)]" />
                    <input
                      type="password"
                      placeholder={isIt ? 'Inserisci la tua password' : 'Enter your password'}
                      value={inputPass}
                      onChange={(e) => setInputPass(e.target.value)}
                      className="w-full bg-[var(--card)] border border-[var(--line)] rounded-[9px] pl-8 pr-3 py-2 text-[13px] font-medium outline-none focus:border-[#3ECF8E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[var(--sub)] mb-1">
                    {isIt ? 'Conferma Password' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--sub)]" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={inputPassConfirm}
                      onChange={(e) => setInputPassConfirm(e.target.value)}
                      className="w-full bg-[var(--card)] border border-[var(--line)] rounded-[9px] pl-8 pr-3 py-2 text-[13px] font-medium outline-none focus:border-[#3ECF8E]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-[var(--sub)]">
                  {isIt
                    ? 'Inserisci il tuo account per accedere ai tuoi dati da qualsiasi PC.'
                    : 'Log in to access your saved trips from any computer.'}
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3ECF8E] text-[#052316] text-[12.5px] font-extrabold rounded-[9px] hover:brightness-105 cursor-pointer shrink-0 w-full sm:w-auto text-center"
                >
                  {isIt ? 'Accedi / Collega' : 'Log In / Connect'}
                </button>
              </div>

              {loginMessage && (
                <div className="text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-[8px]">
                  {loginMessage}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Create Backup Action */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-[14px] bg-[var(--soft)] border border-[var(--line)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13.5px] sm:text-[14px] font-extrabold text-[var(--ink)]">
              <PlusCircle className="w-4 h-4 text-[#3ECF8E]" />
              <span>{isIt ? 'Crea Nuovo Backup Istantaneo' : 'Create New Instant Backup'}</span>
            </div>
            <span className="text-[11px] sm:text-[11.5px] text-[var(--sub)]">
              {isIt ? `${db.trips.length} viaggi attuali` : `${db.trips.length} current trips`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder={isIt ? 'Nome/Nota backup (opzionale, es. Prima di cancellare)' : 'Backup label (optional)'}
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              className="flex-1 bg-[var(--card)] border border-[var(--line)] rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#3ECF8E]"
            />
            <button
              onClick={handleCreateNewBackup}
              disabled={creatingBackup}
              className="px-4 py-2 rounded-[10px] bg-[#3ECF8E] text-[#052316] text-[13px] font-extrabold hover:brightness-105 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Database className="w-4 h-4" />
              <span>{creatingBackup ? (isIt ? 'Salvataggio...' : 'Saving...') : (isIt ? 'Salva Backup' : 'Save Backup')}</span>
            </button>
          </div>
        </div>

        {/* Download / Restore Old Backups List */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[13.5px] sm:text-[14px] font-extrabold text-[var(--ink)]">
              <History className="w-4 h-4 text-[#3ECF8E]" />
              <span>{isIt ? 'Storico Backup (Carica o Ripristina Vecchi)' : 'Backup History (Restore Old)'}</span>
            </div>
            <button
              onClick={() => loadBackupsList(accountName || inputAccount || 'main')}
              className="text-[11.5px] text-[var(--sub)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingBackups ? 'animate-spin' : ''}`} />
              <span>{isIt ? 'Aggiorna' : 'Refresh'}</span>
            </button>
          </div>

          <div className="bg-[var(--soft)] border border-[var(--line)] rounded-[14px] p-2 sm:p-2.5 max-h-[220px] overflow-y-auto space-y-2">
            {loadingBackups ? (
              <div className="text-center py-6 text-[12.5px] text-[var(--sub)]">
                {isIt ? 'Caricamento storico backup in corso...' : 'Loading backup history...'}
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-6 text-[12.5px] text-[var(--sub)]">
                {isIt
                  ? 'Nessun backup precedente salvato. Fai clic su "Salva Backup" per crearne uno.'
                  : 'No previous backups found. Click "Save Backup" above to store one.'}
              </div>
            ) : (
              backups.map((snap) => (
                <div
                  key={snap.id}
                  className="bg-[var(--card)] border border-[var(--line)] hover:border-[var(--horizon)] rounded-[10px] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-[var(--ink)] truncate">
                      {snap.label || 'Backup'}
                    </div>
                    <div className="text-[11px] text-[var(--sub)] flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{new Date(snap.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{snap.tripCount} {isIt ? 'viaggi' : 'trips'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleRestore(snap)}
                      className="px-3 py-1.5 rounded-[8px] bg-[#3ECF8E]/10 hover:bg-[#3ECF8E]/20 text-[#3ECF8E] border border-[#3ECF8E]/30 text-[12px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                      title={isIt ? 'Carica e ripristina questo backup' : 'Restore this backup'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isIt ? 'Carica / Ripristina' : 'Restore'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSnap(snap.id)}
                      className="p-1.5 rounded-[8px] text-[var(--sub)] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      title={isIt ? 'Elimina backup' : 'Delete backup'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Close Footer */}
        <div className="mt-6 flex justify-end pt-3 border-t border-[var(--line)]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--soft)] border border-[var(--line)] rounded-[10px] text-[13px] font-bold hover:bg-[var(--card)] cursor-pointer"
          >
            {isIt ? 'Chiudi' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
