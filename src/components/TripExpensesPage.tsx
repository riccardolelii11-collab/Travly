import React from 'react';
import { BookingStatus, ComputedMetrics, ExpenseItem, TripData } from '../types';
import { CATS } from '../constants/translations';
import { catName, daysLeft, fdate, fmt, NUM, t, today } from '../utils/calculations';

interface TripExpensesPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateExpense: (index: number, field: keyof ExpenseItem, val: string) => void;
  onDeleteExpense: (index: number) => void;
  onAddExpense: () => void;
}

const getStatusBadgeStyle = (status?: BookingStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'booked':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'to_book':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'evaluating':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    default:
      return 'bg-[var(--soft)] text-[var(--sub)] border-[var(--line)]';
  }
};

export const TripExpensesPage: React.FC<TripExpensesPageProps> = ({
  state,
  metrics: d,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpense,
}) => {
  const lang = state.lang;
  const currency = state.currency;

  const totBudgeted = state.expenses.reduce((a, e) => a + NUM(e.budgeted), 0);
  const totActual = state.expenses.reduce((a, e) => a + NUM(e.actual), 0);
  const totPaid = state.expenses.reduce((a, e) => a + NUM(e.paid), 0);
  const totToPay = state.expenses.reduce((a, e) => {
    const actualVal = NUM(e.actual);
    const budgetedVal = NUM(e.budgeted);
    const target = actualVal > 0 ? actualVal : budgetedVal;
    return a + Math.max(0, target - NUM(e.paid));
  }, 0);
  const totDiff = totBudgeted - totActual;

  const spent = totActual;
  const left = d.total - spent;
  const over =
    state.expenses.some(
      (e) => NUM(e.actual) > NUM(e.budgeted) && NUM(e.budgeted) > 0
    ) || left < 0;

  // Filter expenses with due date and remaining balance to pay
  const upcoming = state.expenses
    .map((e, originalIndex) => {
      const actualVal = NUM(e.actual);
      const budgetedVal = NUM(e.budgeted);
      const paidVal = NUM(e.paid);
      const targetVal = actualVal > 0 ? actualVal : budgetedVal;
      const toPay = Math.max(0, targetVal - paidVal);
      const dLeft = e.dueDate ? daysLeft(e.dueDate) : null;
      return { ...e, originalIndex, toPay, dLeft };
    })
    .filter((e) => e.dueDate && e.toPay > 0)
    .sort((a, b) => (a.dLeft ?? 9999) - (b.dLeft ?? 9999));

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

      {/* Structured Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('col_budgeted', lang)}
          </div>
          <div className="text-[19px] sm:text-[21px] font-bold font-mono tracking-tight text-[var(--ink)] mt-1">
            {fmt(totBudgeted, currency, lang)}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('col_actual', lang)}
          </div>
          <div className="text-[19px] sm:text-[21px] font-bold font-mono tracking-tight text-[var(--ink)] mt-1">
            {fmt(totActual, currency, lang)}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('col_paid', lang)}
          </div>
          <div className="text-[19px] sm:text-[21px] font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt(totPaid, currency, lang)}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('col_to_pay', lang)}
          </div>
          <div className="text-[19px] sm:text-[21px] font-bold font-mono tracking-tight text-[var(--red)] mt-1">
            {fmt(totToPay, currency, lang)}
          </div>
        </div>
      </div>

      {/* Upcoming Payments Card */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[20px_22px] mb-5">
        <div className="sec-head mb-3">
          <h3 className="text-[15px] font-extrabold text-[var(--ink)] flex items-center gap-2">
            <span>📅</span> {t('upcoming_title', lang)}
          </h3>
          <div className="text-[12.5px] text-[var(--sub)]">{t('upcoming_sub', lang)}</div>
        </div>

        {upcoming.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcoming.map((u) => {
              const dLeft = u.dLeft ?? 0;
              let badgeColorClass = 'bg-[#12B5A5]/15 text-[#12B5A5] border-[#12B5A5]/30';
              if (dLeft < 7) {
                badgeColorClass = 'bg-[rgba(214,72,59,0.12)] text-[var(--red)] border-[rgba(214,72,59,0.3)]';
              } else if (dLeft < 30) {
                badgeColorClass = 'bg-[rgba(217,119,6,0.12)] text-[#d97706] border-[rgba(217,119,6,0.3)]';
              }

              let daysLabel = '';
              if (dLeft < 0) {
                daysLabel = t('overdue', lang).replace('{days}', String(Math.abs(dLeft)));
              } else if (dLeft === 0) {
                daysLabel = t('due_today', lang);
              } else {
                daysLabel = t('due_in_days', lang).replace('{days}', String(dLeft));
              }

              return (
                <div
                  key={u.originalIndex}
                  className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-[12px] font-bold text-[var(--ink)] truncate">
                        {catName({ key: u.cat }, lang)}
                      </span>
                      <span
                        className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${badgeColorClass}`}
                      >
                        {daysLabel}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--ink)] truncate mb-1">
                      {u.desc || '—'}
                    </div>
                    <div className="text-[11.5px] text-[var(--sub)]">
                      {t('due_date_label', lang)} <span className="font-mono font-medium">{fdate(u.dueDate!, lang)}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[var(--hair)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--sub)] font-semibold uppercase">
                      {t('remaining_pay', lang)}
                    </span>
                    <span className="text-[13.5px] font-mono font-extrabold text-[var(--red)]">
                      {fmt(u.toPay, currency, lang)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty text-center py-4 px-4 text-[var(--sub)] text-[13px] bg-[var(--soft)]/50 rounded-[14px] border border-dashed border-[var(--line)]">
            {t('no_upcoming', lang)}
          </div>
        )}
      </div>

      {/* Expense Log Table - Spreadsheet view with fixed layout */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
        {state.expenses.length ? (
          <div className="overflow-x-auto">
            <table className="tbl w-full border-collapse table-fixed min-w-[1080px]">
              <colgroup>
                <col style={{ width: '125px' }} /> {/* DATA */}
                <col style={{ width: '135px' }} /> {/* CATEGORIA */}
                <col style={{ width: '170px' }} /> {/* DESCRIZIONE */}
                <col style={{ width: '140px' }} /> {/* STATO */}
                <col style={{ width: '125px' }} /> {/* SCADENZA */}
                <col style={{ width: '95px' }} />  {/* PREVENTIVO */}
                <col style={{ width: '95px' }} />  {/* EFFETTIVO */}
                <col style={{ width: '95px' }} />  {/* PAGATO */}
                <col style={{ width: '100px' }} /> {/* DA PAGARE */}
                <col style={{ width: '85px' }} />  {/* DIFF. */}
                <col style={{ width: '35px' }} />  {/* AZIONI */}
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--hair)]">
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[8px] w-[130px]">
                    {t('col_date', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[8px] w-[130px]">
                    {t('col_cat', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[8px] w-[160px]">
                    {t('col_desc', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[8px] w-[135px]">
                    {t('col_booking_status', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[8px] w-[130px]">
                    {t('col_due_date', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[8px] w-[90px]">
                    {t('col_budgeted', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[8px] w-[90px]">
                    {t('col_actual', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[8px] w-[90px]">
                    {t('col_paid', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[8px] w-[95px]">
                    {t('col_to_pay', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[8px] w-[85px]">
                    {t('col_diff', lang)}
                  </th>
                  <th className="pb-[10px] px-[8px] w-[35px]" />
                </tr>
              </thead>
              <tbody>
                {state.expenses.map((e, i) => {
                  const diff = NUM(e.budgeted) - NUM(e.actual);
                  const isOver = diff < 0;
                  const actualVal = NUM(e.actual);
                  const paidVal = NUM(e.paid);
                  const toPay = Math.max(0, actualVal - paidVal);

                  return (
                    <tr
                      key={(e as any).id || `exp_${i}`}
                      className={`border-b border-[var(--hair)] ${
                        isOver ? 'bg-[rgba(214,72,59,0.06)]' : ''
                      }`}
                    >
                      <td className="py-[9px] px-[6px]">
                        <input
                          type="date"
                          value={e.date}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'date', ev.target.value)
                          }
                          className="w-full border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                        />
                      </td>
                      <td className="py-[9px] px-[6px]">
                        <select
                          value={e.cat}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'cat', ev.target.value)
                          }
                          className="w-full border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                        >
                          {CATS.map((c) => (
                            <option key={c} value={c}>
                              {t('c_' + c, lang)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-[9px] px-[6px]">
                        <input
                          value={e.desc}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'desc', ev.target.value)
                          }
                          placeholder="—"
                          className="w-full border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                        />
                      </td>
                      <td className="py-[9px] px-[6px]">
                        <select
                          value={e.bookingStatus || 'to_search'}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'bookingStatus', ev.target.value as BookingStatus)
                          }
                          className="w-full border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                        >
                          <option value="to_search">{t('bs_to_search', lang)}</option>
                          <option value="evaluating">{t('bs_evaluating', lang)}</option>
                          <option value="to_book">{t('bs_to_book', lang)}</option>
                          <option value="booked">{t('bs_booked', lang)}</option>
                          <option value="paid">{t('bs_paid', lang)}</option>
                        </select>
                      </td>
                      <td className="py-[9px] px-[6px]">
                        <input
                          type="date"
                          value={e.dueDate || ''}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'dueDate', ev.target.value)
                          }
                          className="w-full border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                        />
                      </td>
                      <td className="py-[9px] px-[6px] text-right">
                        <input
                          className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                          inputMode="decimal"
                          value={e.budgeted}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'budgeted', ev.target.value)
                          }
                        />
                      </td>
                      <td className="py-[9px] px-[6px] text-right">
                        <input
                          className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                          inputMode="decimal"
                          value={e.actual}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'actual', ev.target.value)
                          }
                        />
                      </td>
                      <td className="py-[9px] px-[6px] text-right">
                        <input
                          className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[6px_6px] text-[13px] text-[var(--ink)] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                          inputMode="decimal"
                          value={e.paid ?? '0'}
                          onChange={(ev) =>
                            onUpdateExpense(i, 'paid', ev.target.value)
                          }
                        />
                      </td>
                      <td className="py-[9px] px-[6px] text-right num font-mono font-bold text-[13px] text-[var(--red)]">
                        {fmt(toPay, currency, lang)}
                      </td>
                      <td
                        className="py-[9px] px-[6px] text-right num font-mono font-bold text-[13px]"
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
                      <td className="py-[9px] px-[6px] text-right">
                        <button
                          onClick={() => onDeleteExpense(i)}
                          className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[28px] h-[28px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
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
