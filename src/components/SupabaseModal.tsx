import React, { useState, useEffect } from 'react';
import { Database, Check, Copy, RefreshCw, Server, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  getSupabaseClient,
  SUPABASE_SQL_SCRIPT,
  loadFromSupabase,
  saveToSupabase,
} from '../utils/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onPullData: () => Promise<void>;
  onPushData: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'error' | 'unconfigured';
  lastSyncedAt: Date | null;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  lang,
  onClose,
  onPullData,
  onPushData,
  syncStatus,
  lastSyncedAt,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCredentials = async () => {
    saveSupabaseCredentials(url, anonKey);
    setTestResult(null);
    setTesting(true);

    const client = getSupabaseClient();
    if (!client) {
      setTesting(false);
      setTestResult({
        success: false,
        message: lang === 'it' 
          ? 'Inserisci sia l\'URL che la chiave Anon di Supabase' 
          : 'Please enter both Supabase URL and Anon Key',
      });
      return;
    }

    try {
      const { error } = await client.from('travly_db').select('id').limit(1);
      setTesting(false);
      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "travly_db" does not exist')) {
          setTestResult({
            success: false,
            message: lang === 'it'
              ? 'Connessione a Supabase riuscita! Nota: la tabella "travly_db" non esiste ancora. Esegui lo script SQL qui sotto.'
              : 'Connected to Supabase! Note: Table "travly_db" does not exist yet. Please run the SQL script below.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Errore Supabase: ${error.message} (${error.code || 'UNKNOWN'})`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: lang === 'it'
            ? 'Connesso a Supabase con successo! La tabella travly_db è pronta.'
            : 'Successfully connected to Supabase! Table travly_db is ready.',
        });
      }
    } catch (err: any) {
      setTesting(false);
      setTestResult({
        success: false,
        message: err.message || 'Impossibile connettersi a Supabase',
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isIt = lang === 'it';

  return (
    <div
      className="fixed inset-0 bg-[#0B1B3A]/60 backdrop-blur-xs grid place-items-center z-[120] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] shadow-2xl p-6 max-w-[560px] w-full text-[var(--ink)] my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3ECF8E]/10 text-[#3ECF8E] flex items-center justify-center border border-[#3ECF8E]/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-black tracking-tight flex items-center gap-2">
                {isIt ? 'Database Supabase' : 'Supabase Database'}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3ECF8E]/15 text-[#3ECF8E] border border-[#3ECF8E]/30">
                  Cloud Storage
                </span>
              </h3>
              <p className="text-[12.5px] text-[var(--sub)]">
                {isIt
                  ? 'Salva i tuoi viaggi e dati in tempo reale su Supabase Cloud'
                  : 'Persist your trips and budget data in real-time on Supabase Cloud'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sub)] hover:text-[var(--ink)] p-1 rounded-lg hover:bg-[var(--soft)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="mt-4 p-3.5 rounded-[12px] bg-[var(--soft)] border border-[var(--hair)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Server className="w-4 h-4 text-[var(--sub)]" />
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                  syncStatus === 'saved' || syncStatus === 'idle'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
            </div>
            <div>
              <div className="text-[13px] font-bold">
                {syncStatus === 'saved' || syncStatus === 'idle'
                  ? isIt ? 'Stato: Sincronizzato con Cloud' : 'Status: Synced with Cloud'
                  : syncStatus === 'syncing'
                  ? isIt ? 'Stato: Sincronizzazione in corso...' : 'Status: Syncing...'
                  : syncStatus === 'error'
                  ? isIt ? 'Stato: Errore di sincronizzazione' : 'Status: Sync error'
                  : isIt ? 'Stato: Non configurato' : 'Status: Unconfigured'}
              </div>
              {lastSyncedAt && (
                <div className="text-[11px] text-[var(--sub)]">
                  {isIt ? 'Ultimo salvataggio: ' : 'Last saved: '}
                  {lastSyncedAt.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPullData}
              disabled={syncStatus === 'syncing'}
              title={isIt ? 'Carica dati da Supabase' : 'Pull data from Supabase'}
              className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[12px] font-bold text-[var(--ink)] hover:border-[var(--horizon)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{isIt ? 'Scarica' : 'Pull'}</span>
            </button>
            <button
              onClick={onPushData}
              disabled={syncStatus === 'syncing'}
              title={isIt ? 'Invia dati a Supabase' : 'Push data to Supabase'}
              className="p-2 rounded-lg bg-[#3ECF8E] text-[#052316] text-[12px] font-extrabold hover:brightness-105 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isIt ? 'Salva ora' : 'Push now'}</span>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="mt-5 space-y-3.5">
          <div>
            <label className="block text-[12px] font-bold text-[var(--sub)] mb-1">
              Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[var(--soft)] border border-[var(--line)] rounded-[10px] p-[9px_12px] text-[13.5px] font-mono focus:border-[#3ECF8E] outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[var(--sub)] mb-1">
              API Anon Key (Public)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-[var(--soft)] border border-[var(--line)] rounded-[10px] p-[9px_12px] text-[13.5px] font-mono focus:border-[#3ECF8E] outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSaveCredentials}
              disabled={testing}
              className="px-4 py-2 bg-[var(--card)] border border-[var(--line)] rounded-[10px] text-[13px] font-bold hover:border-[#3ECF8E] hover:text-[#3ECF8E] flex items-center gap-2 cursor-pointer"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#3ECF8E]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#3ECF8E]" />
              )}
              <span>{isIt ? 'Salva e Verifica Connessione' : 'Save & Test Connection'}</span>
            </button>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold text-[#3ECF8E] hover:underline flex items-center gap-1"
            >
              <span>{isIt ? 'Apri Supabase Dashboard' : 'Open Supabase Dashboard'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-[10px] text-[12.5px] flex items-start gap-2 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* SQL Script Section */}
        <div className="mt-5 pt-4 border-t border-[var(--line)]">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowSql(!showSql)}
              className="text-[13px] font-bold text-[var(--sub)] hover:text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showSql ? '▼' : '►'}</span>
              <span>{isIt ? 'Istruzioni Tabella SQL (Supabase SQL Editor)' : 'SQL Table Setup (Supabase SQL Editor)'}</span>
            </button>
            <button
              onClick={handleCopySql}
              className="text-[11.5px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 hover:bg-[#3ECF8E]/20 border border-[#3ECF8E]/30 rounded-md px-2.5 py-1 flex items-center gap-1 cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? (isIt ? 'Copiato!' : 'Copied!') : (isIt ? 'Copia SQL' : 'Copy SQL')}</span>
            </button>
          </div>

          {showSql && (
            <div className="relative mt-2">
              <pre className="bg-[#0b1329] border border-[var(--line)] rounded-[10px] p-3 text-[11.5px] font-mono text-emerald-300 overflow-x-auto max-h-[160px] leading-relaxed">
                {SUPABASE_SQL_SCRIPT}
              </pre>
              <p className="mt-2 text-[11.5px] text-[var(--sub)]">
                {isIt
                  ? '1. Vai nella tua Dashboard Supabase -> SQL Editor\n2. Incolla ed esegui questo script per creare la tabella travly_db.'
                  : '1. Go to Supabase Dashboard -> SQL Editor\n2. Paste and run this script to create the travly_db table.'}
              </p>
            </div>
          )}
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
