import React, { useState, useRef, useEffect } from 'react';
import { Currency, Language, Trip } from '../types';
import { CURRENCIES, T } from '../constants/translations';
import { t } from '../utils/calculations';

interface HeaderTopbarProps {
  trips: Trip[];
  activeId: string;
  tripLabel: string;
  destination: string;
  departure: string;
  returnDate?: string;
  weather?: string;
  currency: Currency;
  lang: Language;
  onSwitchTrip: (id: string) => void;
  onNewTrip: () => void;
  onUpdateTripLabel: (val: string) => void;
  onUpdateDestination: (val: string) => void;
  onUpdateDeparture: (val: string) => void;
  onUpdateReturnDate?: (val: string) => void;
  onUpdateWeather?: (val: string) => void;
  onRequestChangeCurrency: (newCurr: Currency) => void;
  onSelectLang: (lang: Language) => void;
  onSave: () => void;
  onDuplicateTrip: () => void;
  onDeleteTrip: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onOpenReport: () => void;
  onLoadExample: () => void;
  onHelp: () => void;
  onClear: () => void;
  onOpenSupabase: () => void;
  onOpenActivation?: () => void;
  onOpenAdminGenerator?: () => void;
  isSupabaseConfigured?: boolean;
}

export const HeaderTopbar: React.FC<HeaderTopbarProps> = ({
  trips,
  activeId,
  tripLabel,
  destination,
  departure,
  returnDate,
  weather,
  currency,
  lang,
  onSwitchTrip,
  onNewTrip,
  onUpdateTripLabel,
  onUpdateDestination,
  onUpdateDeparture,
  onUpdateReturnDate,
  onUpdateWeather,
  onRequestChangeCurrency,
  onSelectLang,
  onSave,
  onDuplicateTrip,
  onDeleteTrip,
  onBackup,
  onRestore,
  onExportCSV,
  onPrint,
  onOpenReport,
  onLoadExample,
  onHelp,
  onClear,
  onOpenSupabase,
  onOpenActivation,
  onOpenAdminGenerator,
  isSupabaseConfigured,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSaveClick = () => {
    onSave();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1600);
  };

  const getTripName = (tr: Trip) => tr.data.destination || t('untitled', lang);

  return (
    <header className="topbar flex items-stretch sm:items-end justify-between gap-3 sm:gap-4 flex-wrap mb-4 sm:mb-6">
      <div className="trip-id flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto bg-[var(--card)] sm:bg-transparent p-3.5 sm:p-0 border sm:border-0 border-[var(--line)] rounded-[16px] shadow-xs sm:shadow-none">
        {/* Trip selector dropdown */}
        <select
          value={activeId}
          onChange={(e) => {
            if (e.target.value === '__new') {
              onNewTrip();
            } else {
              onSwitchTrip(e.target.value);
            }
          }}
          className="chip trip-sel font-bold w-full sm:w-auto sm:max-w-[210px] bg-[var(--soft)] sm:bg-[var(--card)] border border-[var(--line)] rounded-[11px] p-[8px_12px] text-[13px] text-[var(--ink)] cursor-pointer"
        >
          {trips.map((x) => (
            <option key={x.id} value={x.id}>
              {getTripName(x)}
            </option>
          ))}
          <option value="__new">＋ {t('new_trip', lang)}</option>
        </select>

        <div className="divider hidden md:block w-[1px] h-[34px] bg-[var(--line)]" />

        {/* Editable Trip Label and Destination */}
        <div className="field min-w-0 flex-1 sm:flex-initial">
          <input
            value={tripLabel}
            onChange={(e) => onUpdateTripLabel(e.target.value)}
            className="lab-edit block text-[10.5px] font-bold uppercase tracking-widest text-[var(--sub)] p-[1px_4px] -ml-1 rounded-md w-full max-w-[230px] border-none bg-transparent hover:bg-[var(--soft)] focus:bg-[var(--soft)] outline-none"
            title="Modifica etichetta"
            maxLength={40}
          />
          <input
            id="destInput"
            value={destination}
            onChange={(e) => onUpdateDestination(e.target.value)}
            placeholder="—"
            className="dest text-[18px] sm:text-[24px] font-extrabold tracking-tight w-full max-w-[260px] border-none bg-transparent text-[var(--ink)] outline-none"
          />
        </div>

        <div className="divider hidden md:block w-[1px] h-[34px] bg-[var(--line)]" />

        {/* Departure date */}
        <div className="field flex items-center justify-between sm:block pt-1 sm:pt-0 border-t border-[var(--hair)] sm:border-0">
          <label className="block text-[10.5px] font-bold uppercase tracking-widest text-[var(--sub)] mb-[2px]">
            {t('departure', lang)}
          </label>
          <input
            type="date"
            value={departure}
            onChange={(e) => onUpdateDeparture(e.target.value)}
            className="date num text-[13.5px] sm:text-[15px] font-bold font-mono border border-[var(--hair)] sm:border-none bg-[var(--soft)] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none text-[var(--ink)] outline-none cursor-pointer"
          />
        </div>

        {/* Return date */}
        {onUpdateReturnDate && (
          <div className="field flex items-center justify-between sm:block pt-1 sm:pt-0 border-t border-[var(--hair)] sm:border-0">
            <label className="block text-[10.5px] font-bold uppercase tracking-widest text-[var(--sub)] mb-[2px]">
              {lang === 'it' ? 'Rientro' : 'Return'}
            </label>
            <input
              type="date"
              value={returnDate || ''}
              min={departure || undefined}
              onChange={(e) => onUpdateReturnDate(e.target.value)}
              className="date num text-[13.5px] sm:text-[15px] font-bold font-mono border border-[var(--hair)] sm:border-none bg-[var(--soft)] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none text-[var(--ink)] outline-none cursor-pointer"
            />
          </div>
        )}

        {/* Weather chip */}
        {weather && (
          <div className="hidden lg:flex items-center gap-1 text-[12px] font-extrabold bg-[#12B5A5]/10 text-[#12B5A5] px-2.5 py-1 rounded-full border border-[#12B5A5]/20">
            <span>{weather}</span>
          </div>
        )}
      </div>

      {/* Tools on the right */}
      <div className="tools flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center gap-2">
          {/* Currency selector */}
          <select
            value={currency}
            onChange={(e) => onRequestChangeCurrency(e.target.value as Currency)}
            className="chip border border-[var(--line)] bg-[var(--card)] rounded-[11px] p-[8px_10px] text-[12.5px] sm:text-[13px] font-bold text-[var(--ink)] cursor-pointer hover:border-[var(--horizon)] transition-colors"
            title="Valuta"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Language selector */}
          <select
            value={lang}
            onChange={(e) => onSelectLang(e.target.value as Language)}
            className="chip border border-[var(--line)] bg-[var(--card)] rounded-[11px] p-[8px_10px] text-[12.5px] sm:text-[13px] font-bold text-[var(--ink)] cursor-pointer hover:border-[var(--horizon)] transition-colors"
            title="Lingua"
          >
            <option value="it">IT</option>
            <option value="en">EN</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Backup & Cloud Restore button */}
          <button
            onClick={onOpenSupabase}
            className="chip border border-[#3ECF8E]/30 bg-[#3ECF8E]/10 rounded-[11px] p-[8px_11px] text-[12.5px] sm:text-[13px] font-bold text-[#3ECF8E] hover:bg-[#3ECF8E]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Gestisci e ripristina i backup salvati su Supabase"
          >
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-[#3ECF8E] shadow-[0_0_6px_#3ECF8E]' : 'bg-amber-400'}`} />
            <span className="hidden xs:inline">☁️ Cloud</span>
            <span className="xs:hidden">☁️</span>
          </button>

          {/* More Menu Dropdown */}
          <div className="menu-wrap relative" ref={moreMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((prev) => !prev);
              }}
              className="chip ghost border border-[var(--line)] bg-[var(--card)] rounded-[11px] p-[8px_11px] text-[12.5px] sm:text-[13px] font-bold text-[var(--sub)] hover:text-[var(--ink)] hover:border-[var(--horizon)] transition-colors cursor-pointer"
              aria-haspopup="true"
            >
              {t('more_lbl', lang)}
            </button>

            {moreOpen && (
              <div className="menu absolute right-0 top-[calc(100%+6px)] bg-[var(--card)] border border-[var(--line)] rounded-[13px] shadow-2xl p-1.5 min-w-[200px] max-w-[calc(100vw-24px)] z-50 flex flex-col gap-[1px]">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  onOpenSupabase();
                }}
                className="flex items-center justify-between w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <div className="flex items-center gap-[10px]">
                  <span className="w-[18px] text-center opacity-85 text-[#3ECF8E]">🗄</span>
                  <span>Database Supabase</span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSupabaseConfigured
                      ? 'bg-[#3ECF8E] shadow-[0_0_6px_#3ECF8E]'
                      : 'bg-amber-400'
                  }`}
                />
              </button>



              <div className="h-[1px] bg-[var(--hair)] my-[5px] mx-[4px]" />

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onDuplicateTrip();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">⧉</span>
                <span>{t('m_dup', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onDeleteTrip();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--red)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[rgba(214,72,59,0.09)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">🗑</span>
                <span>{t('m_del', lang)}</span>
              </button>

              <div className="h-[1px] bg-[var(--hair)] my-[5px] mx-[4px]" />

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onExportCSV();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">▤</span>
                <span>{t('m_csv', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onPrint();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">⎙</span>
                <span>{t('m_print', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onOpenReport();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">📊</span>
                <span>{t('m_report', lang)}</span>
              </button>

              <div className="h-[1px] bg-[var(--hair)] my-[5px] mx-[4px]" />

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onLoadExample();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">✦</span>
                <span>{t('m_example', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onHelp();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--ink)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">?</span>
                <span>{t('help', lang)}</span>
              </button>

              <a
                href="mailto:support.travly@gmail.com?subject=Assistenza%20Travly"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[#12B5A5] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[var(--soft)] cursor-pointer no-underline"
              >
                <span className="w-[18px] text-center opacity-90">✉</span>
                <span>{lang === 'it' ? 'Supporto & Assistenza' : 'Support & Help'}</span>
              </a>

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onClear();
                }}
                className="flex items-center gap-[10px] w-full text-left border-none bg-transparent text-[var(--red)] rounded-[9px] p-[10px_11px] text-[13.5px] font-semibold hover:bg-[rgba(214,72,59,0.09)] cursor-pointer"
              >
                <span className="w-[18px] text-center opacity-75">⌫</span>
                <span>{t('m_clear', lang)}</span>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={restoreInputRef}
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onRestore(file);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>
    </div>
    </header>
  );
};
