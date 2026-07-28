import { CATS, T } from '../constants/translations';
import { BudgetInsight, ComputedMetrics, Currency, Language, TripData, TripReportData } from '../types';

export const NUM = (x: unknown): number => {
  const n = parseFloat(String(x));
  return isNaN(n) ? 0 : n;
};

export const esc = (s: unknown): string =>
  String(s == null ? '' : s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c)
  );

export const fmt = (n: number, currency: Currency, lang: Language): string => {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(Math.round(n || 0));
  } catch {
    return Math.round(n || 0) + '';
  }
};

export const pct = (x: number): string => Math.round((x || 0) * 100) + '%';

export const fdate = (d: Date | string, lang: Language): string => {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return dateObj.toISOString().slice(0, 10);
  }
};

export const today = (): string => new Date().toISOString().slice(0, 10);

export const med = (a: number[]): number => {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

export const mAdd = (k: string, n: number): string => {
  const [y, m] = k.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

export const mRange = (a: string, b: string): string[] => {
  const o: string[] = [];
  let k = a;
  let g = 0;
  while (k <= b && g++ < 600) {
    o.push(k);
    k = mAdd(k, 1);
  }
  return o;
};

export const t = (k: string, lang: Language): string =>
  (T[lang] || T.en)[k] || k;

export const catName = (c: { key: string; name?: string }, lang: Language): string =>
  c.name || (CATS.indexOf(c.key) >= 0 ? t('c_' + c.key, lang) : t('new_cat', lang));

export const daysLeft = (departure: string): number | null => {
  if (!departure) return null;
  const d = new Date(departure);
  if (isNaN(d.getTime())) return null;
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - n.getTime()) / 864e5);
};

export function computeMetrics(state: TripData): ComputedMetrics {
  const baseTotal = state.budget.reduce((a, c) => a + NUM(c.amount), 0);
  const reservePct =
    typeof state.reserve === 'number'
      ? state.reserve
      : state.reserve
      ? 15
      : 0;
  const total = baseTotal * (1 + reservePct / 100);
  const saved = state.savings.reduce((a, s) => a + NUM(s.amount), 0);
  const remaining = Math.max(0, total - saved);
  const progress = total > 0 ? Math.min(saved / total, 1) : 0;
  const days = daysLeft(state.departure);
  const dpos = days == null ? null : Math.max(0, days);

  const needMonth = dpos && dpos > 0 ? remaining / (dpos / 30.44) : remaining;
  const needWeek = dpos && dpos > 0 ? remaining / (dpos / 7) : remaining;
  const needDay = dpos && dpos > 0 ? remaining / dpos : remaining;

  const dep = state.savings
    .filter((s) => NUM(s.amount) > 0 && s.date)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const amts = dep.map((s) => NUM(s.amount));
  const isWind = (i: number) => {
    const rest = amts.filter((_, j) => j !== i);
    const m = med(rest);
    return m > 0 && amts[i] > 3 * m;
  };

  const windfall = amts.filter((_, i) => isWind(i)).reduce((a, b) => a + b, 0);

  let pace = 0;
  let meanMonthly = 0;
  let monthsTracked = 0;

  if (dep.length) {
    const nowK = today().slice(0, 7);
    const lastC = mAdd(nowK, -1);
    const firstK = dep[0].date.slice(0, 7);

    if (firstK <= lastC) {
      const months = mRange(firstK, lastC);
      const rec: Record<string, number> = {};
      months.forEach((k) => (rec[k] = 0));
      dep.forEach((s, i) => {
        const k = s.date.slice(0, 7);
        if (!isWind(i) && rec[k] !== undefined) {
          rec[k] += NUM(s.amount);
        }
      });
      const vals = months.map((k) => rec[k]);
      monthsTracked = months.length;
      meanMonthly = vals.reduce((a, b) => a + b, 0) / vals.length;
      pace = med(vals);
      if (pace <= 0) pace = meanMonthly;
    }
  }

  const provisional = monthsTracked < 3;
  const monthsToFinish = pace > 0 ? remaining / pace : Infinity;

  let proj: Date | null = null;
  let status: 'ontrack' | 'behind' | 'done' | 'nodate' = 'nodate';

  const depDate = state.departure ? new Date(state.departure + 'T00:00:00') : null;

  if (!depDate || isNaN(depDate.getTime())) {
    status = 'nodate';
  } else if (remaining <= 0) {
    status = 'done';
  } else if (isFinite(monthsToFinish)) {
    proj = new Date();
    proj.setDate(proj.getDate() + Math.round(monthsToFinish * 30.44));
    status = proj <= depDate ? 'ontrack' : 'behind';
  } else {
    status = 'behind';
  }

  return {
    baseTotal,
    total,
    saved,
    remaining,
    progress,
    days,
    needMonth,
    needWeek,
    needDay,
    pace,
    meanMonthly,
    windfall,
    provisional,
    monthsTracked,
    proj,
    status,
  };
}

export function simulateExtraSavings(
  state: TripData,
  extraPerMonth: number
): { newProj: Date | null; daysSaved: number } {
  const m = computeMetrics(state);
  if (m.remaining <= 0) {
    return { newProj: m.proj, daysSaved: 0 };
  }

  const effectiveExtra = Math.max(0, extraPerMonth);
  const newPace = m.pace + effectiveExtra;

  if (newPace <= 0) {
    return { newProj: null, daysSaved: 0 };
  }

  const newMonthsToFinish = m.remaining / newPace;
  const newProj = new Date();
  newProj.setDate(newProj.getDate() + Math.round(newMonthsToFinish * 30.44));

  let daysSaved = 0;
  if (m.proj) {
    const diffMs = m.proj.getTime() - newProj.getTime();
    daysSaved = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  return { newProj, daysSaved };
}

export function hexa(hex: string, a: number): string {
  if (hex.indexOf('#') < 0) return hex;
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(
    h.slice(4, 6),
    16
  )},${a})`;
}

export function getBudgetInsights(
  state: TripData,
  metrics: ComputedMetrics
): BudgetInsight[] {
  const insights: BudgetInsight[] = [];
  const lang = state.lang;
  const currency = state.currency;

  // 1. Goal reached
  if (metrics.progress >= 1 && metrics.total > 0) {
    insights.push({
      type: 'success',
      textKey: 'insight_goal_reached',
    });
  }

  // 2. High category concentration (> 45%)
  if (metrics.baseTotal > 0) {
    state.budget.forEach((c) => {
      const amt = NUM(c.amount);
      if (amt / metrics.baseTotal > 0.45) {
        const cName = catName(c, lang);
        const pctVal = Math.round((amt / metrics.baseTotal) * 100) + '%';
        insights.push({
          type: 'warning',
          textKey: 'insight_cat_exceeds',
          params: { cat: cName, pct: pctVal },
        });
      }
    });
  }

  // 3. Expense over budget
  const overExpenses = state.expenses
    .map((e) => {
      const b = NUM(e.budgeted);
      const a = NUM(e.actual);
      const diff = a - b;
      return { desc: e.desc || catName({ key: e.cat }, lang), diff };
    })
    .filter((e) => e.diff > 0)
    .sort((a, b) => b.diff - a.diff);

  if (overExpenses.length > 0) {
    const topOver = overExpenses[0];
    insights.push({
      type: 'warning',
      textKey: 'insight_expense_over',
      params: {
        desc: topOver.desc,
        diff: fmt(topOver.diff, currency, lang),
      },
    });
  }

  // 4. Departure in < 90 days and saved < 50%
  if (
    metrics.days != null &&
    metrics.days > 0 &&
    metrics.days < 90 &&
    metrics.progress < 0.5 &&
    metrics.remaining > 0
  ) {
    insights.push({
      type: 'warning',
      textKey: 'insight_days_low_progress',
      params: {
        days: String(metrics.days),
        pct: Math.round(metrics.progress * 100) + '%',
      },
    });
  }

  // 5. Savings pace comparison between current and previous month
  const dep = state.savings
    .filter((s) => NUM(s.amount) > 0 && s.date)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (dep.length) {
    const monthTotals: Record<string, number> = {};
    dep.forEach((s) => {
      const k = s.date.slice(0, 7);
      monthTotals[k] = (monthTotals[k] || 0) + NUM(s.amount);
    });
    const months = Object.keys(monthTotals).sort();
    if (months.length >= 2) {
      const currMonth = months[months.length - 1];
      const prevMonth = months[months.length - 2];
      const currVal = monthTotals[currMonth];
      const prevVal = monthTotals[prevMonth];
      const diffVal = currVal - prevVal;

      if (diffVal > 0) {
        insights.push({
          type: 'success',
          textKey: 'insight_pace_up',
          params: { diff: fmt(diffVal, currency, lang) },
        });
      } else if (diffVal < 0) {
        insights.push({
          type: 'info',
          textKey: 'insight_pace_down',
          params: { diff: fmt(Math.abs(diffVal), currency, lang) },
        });
      }
    }
  }

  return insights.slice(0, 4);
}

export function getFinalTripReport(
  state: TripData,
  metrics: ComputedMetrics
): TripReportData {
  const lang = state.lang;
  const initialBudget = metrics.total;
  const totalSpent = state.expenses.reduce((a, e) => a + NUM(e.actual), 0);
  const difference = initialBudget - totalSpent;

  // Calculate total trip days
  let totalTripDays = 1;
  const todayStr = today();

  if (state.departure && state.returnDate) {
    const depTs = new Date(state.departure).getTime();
    const retTs = new Date(state.returnDate).getTime();
    if (!isNaN(depTs) && !isNaN(retTs) && retTs >= depTs) {
      totalTripDays = Math.max(1, Math.ceil((retTs - depTs) / (1000 * 60 * 60 * 24)) + 1);
    }
  } else if (state.departure) {
    const depTs = new Date(state.departure).getTime();
    const todayTs = new Date(todayStr).getTime();
    if (!isNaN(depTs)) {
      const endTs = Math.max(depTs, todayTs);
      totalTripDays = Math.max(1, Math.ceil((endTs - depTs) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const avgDailySpend = totalSpent / Math.max(1, totalTripDays);

  // Most expensive category
  const catTotals: Record<string, number> = {};
  state.expenses.forEach((e) => {
    const actualAmt = NUM(e.actual);
    if (actualAmt > 0) {
      catTotals[e.cat] = (catTotals[e.cat] || 0) + actualAmt;
    }
  });

  let topCatKey: string | null = null;
  let maxCatAmount = 0;
  Object.entries(catTotals).forEach(([k, amt]) => {
    if (amt > maxCatAmount) {
      maxCatAmount = amt;
      topCatKey = k;
    }
  });

  const mostExpensiveCategory = topCatKey
    ? {
        key: topCatKey,
        name: catName({ key: topCatKey }, lang),
        amount: maxCatAmount,
      }
    : null;

  const isTripEnded = !!(state.returnDate && state.returnDate < todayStr);

  return {
    initialBudget,
    totalSpent,
    difference,
    mostExpensiveCategory,
    avgDailySpend,
    totalTripDays,
    isTripEnded,
  };
}

