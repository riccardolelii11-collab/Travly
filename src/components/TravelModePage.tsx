import React from 'react';
import { ComputedMetrics, ExpenseItem, TripData } from '../types';
import { catName, fdate, fmt, getFinalTripReport, NUM, t, today } from '../utils/calculations';
import { CATS } from '../constants/translations';

interface TravelModePageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateReturnDate: (val: string) => void;
  onAddExpense: () => void;
  onUpdateExpense: (index: number, field: keyof ExpenseItem, val: string) => void;
  onDeleteExpense: (index: number) => void;
  onOpenReport: () => void;
}

export const TravelModePage: React.FC<TravelModePageProps> = ({
  state,
  metrics: d,
  onUpdateReturnDate,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenReport,
}) => {
  const lang = state.lang;
  const currency = state.currency;
  const curToday = today();
  const report = getFinalTripReport(state, d);

  const totalBudget = d.total;
  const spentSoFar = state.expenses.reduce((a, e) => a + NUM(e.actual), 0);
  const available = totalBudget - spentSoFar;


  // Calculate days remaining in trip
  let remainingDays = 1;
  if (state.returnDate) {
    const todayTs = new Date(curToday).getTime();
    const returnTs = new Date(state.returnDate).getTime();
    if (!isNaN(returnTs) && returnTs >= todayTs) {
      const diffMs = returnTs - todayTs;
      remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const dailyRecommended = Math.max(0, available) / remainingDays;

  // Today's expenses
  const todayExpensesWithIdx = state.expenses
    .map((e, idx) => ({ ...e, originalIndex: idx }))
    .filter((e) => e.date === curToday);

  const spentToday = todayExpensesWithIdx.reduce((a, e) => a + NUM(e.actual), 0);

  // Daily status comparison
  const diffToday = spentToday - dailyRecommended;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0E2A50] to-[#12B5A5] text-white p-5 sm:p-6 rounded-[20px] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full backdrop-blur-sm tracking-wider">
              🧳 {t('travel_mode_title', lang)}
            </span>
            <span className="bg-[#12B5A5] text-[#062420] text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              ON TRIP
            </span>
          </div>
          <h2 className="text-[22px] sm:text-[26px] font-black tracking-tight">
            {state.destination ? `${state.destination}` : t('travel_mode_title', lang)}
          </h2>
          <p className="text-[13px] text-white/80 max-w-xl mt-0.5">
            {t('travel_mode_sub', lang)}
          </p>
        </div>

        {/* Inline Return Date Picker */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 text-right shrink-0">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
            {t('travel_return_date', lang)}
          </label>
          <input
            type="date"
            value={state.returnDate || ''}
            min={state.departure || curToday}
            onChange={(e) => onUpdateReturnDate(e.target.value)}
            className="bg-white/20 border border-white/30 text-white font-mono font-bold text-[14px] rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:bg-white/30 transition-colors"
          />
          <div className="text-[11px] text-white/80 mt-1 font-semibold">
            {remainingDays} {t('travel_days_left', lang).toLowerCase()}
          </div>
        </div>
      </div>

      {/* Trip Ended Banner or Final Report Button Section */}
      {report.isTripEnded ? (
        <div className="p-5 rounded-[18px] bg-gradient-to-r from-emerald-600/10 via-[#12B5A5]/15 to-emerald-600/10 border border-[#12B5A5]/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#12B5A5]">
                {t('report_title', lang)}
              </div>
              <p className="text-[13.5px] font-bold text-[var(--ink)] mt-0.5">
                {t('report_trip_ended_banner', lang)}
              </p>
            </div>
            <button
              onClick={onOpenReport}
              className="px-5 py-2.5 bg-[#12B5A5] hover:bg-[#0fa092] text-white font-extrabold text-[13.5px] rounded-[12px] shadow-sm cursor-pointer transition-all shrink-0"
            >
              {t('report_view_btn', lang)}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[var(--card)] rounded-[12px] border border-[var(--line)]">
              <div className="text-[10.5px] font-bold uppercase text-[var(--sub)]">
                {t('report_total_spent', lang)}
              </div>
              <div className="num text-[16px] font-bold text-[var(--ink)]">
                {fmt(report.totalSpent, currency, lang)}
              </div>
            </div>
            <div className="p-3 bg-[var(--card)] rounded-[12px] border border-[var(--line)]">
              <div className="text-[10.5px] font-bold uppercase text-[var(--sub)]">
                {t('report_diff_saved', lang)}
              </div>
              <div className="num text-[16px] font-bold text-[#12B5A5]">
                {fmt(report.difference, currency, lang)}
              </div>
            </div>
            <div className="p-3 bg-[var(--card)] rounded-[12px] border border-[var(--line)]">
              <div className="text-[10.5px] font-bold uppercase text-[var(--sub)]">
                {t('report_avg_daily', lang)}
              </div>
              <div className="num text-[16px] font-bold text-[var(--ink)]">
                {fmt(report.avgDailySpend, currency, lang)}
              </div>
            </div>
            <div className="p-3 bg-[var(--card)] rounded-[12px] border border-[var(--line)]">
              <div className="text-[10.5px] font-bold uppercase text-[var(--sub)]">
                {t('report_total_days', lang)}
              </div>
              <div className="num text-[16px] font-bold text-[var(--ink)]">
                {report.totalTripDays}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-[16px] bg-[var(--soft)] border border-[var(--hair)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
            <span>📊</span>
            <span>{t('report_sub', lang)}</span>
          </div>
          <button
            onClick={onOpenReport}
            className="px-4 py-2 bg-[var(--card)] border border-[var(--line)] hover:border-[#12B5A5] text-[var(--ink)] font-bold text-[13px] rounded-[11px] cursor-pointer transition-colors shrink-0"
          >
            {t('report_view_btn', lang)}
          </button>
        </div>
      )}

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Budget */}
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[16px] p-4 shadow-sm">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('travel_total_budget', lang)}
          </div>
          <div className="num text-[20px] sm:text-[22px] font-bold font-mono tracking-tight text-[var(--ink)] mt-1">
            {fmt(totalBudget, currency, lang)}
          </div>
        </div>

        {/* Spent So Far */}
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[16px] p-4 shadow-sm">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('travel_spent_so_far', lang)}
          </div>
          <div className="num text-[20px] sm:text-[22px] font-bold font-mono tracking-tight text-[var(--ink)] mt-1">
            {fmt(spentSoFar, currency, lang)}
          </div>
        </div>

        {/* Available Budget */}
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[16px] p-4 shadow-sm">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--sub)]">
            {t('travel_available', lang)}
          </div>
          <div
            className={`num text-[20px] sm:text-[22px] font-bold font-mono tracking-tight mt-1 ${
              available < 0 ? 'text-[var(--red)]' : 'text-[#12B5A5]'
            }`}
          >
            {fmt(available, currency, lang)}
          </div>
        </div>

        {/* Daily Recommended */}
        <div className="bg-[#12B5A5]/10 border border-[#12B5A5]/30 rounded-[16px] p-4 shadow-sm">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#12B5A5]">
            {t('travel_daily_recommended', lang)}
          </div>
          <div className="num text-[20px] sm:text-[22px] font-extrabold font-mono tracking-tight text-[#12B5A5] mt-1">
            {fmt(dailyRecommended, currency, lang)} / {lang === 'it' ? 'giorno' : 'day'}
          </div>
        </div>
      </div>

      {/* Today's Budget Status Banner & Prominent Add Expense Button */}
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-[18px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--sub)] flex items-center gap-1.5">
              <span>📅</span> {t('travel_today_spent', lang)} ({fdate(curToday, lang)})
            </div>
            <div className="num text-[24px] font-black font-mono text-[var(--ink)] mt-0.5">
              {fmt(spentToday, currency, lang)}{' '}
              <span className="text-[14px] font-normal text-[var(--sub)] font-sans">
                / {fmt(dailyRecommended, currency, lang)} {t('travel_daily_recommended', lang).toLowerCase()}
              </span>
            </div>
          </div>

          {/* Large Action Button */}
          <button
            onClick={onAddExpense}
            className="w-full md:w-auto px-6 py-3.5 bg-[#12B5A5] hover:bg-[#0fa092] active:scale-[0.98] text-white font-extrabold text-[15px] rounded-[14px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>＋</span>
            <span>{t('travel_add_expense_btn', lang)}</span>
          </button>
        </div>

        {/* Comparison Banner */}
        <div
          className={`p-3.5 rounded-[14px] border text-[13.5px] font-bold flex items-center gap-2.5 ${
            diffToday < -0.01
              ? 'bg-[#12B5A5]/10 border-[#12B5A5]/30 text-[#12B5A5]'
              : diffToday > 0.01
              ? 'bg-[rgba(214,72,59,0.08)] border-[rgba(214,72,59,0.25)] text-[var(--red)]'
              : 'bg-[var(--soft)] border-[var(--hair)] text-[var(--ink)]'
          }`}
        >
          <span className="text-[18px]">
            {diffToday < -0.01 ? '🎉' : diffToday > 0.01 ? '⚠️' : '👍'}
          </span>
          <div>
            {diffToday < -0.01 &&
              t('travel_today_status_under', lang).replace(
                '{amount}',
                fmt(Math.abs(diffToday), currency, lang)
              )}
            {diffToday > 0.01 &&
              t('travel_today_status_over', lang).replace(
                '{amount}',
                fmt(diffToday, currency, lang)
              )}
            {Math.abs(diffToday) <= 0.01 && t('travel_today_status_equal', lang)}
          </div>
        </div>
      </div>

      {/* Today's Expense Log */}
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-[18px] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-[var(--ink)] flex items-center gap-2">
            <span>🛒</span> {t('travel_expenses_today', lang)}
          </h3>
          <span className="text-[12px] font-bold text-[var(--sub)] font-mono">
            {todayExpensesWithIdx.length} {lang === 'it' ? 'spese' : 'expenses'}
          </span>
        </div>

        {todayExpensesWithIdx.length > 0 ? (
          <div className="divide-y divide-[var(--hair)]">
            {todayExpensesWithIdx.map((e) => (
              <div
                key={e.originalIndex}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--soft)] border border-[var(--hair)] grid place-items-center text-[16px] font-bold text-[var(--ink)] shrink-0">
                    🏷️
                  </div>
                  <div>
                    <div className="text-[13.5px] font-extrabold text-[var(--ink)]">
                      {e.desc || catName({ key: e.cat }, lang)}
                    </div>
                    <div className="text-[11.5px] text-[var(--sub)] font-medium">
                      {catName({ key: e.cat }, lang)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase text-[var(--sub)]">
                      {t('col_actual', lang)}
                    </div>
                    <input
                      className="amt num w-24 text-right font-mono font-bold border border-[var(--line)] bg-[var(--card)] rounded-lg px-2 py-1 text-[14px] text-[var(--ink)] outline-none focus:border-[#12B5A5]"
                      inputMode="decimal"
                      value={e.actual}
                      onChange={(ev) =>
                        onUpdateExpense(e.originalIndex, 'actual', ev.target.value)
                      }
                      placeholder="0"
                    />
                  </div>

                  <button
                    onClick={() => onDeleteExpense(e.originalIndex)}
                    className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[30px] h-[30px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--sub)] text-[13.5px] bg-[var(--soft)]/50 rounded-[14px] border border-dashed border-[var(--line)]">
            {t('travel_no_expenses_today', lang)}
          </div>
        )}
      </div>
    </div>
  );
};
