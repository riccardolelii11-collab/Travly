import React from 'react';
import { ComputedMetrics, ContributorItem, TripData } from '../types';
import { TEAMC } from '../constants/translations';
import { fmt, NUM, t } from '../utils/calculations';

interface TeamPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateContributor: (index: number, field: keyof ContributorItem, val: string) => void;
  onDeleteContributor: (index: number) => void;
  onAddContributor: () => void;
  onShowTip: (el: HTMLElement, tipText: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({
  state,
  metrics: d,
  onUpdateContributor,
  onDeleteContributor,
  onAddContributor,
  onShowTip,
}) => {
  const lang = state.lang;
  const currency = state.currency;
  const C = state.contributors;

  const shareSum = C.reduce((a, c) => a + NUM(c.share), 0);
  const sumColor = Math.abs(shareSum - 100) < 0.5 ? 'var(--green)' : 'var(--amber)';

  return (
    <div className="space-y-5">
      <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight">
            {t('team_title', lang)}
          </h2>
          <div className="hint text-[13px] text-[var(--sub)] leading-snug">
            {t('team_sub', lang)}
          </div>
        </div>
      </div>

      {/* Summary Minis */}
      <div className="minis grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-[20px]">
        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight">
            {fmt(d.total, currency, lang)}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('combined_target', lang)}
          </div>
        </div>

        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight">
            {fmt(d.saved, currency, lang)}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('combined_saved', lang)}
          </div>
        </div>

        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div
            className="n num text-[22px] font-bold font-mono tracking-tight flex items-center gap-1.5"
            style={{ color: sumColor }}
          >
            <span>{Math.round(shareSum)}%</span>
            <button
              onClick={(e) =>
                onShowTip(e.currentTarget, t('tip_share', lang))
              }
              className="info border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:border-[var(--horizon)] hover:text-[var(--horizon-deep)]"
              aria-label="?"
            >
              ?
            </button>
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('share_sum', lang)}
          </div>
        </div>
      </div>

      {/* Contributors List */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
        {C.map((c, i) => {
          const share = NUM(c.share);
          const target = (d.total * share) / 100;
          const pSaved = state.savings
            .filter((s) => (s.who || 0) === i)
            .reduce((a, s) => a + NUM(s.amount), 0);
          const prog = target > 0 ? Math.min(pSaved / target, 1) : 0;
          const col = TEAMC[i % TEAMC.length];
          const initial =
            (c.name || '?').trim().charAt(0).toUpperCase() || '?';

          return (
            <div
              key={i}
              className="contrib flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-[14px] py-3.5 border-b border-[var(--hair)] last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className="avatar w-[42px] h-[42px] rounded-[13px] grid place-items-center text-white font-extrabold text-[16px] flex-none shadow-sm"
                    style={{ background: col }}
                  >
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        onUpdateContributor(i, 'name', e.target.value)
                      }
                      placeholder={t('name_ph', lang)}
                      className="border border-transparent bg-transparent rounded-lg text-[15px] font-bold p-[4px_6px] w-full max-w-[170px] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none transition-colors"
                    />
                    <div className="share-pill flex items-center gap-[4px] bg-[var(--soft)] border border-[var(--hair)] rounded-[9px] px-[9px] py-[3px]">
                      <input
                        className="num w-[40px] text-right font-mono font-bold bg-transparent outline-none"
                        inputMode="decimal"
                        value={c.share}
                        onChange={(e) =>
                          onUpdateContributor(i, 'share', e.target.value)
                        }
                      />
                      <span className="text-[var(--sub)] font-bold text-[13px]">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-[12px] mt-[10px]">
                  <div className="bar h-[6px] rounded-full bg-[var(--hair)] overflow-hidden flex-1 max-w-[300px]">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${(prog * 100).toFixed(1)}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <span className="num tgt text-[13px] font-bold font-mono whitespace-nowrap">
                    {fmt(pSaved, currency, lang)}{' '}
                    <span className="text-[var(--sub)] font-semibold">
                      / {fmt(target, currency, lang)}
                    </span>
                  </span>
                </div>
              </div>

              {C.length > 1 && (
                <button
                  onClick={() => onDeleteContributor(i)}
                  className="del self-end sm:self-center border-none bg-transparent text-[var(--muted)] text-[16px] w-[30px] h-[30px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onAddContributor}
          className="add-row inline-flex items-center gap-[8px] border border-dashed border-[var(--line)] bg-transparent text-[var(--horizon-deep)] rounded-[11px] p-[10px_16px] text-[13.5px] font-bold mt-[14px] hover:border-[var(--horizon)] hover:bg-[var(--soft)] cursor-pointer transition-colors"
        >
          ＋ {t('add_person', lang)}
        </button>
      </div>
    </div>
  );
};
