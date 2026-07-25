import React from 'react';
import { Language } from '../types';
import { t } from '../utils/calculations';

interface WelcomeModalProps {
  isOpen: boolean;
  lang: Language;
  onStartMyTrip: () => void;
  onExploreDemo: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  lang,
  onStartMyTrip,
  onExploreDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="ov fixed inset-0 bg-[#0B1B3A]/50 grid place-items-center z-[100] p-5">
      <div className="dlg bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-2xl p-6 max-w-[430px] w-full text-[var(--ink)]">
        <h3 className="text-[17px] font-extrabold tracking-tight">{t('w_title', lang)}</h3>
        <div className="q text-[14px] text-[var(--sub)] mt-1.5 leading-relaxed">
          {t('w_sub', lang)}
        </div>

        <div className="w-steps flex flex-col gap-3 my-[18px]">
          <div className="w-step flex gap-3.5 items-start">
            <div className="n w-6.5 h-6.5 rounded-[9px] bg-[#12B5A5] text-[#06231f] flex-none grid place-items-center font-extrabold text-[13px]">
              1
            </div>
            <div>
              <div className="st text-[14px] font-bold">{t('w_s1', lang)}</div>
              <div className="sd text-[12.5px] text-[var(--sub)] leading-snug mt-0.5">
                {t('w_s1d', lang)}
              </div>
            </div>
          </div>

          <div className="w-step flex gap-3.5 items-start">
            <div className="n w-6.5 h-6.5 rounded-[9px] bg-[#12B5A5] text-[#06231f] flex-none grid place-items-center font-extrabold text-[13px]">
              2
            </div>
            <div>
              <div className="st text-[14px] font-bold">{t('w_s2', lang)}</div>
              <div className="sd text-[12.5px] text-[var(--sub)] leading-snug mt-0.5">
                {t('w_s2d', lang)}
              </div>
            </div>
          </div>

          <div className="w-step flex gap-3.5 items-start">
            <div className="n w-6.5 h-6.5 rounded-[9px] bg-[#12B5A5] text-[#06231f] flex-none grid place-items-center font-extrabold text-[13px]">
              3
            </div>
            <div>
              <div className="st text-[14px] font-bold">{t('w_s3', lang)}</div>
              <div className="sd text-[12.5px] text-[var(--sub)] leading-snug mt-0.5">
                {t('w_s3d', lang)}
              </div>
            </div>
          </div>
        </div>

        <div className="dlg-acts flex gap-2 flex-wrap mt-[18px]">
          <button
            onClick={onStartMyTrip}
            className="btn primary flex-1 rounded-[11px] p-[11px_15px] text-[13.5px] font-bold bg-[#12B5A5] border border-[#12B5A5] text-[#06231f] hover:brightness-105 cursor-pointer"
          >
            {t('w_start', lang)}
          </button>
          <button
            onClick={onExploreDemo}
            className="btn flex-1 rounded-[11px] p-[11px_15px] text-[13.5px] font-bold border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--horizon)] cursor-pointer"
          >
            {t('w_demo', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
