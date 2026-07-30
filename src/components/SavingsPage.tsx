import React from 'react';
import { ComputedMetrics, DepositItem, DepositMethod, SavingsGoalItem, TripData } from '../types';
import { METHODS } from '../constants/translations';
import { fmt, hexa, NUM, t, today } from '../utils/calculations';

interface SavingsPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  onUpdateDeposit: (index: number, field: keyof DepositItem, val: any) => void;
  onDeleteDeposit: (index: number) => void;
  onAddDeposit: () => void;
  onUpdateSavingsGoal: (index: number, field: keyof SavingsGoalItem, val: any) => void;
  onDeleteSavingsGoal: (index: number) => void;
  onAddSavingsGoal: () => void;
  onShowTip: (el: HTMLElement, tipText: string) => void;
}

export const SavingsPage: React.FC<SavingsPageProps> = ({
  state,
  metrics: d,
  onUpdateDeposit,
  onDeleteDeposit,
  onAddDeposit,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal,
  onAddSavingsGoal,
  onShowTip,
}) => {
  const lang = state.lang;
  const currency = state.currency;
  const multi = state.contributors.length > 1;
  const goals = state.savingsGoals || [];

  // Render 26-week activity heatmap
  const renderHeatmap = () => {
    const dark = state.theme === 'dark';
    const accent = '#12B5A5';
    const weeksN = 26;

    const byDate: Record<string, number> = {};
    state.savings.forEach((s) => {
      if (s.date) byDate[s.date] = (byDate[s.date] || 0) + NUM(s.amount);
    });

    const maxDay = Math.max(1, ...Object.values(byDate));

    const getLvl = (v: number) => {
      if (v <= 0) return 0;
      const r = v / maxDay;
      if (r < 0.25) return 1;
      if (r < 0.5) return 2;
      if (r < 0.75) return 3;
      return 4;
    };

    const getCol = (l: number) =>
      l === 0
        ? 'var(--hair)'
        : hexa(accent, dark ? 0.26 + l * 0.17 : 0.16 + l * 0.21);

    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const dowMon = (todayD.getDay() + 6) % 7;
    const lastMon = new Date(todayD);
    lastMon.setDate(todayD.getDate() - dowMon);

    const cols = [];
    for (let w = weeksN - 1; w >= 0; w--) {
      const cells = [];
      for (let d2 = 0; d2 < 7; d2++) {
        const cell = new Date(lastMon);
        cell.setDate(lastMon.getDate() - w * 7 + d2);
        const iso = cell.toISOString().slice(0, 10);
        const v = byDate[iso] || 0;
        const future = cell > todayD;
        const bg = future ? 'transparent' : getCol(getLvl(v));
        const tip = iso + (v > 0 ? ' · ' + fmt(v, currency, lang) : '');

        cells.push(
          <div
            key={iso}
            className="heat-cell w-[13px] h-[13px] rounded-[3px] flex-none"
            style={{ background: bg }}
            title={tip}
          />
        );
      }
      cols.push(
        <div key={w} className="heat-col flex flex-col gap-[3px]">
          {cells}
        </div>
      );
    }

    const scale = [0, 1, 2, 3, 4].map((l) => (
      <div
        key={l}
        className="heat-cell w-[11px] h-[11px] rounded-[3px]"
        style={{ background: getCol(l) }}
      />
    ));

    return (
      <div>
        <div className="heat-grid flex gap-[3px] overflow-x-auto pb-[2px]">
          {cols}
        </div>
        <div className="heat-legend flex items-center gap-[6px] justify-end mt-[12px] text-[11px] text-[var(--sub)] font-semibold">
          <span>{t('less', lang)}</span>
          {scale}
          <span>{t('more', lang)}</span>
        </div>
      </div>
    );
  };

  const paceTxt =
    d.pace > 0
      ? fmt(d.pace, currency, lang) +
        '/' +
        t('per_month', lang).replace(/^al |^per /, '')
      : '—';

  return (
    <div className="space-y-5">
      <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight">
            {t('savings_title', lang)}
          </h2>
          <div className="hint text-[13px] text-[var(--sub)] leading-snug">
            {t('savings_sub', lang)}
          </div>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="minis grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-[20px]">
        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight">
            {state.savings.length}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('st_count', lang)}
          </div>
        </div>

        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight">
            {fmt(
              state.savings.length ? d.saved / state.savings.length : 0,
              currency,
              lang
            )}
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('st_avg', lang)}
          </div>
        </div>

        <div className="mini bg-[var(--soft)] border border-[var(--hair)] rounded-[14px] p-[16px_18px]">
          <div className="n num text-[22px] font-bold font-mono tracking-tight flex items-center gap-1.5">
            <span>{paceTxt}</span>
            <button
              onClick={(e) =>
                onShowTip(e.currentTarget, t('tip_pace', lang))
              }
              className="info border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:border-[var(--horizon)] hover:text-[var(--horizon-deep)]"
              aria-label="?"
            >
              ?
            </button>
          </div>
          <div className="l text-[12px] text-[var(--sub)] font-semibold mt-[2px]">
            {t('st_pace', lang)}
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[20px_22px] mb-5">
        <div className="sec-head mb-3">
          <h3 className="text-[15px] font-extrabold">{t('milestones_title', lang)}</h3>
          <div className="text-[12.5px] text-[var(--sub)]">{t('milestones_sub', lang)}</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { pctVal: 0.25, key: 'ms_25', icon: '🌱' },
            { pctVal: 0.50, key: 'ms_50', icon: '⚡' },
            { pctVal: 0.75, key: 'ms_75', icon: '🚀' },
            { pctVal: 1.00, key: 'ms_100', icon: '🏆' },
          ].map(({ pctVal, key, icon }) => {
            const isUnlocked = d.progress >= pctVal;
            const targetAmount = d.total * pctVal;
            return (
              <div
                key={key}
                className={`p-3.5 rounded-[14px] border transition-all ${
                  isUnlocked
                    ? 'bg-[var(--soft)] border-[#12B5A5]/40 shadow-xs'
                    : 'bg-[var(--soft)]/40 border-[var(--hair)] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[20px]">{icon}</span>
                  <span
                    className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full ${
                      isUnlocked
                        ? 'bg-[#12B5A5]/15 text-[#12B5A5]'
                        : 'bg-[var(--line)] text-[var(--sub)]'
                    }`}
                  >
                    {isUnlocked ? t('ms_unlocked', lang) : t('ms_locked', lang)}
                  </span>
                </div>
                <div className="text-[13px] font-bold text-[var(--ink)]">
                  {t(key, lang)}
                </div>
                <div className="text-[11px] font-mono font-medium text-[var(--sub)] mt-0.5">
                  {fmt(targetAmount, currency, lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Sub-goals Section */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[20px_22px] mb-5">
        <div className="sec-head mb-3">
          <h3 className="text-[15px] font-extrabold">{t('goals_title', lang)}</h3>
          <div className="text-[12.5px] text-[var(--sub)]">{t('goals_sub', lang)}</div>
        </div>

        {goals.length ? (
          <div className="space-y-3">
            {goals.map((g, i) => {
              const target = NUM(g.targetAmount);
              const currentReached = Math.min(d.saved, target);
              const pctVal = target > 0 ? Math.min(100, Math.round((d.saved / target) * 100)) : 0;
              const isCompleted = target > 0 && d.saved >= target;

              return (
                <div
                  key={g.id || i}
                  className="p-3 sm:p-3.5 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)] flex flex-col gap-2"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={g.label}
                      onChange={(e) => onUpdateSavingsGoal(i, 'label', e.target.value)}
                      placeholder={t('goal_label_ph', lang)}
                      className="flex-1 border border-transparent bg-transparent rounded-lg p-[6px_8px] text-[13.5px] font-bold text-[var(--ink)] hover:bg-[var(--card)] focus:bg-[var(--card)] focus:border-[var(--horizon)] outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={g.targetAmount}
                        onChange={(e) => onUpdateSavingsGoal(i, 'targetAmount', e.target.value)}
                        placeholder={t('goal_target_ph', lang)}
                        className="amt num w-28 text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[6px_8px] text-[13.5px] hover:bg-[var(--card)] focus:bg-[var(--card)] focus:border-[var(--horizon)] outline-none"
                      />
                      <button
                        onClick={() => onDeleteSavingsGoal(i)}
                        className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[28px] h-[28px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11.5px] font-semibold mb-1">
                      <span className="text-[var(--sub)] font-mono">
                        {fmt(currentReached, currency, lang)} / {fmt(target, currency, lang)}
                      </span>
                      <span className={`font-mono ${isCompleted ? 'text-[#12B5A5] font-bold' : 'text-[var(--sub)]'}`}>
                        {pctVal}% {isCompleted ? '✓' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--line)] rounded-full h-[7px] overflow-hidden">
                      <div
                        className="bg-[#12B5A5] h-full rounded-full transition-all duration-300"
                        style={{ width: `${pctVal}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty text-center py-5 px-4 text-[var(--sub)] text-[13px] bg-[var(--soft)]/50 rounded-[14px] border border-dashed border-[var(--line)]">
            {t('empty_goals', lang)}
          </div>
        )}

        <button
          onClick={onAddSavingsGoal}
          className="add-row inline-flex items-center gap-[8px] border border-dashed border-[var(--line)] bg-transparent text-[var(--horizon-deep)] rounded-[11px] p-[9px_14px] text-[13px] font-bold mt-3 hover:border-[var(--horizon)] hover:bg-[var(--soft)] cursor-pointer transition-colors"
        >
          ＋ {t('add_goal', lang)}
        </button>
      </div>

      {/* Activity Heatmap Card */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[18px_16px] sm:p-[22px_24px] mb-5">
        <div className="sec-head flex items-center justify-between gap-3 mb-[14px]">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-extrabold">{t('heat_title', lang)}</h2>
            <button
              onClick={(e) =>
                onShowTip(e.currentTarget, t('tip_heat', lang))
              }
              className="info border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:border-[var(--horizon)] hover:text-[var(--horizon-deep)]"
              aria-label="?"
            >
              ?
            </button>
          </div>
          <span className="hint text-[13px] text-[var(--sub)]">{t('heat_sub', lang)}</span>
        </div>
        <div className="overflow-x-auto pb-1">
          {renderHeatmap()}
        </div>
      </div>

      {/* Deposits Table Card */}
      <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
        {state.savings.length ? (
          <div className="overflow-x-auto">
            <table className="tbl w-full border-collapse min-w-[540px]">
              <thead>
                <tr className="border-b border-[var(--hair)]">
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px] w-[130px]">
                    {t('col_date', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-right pb-[10px] px-[10px] w-[120px]">
                    {t('col_dep', lang)}
                  </th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px] w-[140px]">
                    {t('col_method', lang)}
                  </th>
                  {multi && (
                    <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px] w-[120px]">
                      {t('col_who', lang)}
                    </th>
                  )}
                  <th className="text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] text-left pb-[10px] px-[10px]">
                    {t('col_note', lang)}
                  </th>
                  <th className="pb-[10px] px-[10px] w-[40px]" />
                </tr>
              </thead>
            <tbody>
              {state.savings.map((s, i) => (
                <tr key={(s as any).id || `dep_${i}`} className="border-b border-[var(--hair)]">
                  <td className="py-[9px] px-[10px]">
                    <input
                      type="date"
                      value={s.date}
                      onChange={(e) => onUpdateDeposit(i, 'date', e.target.value)}
                      className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                    />
                  </td>
                  <td className="py-[9px] px-[10px] text-right">
                    <input
                      className="amt num w-full text-right font-mono font-bold border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                      inputMode="decimal"
                      value={s.amount}
                      onChange={(e) => onUpdateDeposit(i, 'amount', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-[9px] px-[10px]">
                    <select
                      value={s.method}
                      onChange={(e) =>
                        onUpdateDeposit(i, 'method', e.target.value as DepositMethod)
                      }
                      className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t('m_' + m, lang)}
                        </option>
                      ))}
                    </select>
                  </td>
                  {multi && (
                    <td className="py-[9px] px-[10px]">
                      <select
                        value={s.who || 0}
                        onChange={(e) =>
                          onUpdateDeposit(i, 'who', parseInt(e.target.value, 10))
                        }
                        className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none cursor-pointer"
                      >
                        {state.contributors.map((c, ci) => (
                          <option key={ci} value={ci}>
                            {c.name || `#${ci + 1}`}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="py-[9px] px-[10px]">
                    <input
                      value={s.note}
                      onChange={(e) => onUpdateDeposit(i, 'note', e.target.value)}
                      placeholder="—"
                      className="w-full border border-transparent bg-transparent rounded-lg p-[7px_8px] text-[14px] font-semibold hover:bg-[var(--soft)] focus:bg-[var(--soft)] focus:border-[var(--horizon)] outline-none"
                    />
                  </td>
                  <td className="py-[9px] px-[10px] text-right">
                    <button
                      onClick={() => onDeleteDeposit(i)}
                      className="del border-none bg-transparent text-[var(--muted)] text-[16px] w-[30px] h-[30px] rounded-lg hover:bg-[rgba(214,72,59,0.1)] hover:text-[var(--red)] cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="empty text-center py-10 px-5 text-[var(--muted)]">
            <div className="ico text-[34px] opacity-50">◷</div>
            <p className="mt-2 text-[14px]">{t('empty_dep', lang)}</p>
          </div>
        )}

        <button
          onClick={onAddDeposit}
          className="add-row inline-flex items-center gap-[8px] border border-dashed border-[var(--line)] bg-transparent text-[var(--horizon-deep)] rounded-[11px] p-[10px_16px] text-[13.5px] font-bold mt-[14px] hover:border-[var(--horizon)] hover:bg-[var(--soft)] cursor-pointer transition-colors"
        >
          ＋ {t('add_dep', lang)}
        </button>
      </div>
    </div>
  );
};
