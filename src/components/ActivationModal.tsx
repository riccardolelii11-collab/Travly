import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Code,
  Plus,
  List,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Language } from '../types';
import {
  verifyAndActivateCode,
  generateRandomCode,
  createLicensesInSupabase,
  fetchAllLicensesFromSupabase,
  SUPABASE_LICENSES_SQL_SCRIPT,
  EXTERNAL_GENERATOR_HTML_CODE,
  LicenseItem,
} from '../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: () => void;
  lang: Language;
  accountName?: string;
  isOverlay?: boolean; // If true, acts as a full lock screen
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onActivated,
  lang,
  accountName,
  isOverlay = true,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Admin section state
  const [showAdmin, setShowAdmin] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [savingCodes, setSavingCodes] = useState(false);
  const [genMessage, setGenMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  const [licensesList, setLicensesList] = useState<LicenseItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (isOpen && showAdmin && showList) {
      loadLicenses();
    }
  }, [isOpen, showAdmin, showList]);

  if (!isOpen) return null;

  const isIt = lang === 'it';

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setStatus({
        success: false,
        message: isIt ? 'Inserisci il tuo codice di attivazione.' : 'Please enter your activation code.',
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await verifyAndActivateCode(code, accountName);
    setLoading(false);
    setStatus(result);

    if (result.success) {
      setTimeout(() => {
        onActivated();
      }, 1000);
    }
  };

  const handleGenerateCodes = async () => {
    const newCodes: string[] = [];
    for (let i = 0; i < genCount; i++) {
      newCodes.push(generateRandomCode('TRV'));
    }
    setGeneratedCodes(newCodes);

    setSavingCodes(true);
    setGenMessage(null);
    const res = await createLicensesInSupabase(newCodes);
    setSavingCodes(false);

    if (res.success) {
      setGenMessage({
        success: true,
        text: isIt
          ? `${res.createdCount} codice/i generato/i e salvato/i con successo in Supabase!`
          : `${res.createdCount} code(s) generated and saved in Supabase!`,
      });
      if (showList) loadLicenses();
    } else {
      setGenMessage({
        success: false,
        text: isIt
          ? `Codici generati localmente. Nota Supabase: ${res.message}`
          : `Generated locally. Supabase note: ${res.message}`,
      });
    }
  };

  const loadLicenses = async () => {
    setLoadingList(true);
    const list = await fetchAllLicensesFromSupabase();
    setLicensesList(list);
    setLoadingList(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_LICENSES_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(EXTERNAL_GENERATOR_HTML_CODE);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    setCopiedGenerated(true);
    setTimeout(() => setCopiedGenerated(false), 2000);
  };

  return (
    <div
      className={`fixed inset-0 grid place-items-center z-[200] p-3 sm:p-4 overflow-y-auto ${
        isOverlay ? 'bg-[#0B172A]/90 backdrop-blur-md' : 'bg-[#0B172A]/60 backdrop-blur-xs'
      }`}
    >
      <div className="bg-[var(--card)] border border-[var(--line)] w-full max-w-lg rounded-[22px] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0F2847] to-[#16365C] p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-[#12B5A5]/20 border border-[#12B5A5]/40 rounded-2xl mx-auto grid place-items-center mb-3 text-[#12B5A5] shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {isIt ? 'Sblocca Travly' : 'Unlock Travly'}
          </h2>
          <p className="text-xs text-[#9FB1CE] mt-1 max-w-sm mx-auto leading-relaxed">
            {isIt
              ? 'Inserisci il codice di licenza acquistato per sbloccare tutte le funzionalità di Travly sul tuo dispositivo.'
              : 'Enter your purchased license key to unlock all features of Travly on your device.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? 'Codice di Attivazione' : 'Activation Code'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TRV-XXXX-XXXX-XXXX"
                  className="w-full bg-[var(--soft)] border-2 border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] px-4 py-3.5 text-center text-base sm:text-lg font-mono font-bold tracking-widest text-[var(--ink)] uppercase outline-none transition-all placeholder:text-[var(--sub)]/40 shadow-inner"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-[var(--sub)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {status && (
              <div
                className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-start gap-2.5 ${
                  status.success
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                }`}
              >
                {status.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isIt ? 'Verifica in corso...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isIt ? 'Attiva e Inizia' : 'Activate & Continue'}</span>
                </>
              )}
            </button>
          </form>

          {/* Master / Offline hint info */}
          <div className="pt-2 border-t border-[var(--hair)] flex items-center justify-between text-[11px] text-[var(--sub)] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#12B5A5]" />
              {isIt ? 'Licenza personale e sicura' : 'Personal & secure license'}
            </span>

            <button
              type="button"
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-[var(--sub)] hover:text-[var(--ink)] font-bold underline flex items-center gap-1 cursor-pointer"
            >
              {isIt ? 'Area Admin / Generatore' : 'Admin / Generator'}
              {showAdmin ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Admin & Code Generator Tool Section */}
          {showAdmin && (
            <div className="mt-4 p-4 rounded-[16px] bg-[var(--soft)] border border-[var(--line)] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-[#12B5A5]" />
                  {isIt ? 'Generatore Codici Licenza' : 'License Code Generator'}
                </h4>
                <span className="text-[10px] bg-[#12B5A5]/15 text-[#12B5A5] font-extrabold px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              </div>

              {/* Quick Generator controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--sub)]">
                    {isIt ? 'Quantità:' : 'Quantity:'}
                  </span>
                  {[1, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenCount(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        genCount === num
                          ? 'bg-[#12B5A5] text-white'
                          : 'bg-[var(--card)] border border-[var(--line)] text-[var(--sub)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {num} {num === 1 ? (isIt ? 'Codice' : 'Code') : (isIt ? 'Codici' : 'Codes')}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleGenerateCodes}
                    disabled={savingCodes}
                    className="ml-auto px-3.5 py-1.5 bg-[#12B5A5] text-white text-xs font-bold rounded-lg hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingCodes ? (isIt ? 'Salvataggio...' : 'Saving...') : (isIt ? 'Genera' : 'Generate')}</span>
                  </button>
                </div>

                {genMessage && (
                  <div
                    className={`text-[11.5px] p-2.5 rounded-lg border ${
                      genMessage.success
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    }`}
                  >
                    {genMessage.text}
                  </div>
                )}

                {generatedCodes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--sub)]">
                      <span>{isIt ? 'Codici Generati:' : 'Generated Codes:'}</span>
                      <button
                        type="button"
                        onClick={handleCopyGenerated}
                        className="text-[#12B5A5] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedGenerated ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedGenerated ? (isIt ? 'Copiati!' : 'Copied!') : (isIt ? 'Copia Tutti' : 'Copy All')}</span>
                      </button>
                    </div>
                    <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-2.5 text-xs font-mono text-[#12B5A5] space-y-1 max-h-32 overflow-y-auto select-all">
                      {generatedCodes.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => setCode(c)}
                            className="text-[10px] text-[var(--sub)] hover:text-[var(--ink)] underline cursor-pointer"
                          >
                            {isIt ? 'Usa per test' : 'Use'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Supabase License SQL Script Accordion */}
              <div className="pt-2 border-t border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
                  <span>{isIt ? '1. Script SQL Tabella Supabase' : '1. Supabase SQL Table Script'}</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="text-xs text-[#12B5A5] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? (isIt ? 'Copiato!' : 'Copied!') : (isIt ? 'Copia SQL' : 'Copy SQL')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[var(--sub)] leading-snug">
                  {isIt
                    ? 'Esegui questo script nell\'editor SQL del tuo progetto Supabase per creare la tabella `travly_licenses`.'
                    : 'Run this script in your Supabase SQL Editor to create the `travly_licenses` table.'}
                </p>
              </div>

              {/* Standalone HTML Page for external generator domain */}
              <div className="pt-2 border-t border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
                  <span>{isIt ? '2. Pagina HTML per Altro Dominio' : '2. HTML Code for External Domain'}</span>
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="text-xs text-[#12B5A5] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? (isIt ? 'Copiato!' : 'Copied!') : (isIt ? 'Copia HTML' : 'Copy HTML')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[var(--sub)] leading-snug">
                  {isIt
                    ? 'Puoi incollare questo file HTML su un altro tuo sito/dominio dove i clienti acquistano: genererà ed inserirà i codici direttamente nel tuo Supabase!'
                    : 'Copy this standalone HTML file to host on your sales domain to generate and store valid codes directly into Supabase.'}
                </p>
              </div>

              {/* List of active licenses */}
              <div className="pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowList(!showList)}
                  className="text-xs font-bold text-[var(--ink)] hover:text-[#12B5A5] flex items-center gap-1.5 cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{isIt ? 'Visualizza Lista Codici in Supabase' : 'View Licenses List in Supabase'}</span>
                  {showList ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>

                {showList && (
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={loadLicenses}
                      disabled={loadingList}
                      className="text-[11px] text-[#12B5A5] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                      <span>{isIt ? 'Aggiorna Lista' : 'Refresh List'}</span>
                    </button>

                    {licensesList.length > 0 ? (
                      <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl max-h-40 overflow-y-auto divide-y divide-[var(--line)]">
                        {licensesList.map((lic) => (
                          <div key={lic.code} className="p-2 text-[11px] flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-[var(--ink)]">{lic.code}</div>
                              <div className="text-[10px] text-[var(--sub)]">
                                {lic.used_at ? new Date(lic.used_at).toLocaleDateString() : 'Non usato'}
                                {lic.used_by && ` • ${lic.used_by}`}
                              </div>
                            </div>
                            <span
                              className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                                lic.is_used
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : 'bg-emerald-500/15 text-emerald-500'
                              }`}
                            >
                              {lic.is_used ? (isIt ? 'Usato' : 'Used') : (isIt ? 'Disponibile' : 'Available')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--sub)] italic">
                        {loadingList
                          ? isIt ? 'Caricamento licenze...' : 'Loading licenses...'
                          : isIt ? 'Nessun codice trovato in Supabase.' : 'No codes found in Supabase.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
