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
    if (isOpen && showList) {
      loadLicenses();
    }
  }, [isOpen, showList]);

  if (!isOpen) return null;

  const isIt = lang === 'it';

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
    <div className="fixed inset-0 bg-[#0B172A]/80 backdrop-blur-md grid place-items-center z-[250] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-[var(--line)] w-full max-w-xl rounded-[22px] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2847] to-[#16365C] p-5 text-white flex items-center justify-between border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#12B5A5]/20 border border-[#12B5A5]/40 rounded-xl grid place-items-center text-[#12B5A5]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">{isIt ? 'Generatore Licenze Travly' : 'Travly License Generator'}</h3>
                <span className="bg-[#12B5A5]/20 text-[#12B5A5] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-[#9FB1CE]">{isIt ? 'Gestione esclusiva del proprietario' : 'Exclusive owner management'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* External standalone HTML info */}
          <div className="p-3.5 rounded-xl bg-[#12B5A5]/10 border border-[#12B5A5]/30 text-xs space-y-1">
            <div className="font-extrabold text-[#12B5A5] flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4" />
              <span>{isIt ? 'Sito Esterno per la vendita:' : 'External Sales Domain:'}</span>
            </div>
            <p className="text-[var(--sub)] leading-relaxed">
              {isIt
                ? 'Puoi caricare la pagina standalone scaricabile o visitare direttamente '
                : 'You can host the standalone HTML page or access directly '}
              <a
                href="/generator.html"
                target="_blank"
                rel="noreferrer"
                className="text-[#12B5A5] underline font-bold"
              >
                /generator.html
              </a>
              {isIt ? ' per generare i codici da qualsiasi altro tuo dominio!' : ' to generate codes from any external site!'}
            </p>
          </div>

          {/* Quick Generator controls */}
          <div className="p-4 rounded-[16px] bg-[var(--soft)] border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)]">
                {isIt ? 'Genera Nuovi Codici Licenza:' : 'Generate New License Codes:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGenCount(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      genCount === num
                        ? 'bg-[#12B5A5] text-white'
                        : 'bg-[var(--card)] border border-[var(--line)] text-[var(--sub)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateCodes}
              disabled={savingCodes}
              className="w-full py-2.5 bg-[#12B5A5] hover:bg-[#0EA294] text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savingCodes
                  ? (isIt ? 'Salvataggio in Supabase...' : 'Saving in Supabase...')
                  : (isIt ? `Genera e Salva ${genCount} Codice/i` : `Generate and Save ${genCount} Code(s)`)}
              </span>
            </button>

            {genMessage && (
              <div
                className={`text-xs p-2.5 rounded-lg border ${
                  genMessage.success
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                }`}
              >
                {genMessage.text}
              </div>
            )}

            {generatedCodes.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-[var(--sub)]">
                  <span>{isIt ? 'Codici appena creati:' : 'Newly created codes:'}</span>
                  <button
                    type="button"
                    onClick={handleCopyGenerated}
                    className="text-[#12B5A5] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedGenerated ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGenerated ? (isIt ? 'Copiati!' : 'Copied!') : (isIt ? 'Copia Tutti' : 'Copy All')}</span>
                  </button>
                </div>
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 text-xs font-mono text-[#12B5A5] space-y-1.5 max-h-32 overflow-y-auto select-all">
                  {generatedCodes.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copy SQL Script */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--soft)] border border-[var(--line)]">
            <div>
              <div className="text-xs font-bold text-[var(--ink)]">
                {isIt ? 'Script SQL Tabella Supabase' : 'Supabase Table SQL Script'}
              </div>
              <div className="text-[11px] text-[var(--sub)]">
                {isIt ? 'Crea la tabella `travly_licenses` in Supabase' : 'Creates `travly_licenses` table in Supabase'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-[#12B5A5] text-white text-xs font-extrabold rounded-lg hover:brightness-105 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? (isIt ? 'Copiato!' : 'Copied!') : (isIt ? 'Copia SQL' : 'Copy SQL')}</span>
            </button>
          </div>

          {/* Copy HTML Code for External Domain */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--soft)] border border-[var(--line)]">
            <div>
              <div className="text-xs font-bold text-[var(--ink)]">
                {isIt ? 'File HTML Generatore Esterno' : 'External Domain HTML File'}
              </div>
              <div className="text-[11px] text-[var(--sub)]">
                {isIt ? 'Incolla questo codice HTML sul tuo sito di vendita' : 'Paste this HTML code into your sales domain'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyHtml}
              className="px-3 py-1.5 bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/40 text-xs font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-[#12B5A5]" />}
              <span>{copiedHtml ? (isIt ? 'Copiato!' : 'Copied!') : (isIt ? 'Copia Codice HTML' : 'Copy HTML Code')}</span>
            </button>
          </div>

          {/* List of active licenses */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setShowList(!showList);
                if (!showList) loadLicenses();
              }}
              className="w-full py-2 bg-[var(--soft)] hover:bg-[var(--line)]/30 border border-[var(--line)] text-xs font-bold text-[var(--ink)] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <List className="w-4 h-4 text-[#12B5A5]" />
              <span>{isIt ? 'Mostra/Nascondi Tutti i Codici Salvati in Supabase' : 'Toggle All Licenses in Supabase'}</span>
            </button>

            {showList && (
              <div className="mt-3 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-[var(--sub)] font-semibold">
                  <span>{isIt ? 'Elenco Codici nel Database:' : 'Database License List:'}</span>
                  <button
                    type="button"
                    onClick={loadLicenses}
                    disabled={loadingList}
                    className="text-[#12B5A5] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                    <span>{isIt ? 'Ricarica' : 'Reload'}</span>
                  </button>
                </div>

                {licensesList.length > 0 ? (
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl max-h-48 overflow-y-auto divide-y divide-[var(--line)]">
                    {licensesList.map((lic) => (
                      <div key={lic.code} className="p-2.5 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-[var(--ink)]">{lic.code}</div>
                          <div className="text-[10.5px] text-[var(--sub)]">
                            {lic.used_at ? new Date(lic.used_at).toLocaleDateString() : 'Non utilizzato'}
                            {lic.used_by && ` • ${lic.used_by}`}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            lic.is_used
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-emerald-500/15 text-emerald-500'
                          }`}
                        >
                          {lic.is_used ? (isIt ? 'Usato' : 'Used') : (isIt ? 'Attivo / Libero' : 'Available')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--sub)] italic p-3 text-center bg-[var(--soft)] rounded-xl">
                    {loadingList
                      ? (isIt ? 'Caricamento codici...' : 'Loading codes...')
                      : (isIt ? 'Nessun codice trovato in Supabase.' : 'No codes found in Supabase.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
