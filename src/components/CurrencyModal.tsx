import React, { useState, useEffect } from 'react';
import { Currency, Language } from '../types';
import { defRate } from '../constants/translations';
import { t } from '../utils/calculations';

interface CurrencyModalProps {
  pendingCurrency: { from: Currency; to: Currency } | null;
  lang: Language;
  onConvert: (rate: number) => void;
  onRelabel: () => void;
  onCancel: () => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  pendingCurrency,
  lang,
  onConvert,
  onRelabel,
  onCancel,
}) => {
  const [rateStr, setRateStr] = useState<string>('1');

  useEffect(() => {
    if (pendingCurrency) {
      const r = defRate(pendingCurrency.from, pendingCurrency.to);
      setRateStr(String(Math.round(r * 10000) / 10000));
    }
  }, [pendingCurrency]);

  if (!pendingCurrency) return null;

  const handleConvertClick = () => {
    const r = parseFloat(rateStr);
    if (!(r > 0)) return;
    onConvert(r);
  };

  return (
    <div
      className="ov fixed inset-0 bg-[#0B1B3A]/50 grid place-items-center z-[100] p-5"
      onClick={onCancel}
    >
      <div
        className="dlg bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-2xl p-6 max-w-[430px] w-full text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-extrabold tracking-tight">{t('cur_title', lang)}</h3>
        <div className="q text-[14px] text-[var(--sub)] mt-1.5 leading-relaxed">
          {t('cur_q', lang)
            .replace('{a}', pendingCurrency.from)
            .replace('{b}', pendingCurrency.to)}
        </div>

        <div className="rate-box flex items-center gap-2.5 bg-[var(--soft)] border border-[var(--hair)] rounded-[13px] p-[13px_15px] mt-4">
          <label className="text-[12px] font-bold text-[var(--sub)] whitespace-nowrap">
            1 {pendingCurrency.from} =
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={rateStr}
            onChange={(e) => setRateStr(e.target.value)}
            className="num flex-1 min-w-0 border border-[var(--line)] bg-[var(--card)] rounded-[9px] p-[8px_10px] font-mono font-bold text-[15px] text-right focus:border-[var(--horizon)] outline-none"
          />
        </div>

        <div className="hint text-[13px] text-[var(--sub)] leading-normal mt-2">
          {t('cur_note', lang)}
        </div>

        <div className="dlg-acts flex flex-col gap-2 mt-4 sm:flex-row">
          <button
            onClick={handleConvertClick}
            className="btn primary flex-1 rounded-[11px] p-[11px_15px] text-[13.5px] font-bold bg-[#12B5A5] border border-[#12B5A5] text-[#06231f] hover:brightness-105 cursor-pointer"
          >
            {t('cur_convert', lang)}
          </button>
          <button
            onClick={onRelabel}
            className="btn flex-1 rounded-[11px] p-[11px_15px] text-[13.5px] font-bold border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--horizon)] cursor-pointer"
          >
            {t('cur_relabel', lang)}
          </button>
          <button
            onClick={onCancel}
            className="btn rounded-[11px] p-[11px_15px] text-[13.5px] font-bold border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] hover:border-[var(--horizon)] cursor-pointer"
          >
            {t('cancel', lang)}
          </button>
        </div>

        <div className="hint text-[12px] text-[var(--sub)] leading-normal mt-2.5">
          {t('cur_relabel_hint', lang)}
        </div>
      </div>
    </div>
  );
};
