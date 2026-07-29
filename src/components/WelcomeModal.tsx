import React, { useState } from 'react';
import { Language } from '../types';
import { catName, NUM, t } from '../utils/calculations';
import { CATS } from '../constants/translations';
import { TRIP_TEMPLATES, TripTemplate } from '../constants/templates';

export interface OnboardingResult {
  destination: string;
  departure: string;
  returnDate: string;
  estimatedBudget: number;
  templateKey: string;
  contributors: { name: string; sharePct: number }[];
  budgetAllocations: { key: string; amount: number }[];
}

interface WelcomeModalProps {
  isOpen: boolean;
  lang: Language;
  onStartMyTrip: (result: OnboardingResult) => void;
  onExploreDemo: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  lang,
  onStartMyTrip,
  onExploreDemo,
}) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [destination, setDestination] = useState<string>('');
  const [departure, setDeparture] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('1500');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('city');

  // Contributors State
  const [contributorsList, setContributorsList] = useState<string[]>([
    lang === 'it' ? 'Io' : 'Me',
  ]);
  const [newContribName, setNewContribName] = useState<string>('');

  if (!isOpen) return null;

  const currentBudgetNum = NUM(estimatedBudget);

  const handleAddContributor = () => {
    if (!newContribName.trim()) return;
    setContributorsList((prev) => [...prev, newContribName.trim()]);
    setNewContribName('');
  };

  const handleRemoveContributor = (idx: number) => {
    if (contributorsList.length <= 1) return;
    setContributorsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculateAllocations = (): { key: string; amount: number }[] => {
    const template = TRIP_TEMPLATES.find((t) => t.key === selectedTemplate);
    if (!template || currentBudgetNum <= 0) {
      return CATS.map((key) => ({ key, amount: 0 }));
    }

    return CATS.map((key) => {
      const pctWeight = template.allocations[key] || 0;
      const amount = Math.round((currentBudgetNum * pctWeight) / 100);
      return { key, amount };
    });
  };

  const handleFinish = () => {
    const allocations = calculateAllocations();
    const shareEach = Math.round(100 / Math.max(1, contributorsList.length));
    const finalContribs = contributorsList.map((name, i) => {
      // adjust last one for 100% total
      const sharePct =
        i === contributorsList.length - 1
          ? 100 - shareEach * (contributorsList.length - 1)
          : shareEach;
      return { name, sharePct };
    });

    onStartMyTrip({
      destination: destination.trim(),
      departure,
      returnDate,
      estimatedBudget: currentBudgetNum,
      templateKey: selectedTemplate,
      contributors: finalContribs,
      budgetAllocations: allocations,
    });
  };

  return (
    <div className="ov fixed inset-0 bg-black/50 backdrop-blur-xs grid place-items-center z-[100] p-4 overflow-y-auto">
      <div className="dlg bg-[var(--card)] border border-[var(--line)] rounded-[22px] shadow-2xl p-6 sm:p-7 max-w-[540px] w-full text-[var(--ink)] my-auto relative space-y-5">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#12B5A5] bg-[#12B5A5]/10 px-2.5 py-1 rounded-full">
              {t('w_wizard_title', lang)}
            </span>
            <h3 className="text-[19px] font-extrabold tracking-tight mt-1">
              {step === 1 && t('w_step1_title', lang)}
              {step === 2 && t('w_step2_title', lang)}
              {step === 3 && t('w_step3_title', lang)}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full grid place-items-center font-bold text-[12px] transition-all ${
                  s === step
                    ? 'bg-[#12B5A5] text-[#06231f] scale-110 shadow-xs'
                    : s < step
                    ? 'bg-[#12B5A5]/30 text-[#12B5A5]'
                    : 'bg-[var(--soft)] text-[var(--sub)]'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Destination */}
        {step === 1 && (
          <div className="space-y-4 animate-[fade_0.2s_ease]">
            <p className="text-[13.5px] text-[var(--sub)]">{t('w_step1_sub', lang)}</p>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                {t('destination', lang)}
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={lang === 'it' ? 'es. Giappone, Parigi, Barcellona...' : 'e.g. Japan, Paris, Bali...'}
                className="w-full text-[16px] font-bold p-3.5 bg-[var(--card)] border border-[var(--line)] rounded-[14px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
                autoFocus
              />
            </div>

            {/* Quick destination ideas */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
                {lang === 'it' ? 'Idee veloci:' : 'Quick ideas:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {['Giappone 🇯🇵', 'Parigi 🇫🇷', 'Bali 🇮🇩', 'New York 🇺🇸', 'Islanda 🇮🇸'].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setDestination(idea.split(' ')[0])}
                    className="px-3 py-1.5 bg-[var(--soft)] hover:bg-[#12B5A5]/10 hover:border-[#12B5A5]/30 border border-[var(--hair)] rounded-lg text-[12.5px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Dates */}
        {step === 2 && (
          <div className="space-y-4 animate-[fade_0.2s_ease]">
            <p className="text-[13.5px] text-[var(--sub)]">{t('w_step2_sub', lang)}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                  {t('departure', lang)}
                </label>
                <input
                  type="date"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full text-[14px] font-mono font-bold p-3 bg-[var(--card)] border border-[var(--line)] rounded-[14px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                  {t('travel_return_date', lang)}
                </label>
                <input
                  type="date"
                  value={returnDate}
                  min={departure || undefined}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full text-[14px] font-mono font-bold p-3 bg-[var(--card)] border border-[var(--line)] rounded-[14px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Style Template, Budget & Companions */}
        {step === 3 && (
          <div className="space-y-4 animate-[fade_0.2s_ease]">
            <p className="text-[13.5px] text-[var(--sub)]">{t('w_step3_sub', lang)}</p>

            {/* Estimated Budget Input */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                {lang === 'it' ? 'Budget stimato totale' : 'Total estimated budget'}
              </label>
              <input
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="1500"
                className="w-full text-[20px] font-mono font-bold p-3 bg-[var(--card)] border border-[var(--line)] rounded-[14px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
              />
            </div>

            {/* Template selector grid */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                {lang === 'it' ? 'Modello di viaggio' : 'Trip Preset Template'}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {TRIP_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.key;
                  return (
                    <button
                      key={tmpl.key}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.key)}
                      className={`p-2.5 rounded-[14px] border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#12B5A5]/10 border-[#12B5A5] ring-2 ring-[#12B5A5]/20'
                          : 'bg-[var(--soft)] border-[var(--hair)] hover:border-[var(--line)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[16px]">{tmpl.icon}</span>
                        <span className="text-[12.5px] font-extrabold text-[var(--ink)]">
                          {t(tmpl.titleKey, lang)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Companions / Contributors */}
            <div className="space-y-2 pt-1 border-t border-[var(--line)]">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)]">
                {t('team_title', lang)}
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {contributorsList.map((cName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--soft)] border border-[var(--hair)] rounded-full text-[12.5px] font-bold text-[var(--ink)]"
                  >
                    <span>{cName}</span>
                    {contributorsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContributor(idx)}
                        className="text-[var(--muted)] hover:text-[var(--red)] font-bold text-[12px] ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newContribName}
                  onChange={(e) => setNewContribName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContributor()}
                  placeholder={lang === 'it' ? '+ Aggiungi compagno (es. Marco)...' : '+ Add companion...'}
                  className="flex-1 text-[12.5px] font-medium p-2 bg-[var(--card)] border border-[var(--line)] rounded-[10px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
                />
                <button
                  type="button"
                  onClick={handleAddContributor}
                  className="px-3 py-2 bg-[var(--soft)] border border-[var(--line)] hover:border-[#12B5A5] text-[var(--ink)] font-bold text-[12px] rounded-[10px] cursor-pointer"
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] gap-2">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2.5 rounded-[12px] border border-[var(--line)] bg-[var(--soft)] hover:bg-[var(--card)] text-[13px] font-bold text-[var(--ink)] cursor-pointer transition-colors"
              >
                ← {t('w_btn_back', lang)}
              </button>
            ) : (
              <button
                type="button"
                onClick={onExploreDemo}
                className="px-3.5 py-2.5 rounded-[12px] border border-dashed border-[var(--line)] text-[12px] font-bold text-[var(--sub)] hover:text-[var(--ink)] hover:border-[var(--ink)] cursor-pointer transition-colors"
              >
                {t('w_demo_btn', lang)}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2.5 rounded-[12px] bg-[#12B5A5] hover:bg-[#0fa092] text-[#06231f] text-[13.5px] font-extrabold shadow-sm cursor-pointer transition-all"
              >
                {t('w_btn_next', lang)} →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-[12px] bg-[#12B5A5] hover:bg-[#0fa092] text-[#06231f] text-[14px] font-black shadow-md cursor-pointer transition-all flex items-center gap-1"
              >
                {t('w_btn_finish', lang)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
