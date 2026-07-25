export type Language = 'it' | 'en';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD';
export type Page = 'overview' | 'budget' | 'savings' | 'trip' | 'team';
export type DepositMethod = 'auto' | 'manual' | 'cashback' | 'cash';
export type Theme = 'light' | 'dark';

export interface CategoryItem {
  key: string;
  name?: string;
  amount: string;
}

export interface DepositItem {
  date: string;
  amount: string;
  method: DepositMethod;
  note: string;
  who: number;
}

export interface ContributorItem {
  name: string;
  share: string;
}

export interface ExpenseItem {
  date: string;
  cat: string;
  desc: string;
  budgeted: string;
  actual: string;
}

export interface TripData {
  page: Page;
  lang: Language;
  currency: Currency;
  theme: Theme;
  reserve: boolean;
  destination: string;
  departure: string;
  tripLabel?: string;
  contributors: ContributorItem[];
  budget: CategoryItem[];
  savings: DepositItem[];
  expenses: ExpenseItem[];
}

export interface Trip {
  id: string;
  data: TripData;
}

export interface AppDatabase {
  v: number;
  activeId: string;
  lang: Language;
  theme: Theme;
  page: Page;
  hideCk?: boolean;
  seen?: boolean;
  trips: Trip[];
}

export interface ComputedMetrics {
  baseTotal: number;
  total: number;
  saved: number;
  remaining: number;
  progress: number;
  days: number | null;
  needMonth: number;
  needWeek: number;
  needDay: number;
  pace: number;
  meanMonthly: number;
  windfall: number;
  provisional: boolean;
  monthsTracked: number;
  proj: Date | null;
  status: 'ontrack' | 'behind' | 'done' | 'nodate';
}
