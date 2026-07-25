import React from 'react';
import { ComputedMetrics, ExpenseItem, TripData } from '../types';
import { CATS } from '../constants/translations';
import { fmt, NUM, t, today } from '../utils/calculations';

interface TripExpensesPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateExpense: (index: number, field: keyof ExpenseItem, val: string) => void;
  onDeleteExpense: (index: number) => void;
  onAddExpense: () => void;
}

export const TripExpensesPage: React.FC<TripExpensesPageProps> = ({
  state,
  metrics: d,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpense,
}) => {
  const lang = state.lang;
  const currency = state.currency;

  const spent = state.expenses.reduce((a, e) => a + NUM(e.actual), 0);
  const left = d.total - spent;
  const over =
    state.expenses.some(
      (e) => NUM(e.actual) > NUM(e.budgeted) && NUM(e.budgeted) > 0
    ) || left < 0;

  return (
    <div className="space-y-5">
      <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight">
            {t('trip_title', lang)}
          </h2>
          <div className="hint text-[13px] text-[var(--sub)] leading-snug">
            {t('trip_sub', lang)}
          </div>
        </div>
      </div>

      {over && (
        <div className="alert flex items-center gap-2.5 bg-[rgba(214,72,59,0.08)] border border-[rgba(214,72,59,0.25)] text-[var(--red)] rounded-xl p-[12px_16px] text-[13.5px] font-bold mb-4">
          ⚠ {t('over_alert', lang)}
        </div>
      )}

      {/* Summary Minis */}
      <div className="minis grid grid-cols-2 gap-[14px] max-w-[440px] mb-5">
        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight">
            {fmt(spent, currency, lang)}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('spent', lang)}
          </div>
        </div>

        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div
            className="n num text-[22px] font-bold font-mono tracking-tight"
            style={{ color: left < 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {fmt(left, currency, lang)}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('left', lang)}
          </div>
        </div>
      </div>

      {/* Expense Log Table */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
        {state.expenses.length ? (
          <table className="tbl w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--hair)]">
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px]">
                  {t('col_date', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px]">
                  {t('col_cat', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px]">
                  {t('col_desc', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[10px]">
                  {t('col_budgeted', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[10px]">
                  {t('col_actual', lang)}
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[10px]">
                  {t('col_diff', lang)}
                </th>
                <th className="pb-[10px] px-[10px]" />
              </tr>
            </thead>
            <tbody>
              {state.expenses.map((e, i) => {
                const diff = NUM(e.budgeted) - NUM(e.actual);
                const isOver = diff < 0;

                return (
                  <tr
                    key={i}
                    className={`border-b border-[var(--hair)] ${
                      isOver ? 'bg-[rgba(214,72,59,0.06)]' : ''
                    }`}
                  >
                    <td className="py-[9px] px-[10px]">
                      <input
                        type="date"
                        value={e.date}
                        onChange={(ev) =>
                          onUpdateExpense(i, 'date', ev.target.value)
                        }
                        className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                      />
                    </td>
                    <td className="py-[9px] px-[10px]">
                      <select
                        value={e.cat}
                        onChange={(ev) =>
                          onUpdateExpense(i, 'cat', ev.target.value)
                        }
                        className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                      >
                        {CATS.map((c) => (
                          <option key={c} value={c}>
                            {t('c_' + c, lang)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-[9px] px-[10px]">
                      <input
                        value={e.desc}
                        onChange={(ev) =>
                          onUpdateExpense(i, 'desc', ev.target.value)
                        }
                        placeholder="—"
                        className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                      />
                    </td>
                    <td className="py-[9px] px-[10px] text-right">
                      <input
                        className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                        inputMode="decimal"
                        value={e.budgeted}
                        onChange={(ev) =>
                          onUpdateExpense(i, 'budgeted', ev.target.value)
                        }
                      />
                    </td>
                    <td className="py-[9px] px-[10px] text-right">
                      <input
                        className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                        inputMode="decimal"
                        value={e.actual}
                        onChange={(ev) =>
                          onUpdateExpense(i, 'actual', ev.target.value)
                        }
                      />
                    </td>
                    <td
                      className="py-[9px] px-[10px] text-right num font-mono font-bold"
                      style={{
                        color: isOver
                          ? 'var(--red)'
                          : diff > 0
                          ? 'var(--green)'
                          : 'var(--sub)',
                      }}
                    >
                      {(diff > 0 ? '+' : '') + fmt(diff, currency, lang)}
                    </td>
                    <td className="py-[9px] px-[10px] text-right">
                      <button
                        onClick={() => onDeleteExpense(i)}
                        className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[30px] h-[30px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty text-center py-10 px-5 text-[var(--muted)]">
            <div className="ico text-[34px] opacity-50">✈</div>
            <p className="mt-2 text-[14px]">{t('empty_exp', lang)}</p>
          </div>
        )}

        <button
          onClick={onAddExpense}
          className="add-row inline-flex items-center gap-[8px] border border-dashed border-[var(--line)] bg-transparent text-[var(--horizon-deep)] rounded-[11px] p-[10px_16px] text-[13.5px] font-bold mt-[14px] hover:border-[var(--horizon)] hover:bg-[var(--soft)] cursor-pointer transition-colors"
        >
          ＋ {t('add_exp', lang)}
        </button>
      </div>
    </div>
  );
};
