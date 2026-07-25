import React from 'react';
import { Page, Theme } from '../types';
import { daysLeft, t } from '../utils/calculations';
import { Language } from '../types';

interface SidebarRailProps {
  activePage: Page;
  theme: Theme;
  lang: Language;
  departure: string;
  onSelectPage: (p: Page) => void;
  onToggleTheme: () => void;
}

const NAV_ICONS: Record<Page, React.ReactNode> = {
  overview: <span className="text-base opacity-90">◎</span>,
  budget: <span className="text-base opacity-90">▦</span>,
  savings: <span className="text-base opacity-90">◷</span>,
  trip: <span className="text-base opacity-90">✈</span>,
  team: (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-[-3px]"
    >
      <circle cx="8.5" cy="8.5" r="3.2" />
      <path d="M2.8 19.5c0-3.1 2.6-5.2 5.7-5.2s5.7 2.1 5.7 5.2" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M15.5 14.6c3 .1 5.4 2.2 5.4 5.3" />
    </svg>
  ),
};

const PAGES_LIST: Page[] = ['overview', 'budget', 'savings', 'trip', 'team'];

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activePage,
  theme,
  lang,
  departure,
  onSelectPage,
  onToggleTheme,
}) => {
  const dl = daysLeft(departure);

  return (
    <aside className="rail sticky top-0 self-start flex-none w-[236px] h-screen bg-gradient-to-b from-[#0B1B3A] to-[#0E2A50] flex flex-col p-[22px_16px] gap-[6px] text-white z-40 max-lg:w-full max-lg:h-auto max-lg:flex-row max-lg:align-center max-lg:overflow-x-auto max-lg:p-3">
      {/* Brand Header */}
      <div className="brand flex items-center gap-[11px] p-[6px_8px_22px] max-lg:hidden">
        <div className="mark w-[36px] h-[36px] rounded-[11px] bg-[#12B5A5] grid place-items-center text-[#062420] font-extrabold text-[18px] shadow-[0_6px_18px_rgba(18,181,165,0.4)]">
          ✦
        </div>
        <div>
          <div className="name font-extrabold text-[18px] tracking-tight">Travly</div>
          <div className="tag text-[10px] text-[#7E93B6] font-semibold tracking-normal">
            {t('tagline', lang)}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="nav flex flex-col gap-[3px] max-lg:flex-row max-lg:gap-[6px]">
        {PAGES_LIST.map((p) => {
          const isActive = activePage === p;
          return (
            <button
              key={p}
              onClick={() => onSelectPage(p)}
              className={`flex items-center gap-[12px] w-full text-left border-none bg-transparent rounded-[11px] p-[11px_12px] text-[14px] transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white font-bold [&>span:first-child]:text-[#12B5A5]'
                  : 'text-[#9FB1CE] font-semibold hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="w-[20px] text-center">{NAV_ICONS[p]}</span>
              <span className="lb max-lg:hidden">{t('nav_' + p, lang)}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="foot mt-auto pt-[14px] border-t border-white/[0.08] flex items-center justify-between gap-2 max-lg:hidden">
        <div className="when text-[11px] text-[#9FB1CE] leading-snug">
          {departure ? (
            <>
              <b className="num text-white font-bold">{dl == null ? '—' : Math.max(0, dl)}</b>{' '}
              {t('days_to', lang)}
            </>
          ) : (
            t('no_date', lang)
          )}
        </div>
        <button
          onClick={onToggleTheme}
          className="icon-btn w-[36px] h-[36px] rounded-[10px] border border-white/[0.14] bg-white/[0.06] text-white text-[15px] grid place-items-center hover:bg-white/[0.12] transition-colors"
          title="Tema"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </aside>
  );
};
