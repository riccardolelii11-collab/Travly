import React, { useState } from 'react';
import { Page, Theme, Language, Trip } from '../types';
import { daysLeft, t } from '../utils/calculations';

interface SidebarRailProps {
  activePage: Page;
  theme: Theme;
  lang: Language;
  departure: string;
  trips?: Trip[];
  activeId?: string;
  onSwitchTrip?: (id: string) => void;
  onNewTrip?: () => void;
  onSelectPage: (p: Page) => void;
  onToggleTheme: () => void;
  onOpenSupabase?: () => void;
  isSupabaseConfigured?: boolean;
  onOpenReport?: () => void;
  onHelp?: () => void;
}

const NAV_ICONS: Record<Page, React.ReactNode> = {
  overview: <span className="text-base">◎</span>,
  budget: <span className="text-base">▦</span>,
  savings: <span className="text-base">◷</span>,
  trip: <span className="text-base">✈</span>,
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
      className="inline-block align-middle"
    >
      <circle cx="8.5" cy="8.5" r="3.2" />
      <path d="M2.8 19.5c0-3.1 2.6-5.2 5.7-5.2s5.7 2.1 5.7 5.2" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M15.5 14.6c3 .1 5.4 2.2 5.4 5.3" />
    </svg>
  ),
  travel: <span className="text-base">🧳</span>,
};

const BASE_PAGES_LIST: Page[] = ['overview', 'budget', 'savings', 'trip', 'team'];

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activePage,
  theme,
  lang,
  departure,
  trips,
  activeId,
  onSwitchTrip,
  onNewTrip,
  onSelectPage,
  onToggleTheme,
  onOpenSupabase,
  isSupabaseConfigured,
  onOpenReport,
  onHelp,
}) => {
  const dl = daysLeft(departure);
  const isTravelActive = dl != null && dl <= 0;

  const pagesList: Page[] = [...BASE_PAGES_LIST];
  if (isTravelActive || activePage === 'travel') {
    pagesList.push('travel');
  }

  return (
    <>
      {/* Mobile / Tablet Top Header (< lg) - Clean without hamburger menu */}
      <div className="lg:hidden sticky top-0 z-40 bg-gradient-to-r from-[#0B1B3A] via-[#0E2A50] to-[#0B1B3A] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2" onClick={() => onSelectPage('overview')}>
          <div className="w-[30px] h-[30px] rounded-[9px] bg-[#12B5A5] grid place-items-center text-[#062420] font-extrabold text-[15px] shadow-[0_4px_12px_rgba(18,181,165,0.4)]">
            ✦
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-tight leading-none">Travly</div>
            <div className="text-[9.5px] text-[#7E93B6] font-semibold leading-tight">
              {t('tagline', lang)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {departure && (
            <div className="text-[10.5px] bg-white/10 px-2.5 py-1 rounded-full text-[#9FB1CE] font-medium flex items-center gap-1">
              <span className="text-white font-bold">{dl == null ? '—' : Math.max(0, dl)}</span>
              <span className="hidden xs:inline">{t('days_to', lang)}</span>
            </div>
          )}
          <button
            onClick={onToggleTheme}
            className="w-[34px] h-[34px] rounded-[10px] border border-white/15 bg-white/10 text-white text-[14px] grid place-items-center active:scale-95 transition-transform cursor-pointer"
            title="Cambia tema"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Sidebar (>= lg) */}
      <aside className="hidden lg:flex sticky top-0 self-start flex-none w-[236px] h-screen bg-gradient-to-b from-[#0B1B3A] to-[#0E2A50] flex-col p-[22px_16px] gap-[6px] text-white z-40">
        {/* Brand Header */}
        <div className="brand flex items-center gap-[11px] p-[6px_8px_22px]">
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
        <nav className="nav flex flex-col gap-[3px]">
          {pagesList.map((p) => {
            const isActive = activePage === p;
            return (
              <button
                key={p}
                onClick={() => onSelectPage(p)}
                className={`flex items-center gap-[12px] w-full text-left border-none bg-transparent rounded-[11px] p-[11px_12px] text-[14px] transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-white font-bold [&>span:first-child]:text-[#12B5A5]'
                    : 'text-[#9FB1CE] font-semibold hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="w-[20px] text-center">{NAV_ICONS[p]}</span>
                <span>{t('nav_' + p, lang)}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="foot mt-auto pt-[14px] border-t border-white/[0.08] flex items-center justify-between gap-2">
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
            className="icon-btn w-[36px] h-[36px] rounded-[10px] border border-white/[0.14] bg-white/[0.06] text-white text-[15px] grid place-items-center hover:bg-white/[0.12] transition-colors cursor-pointer"
            title="Tema"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </aside>

      {/* Mobile / Tablet Bottom Tab Navigation Bar (< lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B1B3A]/95 backdrop-blur-md border-t border-white/15 px-1.5 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] flex justify-around items-center text-white shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {pagesList.map((p) => {
          const isActive = activePage === p;
          return (
            <button
              key={p}
              onClick={() => onSelectPage(p)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
                isActive ? 'text-[#12B5A5] font-extrabold' : 'text-[#9FB1CE] hover:text-white'
              }`}
            >
              <span className={`text-[17px] transition-transform ${isActive ? 'scale-110' : 'opacity-80'}`}>
                {NAV_ICONS[p]}
              </span>
              <span className="text-[9.5px] tracking-tight truncate max-w-[62px] mt-0.5">
                {t('nav_' + p, lang)}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};


