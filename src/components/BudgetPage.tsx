import React from 'react';
import { CategoryItem, ComputedMetrics, TripData } from '../types';
import { CATS, COLORS } from '../constants/translations';
import { catName, fmt, NUM, pct, t } from '../utils/calculations';

interface BudgetPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateCategoryName: (index: number, val: string) => void;
  onUpdateCategoryAmount: (index: number, val: string) => void;
  onDeleteCategory: (index: number) => void;
  onAddCategory: () => void;
  onUpdateReserve: (val: number) => void;
  onShowTip: (el: HTMLElement, tipText: string) => void;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({
  state,
  metrics: d,
  onUpdateCategoryName,
  onUpdateCategoryAmount,
  onDeleteCategory,
  onAddCategory,
  onUpdateReserve,
  onShowTip,
}) => {
  const lang = state.lang;
  const currency = state.currency;
  const reservePct = typeof state.reserve === 'number' ? state.reserve : (state.reserve ? 15 : 0);
  const reserveAmount = (d.baseTotal * reservePct) / 100;

  return (
    <div className="space-y-5">
      <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight">
            {t('budget_title', lang)}
          </h2>
          <div className="hint text-[13px] text-[var(--sub)] leading-snug">
            {t('budget_sub', lang)}
          </div>
        </div>
      </div>

      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[18px_16px] sm:p-[22px_24px]">
        <div className="overflow-x-auto rounded-xl border border-[var(--hair)] bg-[var(--card)]">
          <table className="tbl w-full border-collapse table-fixed min-w-[520px]">
            <colgroup>
              <col style={{ width: '220px' }} /> {/* CATEGORIA */}
              <col style={{ width: '130px' }} /> {/* IMPORTO */}
              <col style={{ width: '130px' }} /> {/* QUOTA */}
              <col style={{ width: '40px' }} />  {/* AZIONI */}
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--soft)]">
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left py-3 px-3">
                  {t('col_cat', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right py-3 px-3">
                  {t('col_amt', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right py-3 px-3">
                  {t('col_share', lang)}
                </th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
          <tbody>
            {state.budget.map((c, i) => {
              const amt = NUM(c.amount);
              const frac = d.baseTotal > 0 ? amt / d.baseTotal : 0;
              const col = COLORS[i % COLORS.length];

              return (
                <tr key={c.key || i} className="border-b border-[var(--hair)]">
                  <td className="py-[9px] px-[10px]">
                    <div className="cat-cell flex items-center gap-0">
                      <span
                        className="cat-dot w-[9px] h-[9px] rounded-[3px] inline-block mr-[9px] align-middle flex-none"
                        style={{ background: col }}
                      />
                      <input
                        className="cat-name flex-1 min-w-0 max-w-[220px] border border-transparent bg-transparent rounded-lg p-[6px_8px] text-[14px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none transition-colors"
                        value={c.name || ''}
                        onChange={(e) => onUpdateCategoryName(i, e.target.value)}
                        placeholder={
                          CATS.indexOf(c.key) >= 0
                            ? t('c_' + c.key, lang)
                            : t('new_cat', lang)
                        }
                      />
                    </div>
                  </td>
                  <td className="py-[9px] px-[10px] text-right">
                    <input
                      className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none transition-colors"
                      inputMode="decimal"
                      value={c.amount}
                      onChange={(e) => onUpdateCategoryAmount(i, e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-[9px] px-[10px] text-right">
                    <div className="flex items-center gap-[10px] justify-end">
                      <div className="bar h-[6px] rounded-full bg-[var(--hair)] overflow-hidden flex-1 max-w-[120px] min-w-[60px]">
                        <span
                          className="block h-full rounded-full transition-all"
                          style={{
                            width: `${(frac * 100).toFixed(1)}%`,
                            background: col,
                          }}
                        />
                      </div>
                      <span className="num font-mono font-bold text-[var(--sub)] min-w-[38px]">
                        {pct(frac)}
                      </span>
                    </div>
                  </td>
                  <td className="py-[9px] px-[10px] text-right">
                    <button
                      onClick={() => onDeleteCategory(i)}
                      className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[30px] h-[30px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                      title="Elimina"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <button
          onClick={onAddCategory}
          className="add-row inline-flex items-center gap-[8px] border border-dashed border-[var(--line)] bg-transparent text-[var(--horizon-deep)] rounded-[11px] p-[10px_16px] text-[13.5px] font-bold mt-[14px] hover:border-[var(--horizon)] hover:bg-[var(--soft)] cursor-pointer transition-colors"
        >
          ＋ {t('add_cat', lang)}
        </button>

        {/* Contingency Reserve Control */}
        <div className="toggle-row flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[14px_18px] mt-[16px]">
          <div>
            <div className="tt text-[14px] font-bold flex items-center gap-1.5">
              <span>{t('reserve_t', lang)}</span>
              <button
                onClick={(e) =>
                  onShowTip(e.currentTarget, t('tip_reserve', lang))
                }
                className="info border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:border-[var(--horizon)] hover:text-[var(--horizon-deep)]"
                aria-label="?"
              >
                ?
              </button>
            </div>
            <div className="ts text-[12px] text-[var(--sub)] mt-[2px]">
              {t('reserve_s', lang)}
            </div>
            <div className="text-[11.5px] font-bold text-[#12B5A5] mt-[3px]">
              💡 {t('reserve_rec', lang)}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] rounded-xl p-1 shadow-xs">
              {[0, 5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onUpdateReserve(preset)}
                  className={`px-2.5 py-1 text-[12px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                    reservePct === preset
                      ? 'bg-[#12B5A5] text-white shadow-xs'
                      : 'text-[var(--sub)] hover:text-[var(--ink)]'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 border border-[var(--line)] bg-[var(--card)] rounded-xl px-2.5 py-1">
              <input
                type="number"
                min="0"
                max="100"
                value={reservePct}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  onUpdateReserve(val);
                }}
                className="w-12 text-right font-mono font-bold text-[13px] bg-transparent outline-none text-[var(--ink)]"
              />
              <span className="text-[13px] font-mono font-bold text-[var(--sub)]">%</span>
            </div>
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="tfoot flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-[16px] pt-[16px] border-t-2 border-[var(--hair)]">
          <div>
            <div className="lab text-[13px] font-bold text-[var(--sub)]">
              {t('total', lang)}
            </div>
            {reservePct > 0 && (
              <div className="text-[12px] font-mono text-[var(--sub)] mt-0.5">
                {fmt(d.baseTotal, currency, lang)} + {reservePct}% {t('reserve_t', lang).toLowerCase()} ({fmt(reserveAmount, currency, lang)})
              </div>
            )}
          </div>
          <div className="tot num text-[24px] font-bold font-mono tracking-tight text-[var(--ink)]">
            {fmt(d.total, currency, lang)}
          </div>
        </div>
      </div>
    </div>
  );
};
