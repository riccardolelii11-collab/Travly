import React from 'react';
import { ComputedMetrics, Page, TripData } from '../types';
import { COLORS } from '../constants/translations';
import { catName, fdate, fmt, getBudgetInsights, NUM, pct, simulateExtraSavings, t } from '../utils/calculations';
import { rephraseInsightsWithGemini } from '../utils/gemini';

interface OverviewPageProps {
  state: TripData;
  metrics: ComputedMetrics;
  hideChecklist: boolean;
  onHideChecklist: () => void;
  onNavigatePage: (p: Page) => void;
  onShowTip: (el: HTMLElement, tipText: string) => void;
  onFocusDestination: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  state,
  metrics: d,
  hideChecklist,
  onHideChecklist,
  onNavigatePage,
  onShowTip,
  onFocusDestination,
}) => {
  const lang = state.lang;
  const currency = state.currency;

  const [extraSavings, setExtraSavings] = React.useState<number>(0);
  const simResult = simulateExtraSavings(state, extraSavings);

  const insights = getBudgetInsights(state, d);

  const formatInsightText = React.useCallback(
    (textKey: string, params?: Record<string, string>) => {
      let text = t(textKey, lang);
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          text = text.replace(`{${key}}`, val);
        });
      }
      return text;
    },
    [lang]
  );

  const insightStrings = React.useMemo(
    () => insights.map((ins) => formatInsightText(ins.textKey, ins.params)),
    [insights, formatInsightText]
  );

  // Onboarding checklist steps
  const steps = [
    { k: 'ck1', done: !!(state.destination && state.departure), go: '' },
    { k: 'ck2', done: d.baseTotal > 0, go: 'budget' },
    { k: 'ck3', done: state.savings.length > 0, go: 'savings' },
    { k: 'ck4', done: state.contributors.length > 1, go: 'team', opt: true },
  ];

  const allMandatoryDone = steps.filter((s) => !s.opt).every((s) => s.done);
  const showChecklist = !hideChecklist && !allMandatoryDone;

  // Hero calculations
  const progressPctNum = (d.progress * 100).toFixed(1);
  const posL = `clamp(56px, ${progressPctNum}%, calc(100% - 56px))`;

  const statusMap: Record<
    string,
    [color: string, textColor: string, label: string, icon: string]
  > = {
    ontrack: ['#1E9E5A', '#ffffff', t('on_track', lang), '✓'],
    behind: ['#E0922B', '#241500', t('behind', lang), '!'],
    done: ['#1E9E5A', '#ffffff', t('done', lang), '★'],
    nodate: ['#5B6982', '#ffffff', t('no_date', lang), '·'],
  };

  const [statusBg, statusTextColor, statusLabel, statusIcon] = statusMap[d.status];

  // Narrative summary calculations
  const depDateObj = state.departure ? new Date(state.departure + 'T00:00:00') : null;
  let daysDiff: number | null = null;
  if (d.proj && depDateObj && !isNaN(depDateObj.getTime())) {
    const pMidnight = new Date(d.proj.getFullYear(), d.proj.getMonth(), d.proj.getDate());
    const dMidnight = new Date(depDateObj.getFullYear(), depDateObj.getMonth(), depDateObj.getDate());
    const diffMs = dMidnight.getTime() - pMidnight.getTime();
    daysDiff = Math.round(diffMs / 864e5);
  }

  let mainNarrativeText = '';
  let paceNarrativeText = '';

  if (d.remaining <= 0 || d.status === 'done') {
    mainNarrativeText = t('narrative_done', lang).replace('{total}', fmt(d.total, currency, lang));
  } else if (d.days == null || !state.departure) {
    mainNarrativeText = t('narrative_need_nodate', lang).replace('{rem}', fmt(d.remaining, currency, lang));
  } else if (d.days < 0) {
    mainNarrativeText = t('dep_passed', lang);
  } else {
    mainNarrativeText = t('narrative_need', lang)
      .replace('{rem}', fmt(d.remaining, currency, lang))
      .replace('{days}', String(d.days))
      .replace('{month}', fmt(d.needMonth, currency, lang))
      .replace('{week}', fmt(d.needWeek, currency, lang));

    if (daysDiff !== null && d.proj) {
      if (daysDiff > 0) {
        paceNarrativeText = t('narrative_ahead', lang)
          .replace('{days}', String(daysDiff))
          .replace('{date}', fdate(d.proj, lang));
      } else if (daysDiff === 0) {
        paceNarrativeText = t('narrative_exact', lang).replace('{date}', fdate(d.proj, lang));
      } else {
        paceNarrativeText = t('narrative_behind', lang)
          .replace('{days}', String(Math.abs(daysDiff)))
          .replace('{date}', fdate(d.proj, lang));
      }
    } else {
      paceNarrativeText = t('narrative_no_pace', lang);
    }
  }

  const projLine =
    d.status === 'nodate'
      ? ''
      : d.proj
      ? `${t('proj', lang)} ${fdate(d.proj, lang)}`
      : state.savings.length
      ? t('proj_short', lang)
      : t('proj_none', lang);

  const daysTxt =
    d.days == null ? (
      t('no_date', lang)
    ) : d.days < 0 ? (
      t('dep_passed', lang)
    ) : (
      <>
        <span className="num font-mono">{d.days}</span> {t('days_to', lang)}
      </>
    );

  // SVG Growth Chart
  const renderGrowthChart = () => {
    const W = 560;
    const H = 210;
    const pl = 44;
    const pr = 20;
    const pt = 22;
    const pb = 26;

    const sorted = state.savings
      .filter((s) => NUM(s.amount) !== 0 && s.date)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const pts = [{ v: 0 }];
    let cum = 0;
    sorted.forEach((s) => {
      cum += NUM(s.amount);
      pts.push({ v: cum });
    });

    if (pts.length === 1) pts.push({ v: 0 });

    const maxV = Math.max(d.total, cum, 1);
    const n = pts.length;

    const X = (i: number) => pl + (i / Math.max(n - 1, 1)) * (W - pl - pr);
    const Y = (v: number) => H - pb - (v / maxV) * (H - pb - pt);

    const linePoints = pts
      .map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`)
      .join(' ');

    const areaPath =
      `M${pl},${H - pb} ` +
      pts.map((p, i) => `L${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ') +
      ` L${X(n - 1).toFixed(1)},${H - pb} Z`;

    const gy = Y(d.total).toFixed(1);

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--horizon)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--horizon)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Goal line */}
        <line
          x1={pl}
          y1={gy}
          x2={W - pr}
          y2={gy}
          stroke="var(--amber)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <text
          x={W - pr}
          y={Number(gy) - 7}
          textAnchor="end"
          fontSize="11"
          fontWeight="700"
          fill="var(--amber)"
        >
          {t('goal_line', lang)} {fmt(d.total, currency, lang)}
        </text>
        {/* Area & Line */}
        <path d={areaPath} fill="url(#ga)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--horizon)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {pts.map((p, i) =>
          i > 0 ? (
            <circle
              key={i}
              cx={X(i).toFixed(1)}
              cy={Y(p.v).toFixed(1)}
              r="3.5"
              fill="var(--card)"
              stroke="var(--horizon)"
              strokeWidth="2.5"
            />
          ) : null
        )}
      </svg>
    );
  };

  // SVG Donut Allocation Chart
  const renderDonutChart = () => {
    const C = 2 * Math.PI * 70;
    let off = 0;

    const items = state.budget
      .map((c, i) => ({
        name: catName(c, lang),
        amount: NUM(c.amount),
        color: COLORS[i % COLORS.length],
      }))
      .filter((c) => c.amount > 0);

    if (!items.length) {
      return (
        <div className="empty text-center py-10 px-5 text-[var(--muted)]">
          <div className="ico text-[34px] opacity-50">▦</div>
          <p className="mt-2 text-[14px]">{t('empty_dep', lang)}</p>
        </div>
      );
    }

    const segs = items.map((c, idx) => {
      const frac = d.baseTotal > 0 ? c.amount / d.baseTotal : 0;
      const len = frac * C;
      const circle = (
        <circle
          key={idx}
          cx="90"
          cy="90"
          r="70"
          fill="none"
          stroke={c.color}
          strokeWidth="26"
          strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
          strokeDashoffset={(-off).toFixed(2)}
          transform="rotate(-90 90 90)"
        />
      );
      off += len;
      return circle;
    });

    return (
      <div className="flex gap-6 items-center flex-wrap">
        <svg viewBox="0 0 180 180" className="w-[150px] h-[150px] flex-none">
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="var(--hair)"
            strokeWidth="26"
          />
          {segs}
          <text
            x="90"
            y="84"
            textAnchor="middle"
            fontSize="13"
            fill="var(--sub)"
            fontWeight="700"
          >
            {t('total', lang)}
          </text>
          <text
            x="90"
            y="106"
            textAnchor="middle"
            fontSize="19"
            fontWeight="700"
            fontFamily="Space Grotesk"
            fill="var(--ink)"
          >
            {fmt(d.baseTotal, currency, lang)}
          </text>
        </svg>

        <div className="legend flex flex-col gap-[9px] flex-1 min-w-[160px]">
          {items.map((c, idx) => (
            <div key={idx} className="li flex items-center gap-[9px] text-[13px]">
              <span
                className="sw w-[10px] h-[10px] rounded-[3px] flex-none"
                style={{ background: c.color }}
              />
              <span className="nm font-semibold flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {c.name}
              </span>
              <span className="pc font-mono font-bold text-[var(--sub)]">
                {pct(d.baseTotal > 0 ? c.amount / d.baseTotal : 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tripLabelStr = state.tripLabel == null ? t('trip_to', lang) : state.tripLabel;

  return (
    <div className="space-y-5">
      {/* Onboarding Checklist */}
      {showChecklist && (
        <div className="ck border border-[var(--horizon)] bg-gradient-to-b from-[var(--card)] to-[var(--soft)] rounded-[18px] shadow-sm p-[20px_22px] mb-5">
          <div className="ck-top flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight">
                {t('ck_title', lang)}
              </h2>
              <div className="hint text-[13px] text-[var(--sub)] mt-1">
                {t('ck_sub', lang)}
              </div>
            </div>
            <button
              onClick={onHideChecklist}
              className="link-btn border-none bg-transparent text-[var(--sub)] text-[12.5px] font-bold cursor-pointer p-[4px_6px] rounded-lg hover:bg-[var(--soft)] hover:text-[var(--ink)]"
            >
              {t('hide', lang)}
            </button>
          </div>

          <div className="ck-list flex flex-col gap-[2px] mt-3.5">
            {steps.map((s) => (
              <button
                key={s.k}
                onClick={() => {
                  if (s.go) {
                    onNavigatePage(s.go as Page);
                  } else {
                    onFocusDestination();
                  }
                }}
                className={`ck-item group flex items-center gap-3 w-full text-left border-none bg-transparent rounded-[10px] p-[9px_10px] text-[14px] font-semibold text-[var(--ink)] cursor-pointer hover:bg-[var(--soft)] ${
                  s.done ? 'done' : ''
                }`}
              >
                <span
                  className={`bx w-[21px] h-[21px] rounded-[7px] border-2 flex-none grid place-items-center text-[12px] text-white ${
                    s.done
                      ? 'bg-[#1E9E5A] border-[#1E9E5A]'
                      : 'border-[var(--line)]'
                  }`}
                >
                  {s.done ? '✓' : ''}
                </span>
                <span
                  className={`lbl ${
                    s.done ? 'text-[var(--muted)] line-through' : ''
                  }`}
                >
                  {t(s.k, lang)}
                </span>
                {s.opt && (
                  <span className="opt text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    {t('ck_opt', lang)}
                  </span>
                )}
                <span className="go ml-auto text-[var(--horizon-deep)] font-extrabold text-[15px] opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero Boarding Pass */}
      <section className="hero relative overflow-hidden text-white rounded-[20px] sm:rounded-[24px] bg-[radial-gradient(120%_140%_at_85%_-20%,_#18486f_0%,_#0B1B3A_55%,_#0B1B3A_100%)] shadow-2xl p-4 sm:p-[30px_34px]">
        <div className="glow absolute -right-[60px] -top-[80px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,_rgba(18,181,165,0.5),_transparent_60%)] blur-[8px] pointer-events-none" />

        <div className="hero-top flex justify-between items-start gap-3 sm:gap-5 flex-wrap relative">
          <div className="route-from">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('from_today', lang)}
            </div>
            <div className="val num text-[14px] sm:text-[15px] font-bold mt-[2px]">
              {fdate(new Date(), lang)}
            </div>
          </div>

          <div className="route-to text-right">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {tripLabelStr}
            </div>
            <div className="val text-[19px] sm:text-[22px] font-extrabold tracking-tight mt-[2px] truncate max-w-[200px] sm:max-w-none">
              {state.destination || '—'}
            </div>
            <div className="sub text-[11.5px] sm:text-[12px] text-[#A9C4E4] font-semibold mt-[2px] font-mono">
              {state.departure
                ? `${t('departs', lang)} ${fdate(new Date(state.departure + 'T00:00:00'), lang)}`
                : '—'}
            </div>
          </div>
        </div>

        {/* Journey Progress Line */}
        <div className="journey relative my-6 sm:my-[30px] mb-2 h-[46px]">
          <div className="track absolute left-[6px] right-[6px] top-[21px] h-[4px] rounded-full bg-white/15" />
          <div
            className="fill absolute left-[6px] top-[21px] h-[4px] rounded-full bg-gradient-to-r from-[#12B5A5] to-[#6fe6d6] shadow-[0_0_14px_rgba(18,181,165,0.7)] transition-all duration-700 ease-out"
            style={{ width: `${d.progress * 100}%` }}
          />
          <div className="dot start absolute top-[15px] left-0 w-[16px] h-[16px] rounded-full bg-white border-[3px] border-[#12B5A5]" />
          <div
            className="flag absolute top-[-20px] bg-[#12B5A5] text-[#062420] text-[10.5px] font-extrabold px-[8px] py-[2px] rounded-full whitespace-nowrap -translate-x-1/2 transition-all duration-700 ease-out"
            style={{ left: posL }}
          >
            {pct(d.progress)} {t('saved_pct', lang)}
          </div>
          <div
            className="plane absolute top-[5px] -translate-x-1/2 w-[34px] h-[34px] rounded-full bg-white border-[3px] border-[#12B5A5] grid place-items-center text-[16px] leading-none text-[#0B1B3A] shadow-xl transition-all duration-700 ease-out z-10"
            style={{ left: posL }}
          >
            ✈︎
          </div>
          <div className="pin absolute -right-[2px] top-[9px] text-[24px] drop-shadow-md">
            📍
          </div>
        </div>

        {/* Hero Stats Grid */}
        <div className="hero-stats grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-[34px] mt-4 sm:mt-[22px] relative">
          <div className="hs flex flex-col gap-[2px]">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('kpi_cost', lang)}
            </div>
            <div className="big num text-[20px] sm:text-[27px] font-bold font-mono tracking-tight">
              {fmt(d.total, currency, lang)}
            </div>
          </div>

          <div className="hs saved flex flex-col gap-[2px]">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('saved', lang)}
            </div>
            <div className="big num text-[20px] sm:text-[27px] font-bold font-mono tracking-tight text-[#7af0e0]">
              {fmt(d.saved, currency, lang)}
            </div>
          </div>

          <div className="hs flex flex-col gap-[2px]">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('remaining', lang)}
            </div>
            <div className="big num text-[20px] sm:text-[27px] font-bold font-mono tracking-tight">
              {fmt(d.remaining, currency, lang)}
            </div>
          </div>

          <div className="hs flex flex-col gap-[2px]">
            <div className="lab text-[10.5px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('departure', lang)}
            </div>
            <div className="big text-[16px] sm:text-[19px] font-bold">{daysTxt}</div>
          </div>
        </div>

        {/* Status Badge Line */}
        <div className="flex items-center gap-[9px] relative mt-5">
          <div
            className="status inline-flex items-center gap-[7px] rounded-full px-3.5 py-1.5 text-[12.5px] font-extrabold"
            style={{ backgroundColor: statusBg, color: statusTextColor }}
          >
            <span>
              {statusIcon} {statusLabel}
            </span>
          </div>

          <button
            onClick={(e) =>
              onShowTip(e.currentTarget, t('tip_status', lang))
            }
            className="info on-dark border border-white/35 bg-white/12 text-[#cfe2f7] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:bg-white/22 hover:text-white"
            aria-label="?"
          >
            ?
          </button>
        </div>
      </section>

      {/* Secondary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] items-stretch gap-[20px] mt-5">
        {/* Action Card & Savings Growth */}
        <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[18px_20px] sm:p-[22px_24px] flex flex-col justify-between">
          <div>
          <div className="action-card flex items-center justify-between gap-[16px] flex-wrap">
            <div className="lead flex flex-col gap-1">
              <div className="k text-[13px] font-bold text-[var(--sub)] flex items-center gap-1.5">
                <span>{t('action_k', lang)}</span>
                <button
                  onClick={(e) =>
                    onShowTip(e.currentTarget, t('tip_action', lang))
                  }
                  className="info border border-[var(--line)] bg-[var(--card)] text-[var(--sub)] w-[16px] h-[16px] rounded-full flex-none grid place-items-center text-[10px] font-extrabold cursor-pointer hover:border-[var(--horizon)] hover:text-[var(--horizon-deep)]"
                  aria-label="?"
                >
                  ?
                </button>
              </div>
              <div className="v num text-[26px] sm:text-[30px] font-bold font-mono tracking-tight">
                {fmt(d.needMonth, currency, lang)}{' '}
                <small className="text-[14px] sm:text-[15px] text-[var(--sub)] font-semibold">
                  {t('per_month', lang)}
                </small>
              </div>
            </div>

            <div className="pace flex gap-[20px] sm:gap-[26px] flex-wrap">
              <div className="p">
                <div className="n num text-[17px] sm:text-[18px] font-bold font-mono">
                  {fmt(d.needWeek, currency, lang)}
                </div>
                <div className="l text-[10.5px] sm:text-[11px] text-[var(--sub)] font-semibold uppercase tracking-wider">
                  {t('pace_week', lang)}
                </div>
              </div>

              <div className="p">
                <div className="n num text-[17px] sm:text-[18px] font-bold font-mono">
                  {fmt(d.needDay, currency, lang)}
                </div>
                <div className="l text-[10.5px] sm:text-[11px] text-[var(--sub)] font-semibold uppercase tracking-wider">
                  {t('pace_day', lang)}
                </div>
              </div>
            </div>
          </div>

          {d.windfall > 0 && (
            <div className="hint text-[13px] text-[var(--sub)] mt-3.5 leading-relaxed">
              ⓘ{' '}
              {t('wind_note', lang).replace(
                '{a}',
                fmt(d.windfall, currency, lang)
              )}
            </div>
          )}

          {d.provisional && state.savings.length > 0 && (
            <div className="hint text-[13px] text-[var(--sub)] mt-2 leading-relaxed">
              ⓘ {t('prov_note', lang)}
            </div>
          )}

          {/* Narrative Summary Section */}
          <div className="narrative-section mt-4 p-3.5 sm:p-4 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)] text-[13px] leading-relaxed">
            <div className="flex items-start gap-2.5">
              <span className="text-[18px] leading-none select-none">💬</span>
              <div className="space-y-1">
                <p className="font-medium text-[var(--ink)]">
                  {mainNarrativeText}
                </p>
                {paceNarrativeText && (
                  <p className={`text-[12px] font-semibold ${daysDiff !== null && daysDiff < 0 ? 'text-[var(--red)]' : 'text-[var(--sub)]'}`}>
                    {paceNarrativeText}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Automatic Budget Insights */}
          {insights.length > 0 && (
            <div className="insights-section mt-4 space-y-2">
              <div className="text-[12px] font-bold text-[var(--sub)] uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span> {t('insights_title', lang)}
              </div>

              <div className="space-y-2">
                {insights.map((ins, idx) => {
                  let badge = '💡';
                  let styleClass = 'bg-[var(--soft)] border-[var(--hair)] text-[var(--ink)]';
                  if (ins.type === 'warning') {
                    badge = '⚠️';
                    styleClass = 'bg-[rgba(214,72,59,0.06)] border-[rgba(214,72,59,0.2)] text-[var(--red)]';
                  } else if (ins.type === 'success') {
                    badge = '✨';
                    styleClass = 'bg-[#12B5A5]/10 border-[#12B5A5]/25 text-[#12B5A5]';
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-[12px] border text-[12.5px] font-semibold flex items-start gap-2.5 ${styleClass}`}
                    >
                      <span className="text-[15px] leading-none shrink-0">{badge}</span>
                      <span className="leading-snug">{formatInsightText(ins.textKey, ins.params)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Simulator "Risparmia di più" Section */}
          <div className="simulator-section mt-4 p-3.5 sm:p-4 rounded-[14px] bg-[var(--soft)] border border-[var(--hair)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">🚀</span>
                <span className="text-[13px] font-extrabold text-[var(--ink)]">
                  {t('sim_title', lang)}
                </span>
              </div>
              <span className="text-[12.5px] font-bold font-mono text-[#12B5A5] bg-[#12B5A5]/10 px-2.5 py-0.5 rounded-full">
                +{fmt(extraSavings, currency, lang)}/{t('per_month', lang)}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mb-3 leading-tight">
              {t('sim_sub', lang)}
            </p>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-[var(--sub)] font-mono">0</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={extraSavings}
                onChange={(e) => setExtraSavings(Number(e.target.value))}
                className="w-full accent-[#12B5A5] cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-[var(--sub)] font-mono">100</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-[var(--hair)]">
              <div>
                <span className="block text-[10.5px] text-[var(--sub)] font-semibold uppercase tracking-wider mb-0.5">
                  {t('sim_new_date', lang)}
                </span>
                <span className="font-bold text-[var(--ink)] font-mono">
                  {simResult.newProj ? fdate(simResult.newProj, lang) : t('sim_no_date', lang)}
                </span>
              </div>
              <div>
                <span className="block text-[10.5px] text-[var(--sub)] font-semibold uppercase tracking-wider mb-0.5">
                  {t('sim_days_saved', lang)}
                </span>
                <span className="font-bold text-[#12B5A5] font-mono">
                  {simResult.daysSaved > 0
                    ? t('sim_days_val', lang).replace('{days}', String(simResult.daysSaved))
                    : `0 ${t('days_to', lang).split(' ')[0]}`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5.5">
            <div className="sec-head flex items-center justify-between gap-3 mb-1.5">
              <h2 className="text-[14px] font-extrabold">{t('growth_title', lang)}</h2>
            </div>
            {renderGrowthChart()}
          </div>
          </div>
        </div>

        {/* Money Allocation Donut Card - Fills full height down to the bottom */}
        <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[18px_20px] sm:p-[22px_24px] h-full flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
              <h2 className="text-[15px] font-extrabold">{t('alloc_title', lang)}</h2>
            </div>
            {renderDonutChart()}
          </div>
        </div>
      </div>
    </div>
  );
};
