import React, { useState, useEffect } from 'react';
import {
  Code,
  Copy,
  Check,
  Plus,
  RefreshCw,
  List,
  ExternalLink,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Database,
  Search,
} from 'lucide-react';
import { Language } from '../types';
import {
  generateRandomCode,
  createLicensesInSupabase,
  fetchAllLicensesFromSupabase,
  SUPABASE_LICENSES_SQL_SCRIPT,
  EXTERNAL_GENERATOR_HTML_CODE,
  LicenseItem,
} from '../utils/license';

interface AdminGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AdminGeneratorModal: React.FC<AdminGeneratorModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  // Admin authentication state
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('travly_admin_authed') === 'true';
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Generator state
  const [genCount, setGenCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [savingCodes, setSavingCodes] = useState(false);
  const [genMessage, setGenMessage] = useState<{ success?: boolean; text?: string } | null>(null);

  // Copy status
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState<string | null>(null);

  // Licenses list & filtering state
  const [licensesList, setLicensesList] = useState<LicenseItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showList, setShowList] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'used'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadLicenses();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const isIt = lang === 'it';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'CIUCCIO') {
      setIsAuthenticated(true);
      sessionStorage.setItem('travly_admin_authed', 'true');
      setAuthError(null);
      setPasswordInput('');
      loadLicenses();
    } else {
      setAuthError(isIt ? 'Password errata! Accesso negato.' : 'Incorrect password! Access denied.');
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
          ? `${res.createdCount} codice/i generato/i e salvato/i in Supabase!`
          : `${res.createdCount} code(s) generated and saved in Supabase!`,
      });
      loadLicenses();
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

  const handleCopySingleCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSingle(code);
    setTimeout(() => setCopiedSingle(null), 2000);
  };

  // Filter calculations
  const availableLicenses = licensesList.filter((l) => !l.is_used);
  const usedLicenses = licensesList.filter((l) => l.is_used);

  const filteredLicenses = licensesList.filter((l) => {
    if (filterMode === 'available' && l.is_used) return false;
    if (filterMode === 'used' && !l.is_used) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = l.code.toLowerCase().includes(q);
      const matchUser = l.used_by?.toLowerCase().includes(q);
      return matchCode || matchUser;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-[#0B172A]/85 backdrop-blur-md grid place-items-center z-[250] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-[var(--line)] w-full max-w-2xl rounded-[22px] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0F2847] to-[#16365C] p-5 text-white flex items-center justify-between border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#12B5A5]/20 border border-[#12B5A5]/40 rounded-xl grid place-items-center text-[#12B5A5]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">{isIt ? 'Pannello Admin Licenze' : 'Admin License Panel'}</h3>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  RISERVATO OWNER
                </span>
              </div>
              <p className="text-xs text-[#9FB1CE]">
                {isIt ? 'Generazione e tracciamento codici per i clienti' : 'Code generation & tracking for clients'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PASSWORD GATE SCREEN */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl mx-auto grid place-items-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-[var(--ink)]">
                {isIt ? 'Area Admin Protetta da Password' : 'Password Protected Admin Area'}
              </h4>
              <p className="text-xs text-[var(--sub)] mt-1 max-w-md mx-auto">
                {isIt
                  ? 'Inserisci la password riservata per accedere alla generazione codici e al controllo licenze.'
                  : 'Enter the master password to access code generation and license management.'}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="max-w-sm mx-auto space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password Admin (es. CIUCCIO)"
                  className="w-full bg-[var(--soft)] border-2 border-[var(--line)] focus:border-[#12B5A5] rounded-xl px-4 py-3 text-center text-base font-bold text-[var(--ink)] tracking-widest outline-none transition-all placeholder:text-[var(--sub)]/50 shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isIt ? 'Sblocca Area Admin' : 'Unlock Admin Area'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN PANEL */
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Database Separation Info Banner */}
            <div className="p-3.5 rounded-xl bg-[#12B5A5]/10 border border-[#12B5A5]/30 text-xs space-y-1">
              <div className="font-extrabold text-[#12B5A5] flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>{isIt ? 'Database Isolato per Licenze:' : 'Isolated Licenses Database:'}</span>
              </div>
              <p className="text-[var(--sub)] leading-relaxed">
                {isIt
                  ? 'I codici licenza sono salvati nella tabella separata `travly_licenses`, completamente distinta dai dati di viaggio dei clienti (`travly_backups`).'
                  : 'License keys are stored in the dedicated `travly_licenses` table, completely isolated from user trip backups (`travly_backups`).'}
              </p>
            </div>

            {/* Quick Generator controls */}
            <div className="p-4 rounded-[16px] bg-[var(--soft)] border border-[var(--line)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)] uppercase tracking-wider">
                  {isIt ? 'Genera Nuovi Codici Licenza:' : 'Generate New License Keys:'}
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 5, 10, 25].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenCount(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        genCount === num
                          ? 'bg-[#12B5A5] text-white shadow-xs'
                          : 'bg-[var(--card)] border border-[var(--line)] text-[var(--sub)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {num} {num === 1 ? 'Codice' : 'Codici'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateCodes}
                disabled={savingCodes}
                className="w-full py-2.5 bg-[#12B5A5] hover:bg-[#0EA294] text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {savingCodes
                    ? (isIt ? 'Salvataggio in Supabase...' : 'Saving in Supabase...')
                    : (isIt ? `Genera e Salva ${genCount} Codice/i in Supabase` : `Generate & Save ${genCount} Code(s)`)}
                </span>
              </button>

              {genMessage && (
                <div
                  className={`text-xs p-2.5 rounded-lg border flex items-center gap-2 ${
                    genMessage.success
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{genMessage.text}</span>
                </div>
              )}

              {generatedCodes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--sub)]">
                    <span>{isIt ? 'Codici appena creati (da inviare al cliente):' : 'Newly created keys:'}</span>
                    <button
                      type="button"
                      onClick={handleCopyGenerated}
                      className="text-[#12B5A5] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedGenerated ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGenerated ? (isIt ? 'Copiati!' : 'Copied!') : (isIt ? 'Copia Tutti' : 'Copy All')}</span>
                    </button>
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 text-xs font-mono text-[#12B5A5] space-y-1.5 max-h-32 overflow-y-auto select-all">
                    {generatedCodes.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5">
                        <span className="font-extrabold tracking-wider">{c}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySingleCode(c)}
                          className="text-[10px] text-[var(--sub)] hover:text-[var(--ink)] underline cursor-pointer"
                        >
                          {copiedSingle === c ? 'Copiato!' : 'Copia'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STATUS SUMMARY & FILTER TABS */}
            <div className="space-y-3 pt-2 border-t border-[var(--line)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-[var(--ink)] uppercase tracking-wider">
                    {isIt ? 'Stato Licenze in Supabase' : 'Supabase License Keys'}
                  </h4>
                  <button
                    type="button"
                    onClick={loadLicenses}
                    disabled={loadingList}
                    className="text-[11px] text-[#12B5A5] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                    <span>{isIt ? 'Aggiorna' : 'Refresh'}</span>
                  </button>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-[var(--soft)] p-1 rounded-xl border border-[var(--line)] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-[#12B5A5] text-white shadow-xs'
                        : 'text-[var(--sub)] hover:text-[var(--ink)]'
                    }`}
                  >
                    Tutti ({licensesList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('available')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      filterMode === 'available'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <span>🟢 Disponibili</span>
                    <span>({availableLicenses.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('used')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      filterMode === 'used'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <span>🔴 Già Usati</span>
                    <span>({usedLicenses.length})</span>
                  </button>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isIt ? 'Cerca codice o dispositivo cliente...' : 'Search code or client device...'}
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--ink)] outline-none"
                />
              </div>

              {/* License List view */}
              {filteredLicenses.length > 0 ? (
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl max-h-56 overflow-y-auto divide-y divide-[var(--line)]">
                  {filteredLicenses.map((lic) => (
                    <div key={lic.code} className="p-3 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[var(--ink)] tracking-wider text-sm">
                            {lic.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopySingleCode(lic.code)}
                            className="p-1 text-[var(--sub)] hover:text-[#12B5A5] transition-colors cursor-pointer"
                            title="Copia codice"
                          >
                            {copiedSingle === lic.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {lic.is_used ? (
                          <div className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1.5">
                            <span className="shrink-0">📱 Utilizzato da:</span>
                            <span className="truncate font-semibold text-[var(--ink)]">{lic.used_by || 'Dispositivo registrato'}</span>
                            {lic.used_at && (
                              <span className="text-[10px] text-[var(--sub)] shrink-0">
                                ({new Date(lic.used_at).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-400/90 font-medium">
                            🟢 Pronto per la vendita / In attesa di attivazione cliente
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase shrink-0 ${
                          lic.is_used
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {lic.is_used ? (isIt ? '🔴 GIÀ USATO' : '🔴 USED') : (isIt ? '🟢 DISPONIBILE' : '🟢 AVAILABLE')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[var(--sub)] italic p-4 text-center bg-[var(--soft)] rounded-xl border border-[var(--line)]">
                  {loadingList
                    ? (isIt ? 'Caricamento licenze in corso...' : 'Loading licenses...')
                    : (isIt ? 'Nessun codice trovato con i filtri selezionati.' : 'No codes found matching criteria.')}
                </div>
              )}
            </div>

            {/* SQL & HTML Exports */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
              <div className="p-3 rounded-xl bg-[var(--soft)] border border-[var(--line)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">1. Script SQL Supabase</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="text-[11px] text-[#12B5A5] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copiato!' : 'Copia SQL'}</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-[var(--sub)] leading-tight">
                  Crea la tabella `travly_licenses` nell'editor SQL di Supabase.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--soft)] border border-[var(--line)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">2. Generatore Esterno</span>
                  <a
                    href="/generator.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#12B5A5] font-extrabold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Apri /generator.html</span>
                  </a>
                </div>
                <p className="text-[10.5px] text-[var(--sub)] leading-tight">
                  Pagina web autonoma con password `CIUCCIO` da ospitare sul sito di vendita.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
