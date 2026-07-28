import React from 'react';
import { ComputedMetrics, TripData } from '../types';
import { catName, fdate, fmt, getFinalTripReport, NUM, t } from '../utils/calculations';

interface TripReportModalProps {
  state: TripData;
  metrics: ComputedMetrics;
  onClose: () => void;
}

export const TripReportModal: React.FC<TripReportModalProps> = ({
  state,
  metrics,
  onClose,
}) => {
  const lang = state.lang;
  const currency = state.currency;
  const report = getFinalTripReport(state, metrics);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-[22px] max-w-2xl w-full p-6 shadow-2xl space-y-6 my-auto relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="no-print absolute top-5 right-5 text-[var(--muted)] hover:text-[var(--ink)] text-xl font-bold w-8 h-8 rounded-full bg-[var(--soft)] flex items-center justify-center cursor-pointer transition-colors"
          title={t('report_close_btn', lang)}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[20px]">📊</span>
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#12B5A5]">
              {t('m_report', lang)}
            </span>
          </div>
          <h2 className="text-[24px] font-black tracking-tight">
            {state.destination ? `${state.destination}` : t('report_title', lang)}
          </h2>
          <p className="text-[13px] text-[var(--sub)] mt-0.5">
            {state.departure
              ? `${fdate(state.departure, lang)} ${
                  state.returnDate ? `— ${fdate(state.returnDate, lang)}` : ''
                } (${report.totalTripDays} ${t('report_total_days', lang).toLowerCase()})`
              : t('report_sub', lang)}
          </p>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Initial Budget */}
          <div className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
              {t('report_initial_budget', lang)}
            </div>
            <div className="num text-[18px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {fmt(report.initialBudget, currency, lang)}
            </div>
          </div>

          {/* Total Spent */}
          <div className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
              {t('report_total_spent', lang)}
            </div>
            <div className="num text-[18px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {fmt(report.totalSpent, currency, lang)}
            </div>
          </div>

          {/* Difference */}
          <div
            className={`p-3.5 rounded-[14px] border ${
              report.difference >= 0
                ? 'bg-[#12B5A5]/10 border-[#12B5A5]/30 text-[#12B5A5]'
                : 'bg-[rgba(214,72,59,0.08)] border-[rgba(214,72,59,0.25)] text-[var(--red)]'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider">
              {report.difference >= 0 ? t('report_diff_saved', lang) : t('report_diff_over', lang)}
            </div>
            <div className="num text-[18px] font-extrabold font-mono mt-1">
              {report.difference >= 0 ? '+' : '-'}
              {fmt(Math.abs(report.difference), currency, lang)}
            </div>
          </div>

          {/* Most Expensive Category */}
          <div className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
              {t('report_top_cat', lang)}
            </div>
            <div className="text-[14px] font-bold text-[var(--ink)] mt-1 truncate">
              {report.mostExpensiveCategory
                ? `${report.mostExpensiveCategory.name}`
                : '—'}
            </div>
            {report.mostExpensiveCategory && (
              <div className="num text-[12px] font-mono text-[var(--sub)]">
                {fmt(report.mostExpensiveCategory.amount, currency, lang)}
              </div>
            )}
          </div>

          {/* Avg Daily Spend */}
          <div className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
              {t('report_avg_daily', lang)}
            </div>
            <div className="num text-[18px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {fmt(report.avgDailySpend, currency, lang)}
            </div>
          </div>

          {/* Total Trip Days */}
          <div className="p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)]">
              {t('report_total_days', lang)}
            </div>
            <div className="num text-[18px] font-extrabold font-mono text-[var(--ink)] mt-1">
              {report.totalTripDays}
            </div>
          </div>
        </div>

        {/* Expenses List Breakdown */}
        <div className="space-y-2">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--sub)] flex items-center gap-2">
            <span>🏷️</span> {t('col_cat', lang)} & {t('col_actual', lang)}
          </div>
          {state.expenses.length > 0 ? (
            <div className="border border-[var(--line)] rounded-[14px] overflow-hidden divide-y divide-[var(--hair)] max-h-[220px] overflow-y-auto">
              {state.expenses.map((e, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-[13px]">
                  <div>
                    <span className="font-extrabold text-[var(--ink)]">
                      {e.desc || catName({ key: e.cat }, lang)}
                    </span>
                    <span className="text-[11px] text-[var(--sub)] ml-2">
                      ({catName({ key: e.cat }, lang)})
                    </span>
                  </div>
                  <div className="num font-bold font-mono text-[var(--ink)]">
                    {fmt(NUM(e.actual), currency, lang)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-[14px] bg-[var(--soft)] text-center text-[13px] text-[var(--sub)]">
              {t('report_no_expenses', lang)}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="no-print pt-2 flex items-center justify-end gap-3 border-t border-[var(--line)]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[12px] border border-[var(--line)] bg-[var(--soft)] hover:bg-[var(--card)] font-bold text-[13.5px] text-[var(--ink)] cursor-pointer transition-colors"
          >
            {t('report_close_btn', lang)}
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-[12px] bg-[#12B5A5] hover:bg-[#0fa092] font-extrabold text-[13.5px] text-white shadow-md cursor-pointer transition-all flex items-center gap-2"
          >
            <span>⎙</span>
            <span>{t('report_print_btn', lang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
