import React from 'react';
import { ComputedMetrics, Page, TripData } from '../types';
import { COLORS } from '../constants/translations';
import { catName, fdate, fmt, NUM, pct, t } from '../utils/calculations';

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
      <section className="hero relative overflow-hidden text-white rounded-[24px] bg-[radial-gradient(120%_140%_at_85%_-20%,_#18486f_0%,_#0B1B3A_55%,_#0B1B3A_100%)] shadow-2xl p-[30px_34px]">
        <div className="glow absolute -right-[60px] -top-[80px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,_rgba(18,181,165,0.5),_transparent_60%)] blur-[8px] pointer-events-none" />

        <div className="hero-top flex justify-between items-start gap-5 flex-wrap relative">
          <div className="route-from">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('from_today', lang)}
            </div>
            <div className="val num text-[15px] font-bold mt-[3px]">
              {fdate(new Date(), lang)}
            </div>
          </div>

          <div className="route-to text-right">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {tripLabelStr}
            </div>
            <div className="val text-[22px] font-extrabold tracking-tight mt-[2px]">
              {state.destination || '—'}
            </div>
            <div className="sub text-[12px] text-[#A9C4E4] font-semibold mt-[3px] font-mono">
              {state.departure
                ? `${t('departs', lang)} ${fdate(new Date(state.departure + 'T00:00:00'), lang)}`
                : '—'}
            </div>
          </div>
        </div>

        {/* Journey Progress Line */}
        <div className="journey relative my-[30px] mb-2 h-[46px]">
          <div className="track absolute left-[6px] right-[6px] top-[21px] h-[4px] rounded-full bg-white/15" />
          <div
            className="fill absolute left-[6px] top-[21px] h-[4px] rounded-full bg-gradient-to-r from-[#12B5A5] to-[#6fe6d6] shadow-[0_0_14px_rgba(18,181,165,0.7)] transition-all duration-700 ease-out"
            style={{ width: `${d.progress * 100}%` }}
          />
          <div className="dot start absolute top-[15px] left-0 w-[16px] h-[16px] rounded-full bg-white border-[3px] border-[#12B5A5]" />
          <div
            className="flag absolute top-[-20px] bg-[#12B5A5] text-[#062420] text-[11px] font-extrabold px-[9px] py-[3px] rounded-full whitespace-nowrap -translate-x-1/2 transition-all duration-700 ease-out"
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
        <div className="hero-stats flex gap-[34px] flex-wrap mt-[22px] relative">
          <div className="hs flex flex-col gap-[3px]">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('kpi_cost', lang)}
            </div>
            <div className="big num text-[27px] font-bold font-mono tracking-tight">
              {fmt(d.total, currency, lang)}
            </div>
          </div>

          <div className="hs saved flex flex-col gap-[3px]">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('saved', lang)}
            </div>
            <div className="big num text-[27px] font-bold font-mono tracking-tight text-[#7af0e0]">
              {fmt(d.saved, currency, lang)}
            </div>
          </div>

          <div className="hs flex flex-col gap-[3px]">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('remaining', lang)}
            </div>
            <div className="big num text-[27px] font-bold font-mono tracking-tight">
              {fmt(d.remaining, currency, lang)}
            </div>
          </div>

          <div className="hs flex flex-col gap-[3px]">
            <div className="lab text-[11px] font-bold uppercase tracking-widest text-[#8FB8E0]">
              {t('departure', lang)}
            </div>
            <div className="big text-[19px] font-bold">{daysTxt}</div>
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
              {projLine ? ` · ${projLine}` : ''}
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
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[20px] mt-5">
        {/* Action Card & Savings Growth */}
        <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
          <div className="action-card flex items-center gap-[20px] flex-wrap justify-between">
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
              <div className="v num text-[30px] font-bold font-mono tracking-tight">
                {fmt(d.needMonth, currency, lang)}{' '}
                <small className="text-[15px] text-[var(--sub)] font-semibold">
                  {t('per_month', lang)}
                </small>
              </div>
            </div>

            <div className="pace flex gap-[26px] flex-wrap">
              <div className="p">
                <div className="n num text-[18px] font-bold font-mono">
                  {fmt(d.needWeek, currency, lang)}
                </div>
                <div className="l text-[11px] text-[var(--sub)] font-semibold uppercase tracking-wider">
                  {t('pace_week', lang)}
                </div>
              </div>

              <div className="p">
                <div className="n num text-[18px] font-bold font-mono">
                  {fmt(d.needDay, currency, lang)}
                </div>
                <div className="l text-[11px] text-[var(--sub)] font-semibold uppercase tracking-wider">
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

          <div className="mt-5.5">
            <div className="sec-head flex items-center justify-between gap-3 mb-1.5">
              <h2 className="text-[14px] font-extrabold">{t('growth_title', lang)}</h2>
            </div>
            {renderGrowthChart()}
          </div>
        </div>

        {/* Money Allocation Donut Card */}
        <div className="card bg-[var(--card)] border border-[var(--line)] rounded-[18px] shadow-sm p-[22px_24px]">
          <div className="sec-head flex items-center justify-between gap-3 mb-3.5">
            <h2 className="text-[15px] font-extrabold">{t('alloc_title', lang)}</h2>
          </div>
          {renderDonutChart()}
        </div>
      </div>
    </div>
  );
};
