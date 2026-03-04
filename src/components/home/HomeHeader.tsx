'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation, LOCALE_FLAGS, LOCALE_LABELS } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const LOCALES: Locale[] = ['no', 'en'];

interface HomeHeaderProps {
  matchId: string | null;
  activeMatchDescription: string | null;
  selectedTeam: string | null;
  isCityPanelOpen: boolean;
  onToggleCityPanel: () => void;
  onClearMatchFilter: () => void;
}

export default function HomeHeader({
  matchId,
  activeMatchDescription,
  selectedTeam,
  isCityPanelOpen,
  onToggleCityPanel,
  onClearMatchFilter,
}: HomeHeaderProps) {
  const { t, locale, setLocale } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [isIosApp, setIsIosApp] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Detect iOS WKWebView wrapper
  useEffect(() => {
    setIsIosApp(!!(window as any).webkit?.messageHandlers?.['push-permission-request']);
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-shrink-0 bg-white/90 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 relative z-20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Flag + Hjem + Kamper */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div ref={langRef} className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300/70 dark:border-zinc-600/80 px-2 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Change language"
              >
                {LOCALE_FLAGS[locale]}
              </button>
              {langOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg overflow-hidden min-w-[140px]">
                  {LOCALES.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => { setLocale(loc); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                        locale === loc
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span className="text-base">{LOCALE_FLAGS[loc]}</span>
                      <span>{LOCALE_LABELS[loc]}</span>
                      {locale === loc && <span className="ml-auto text-emerald-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isIosApp && (
              <>
                <Link
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('where2watch:reset-home-filters'));
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300/70 dark:border-zinc-600/80 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  {t('nav_home')}
                </Link>
                <Link
                  href="/kamper"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300/70 dark:border-zinc-600/80 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  {t('nav_matches')}
                </Link>
              </>
            )}
          </div>

          <div className="flex-1 text-center">
            {matchId ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {t('home_filtering_match')}
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  {activeMatchDescription ? (
                    <>
                      {t('home_showing_bars_for')}{' '}
                      <span className="font-medium">{activeMatchDescription}</span>
                    </>
                  ) : (
                    t('home_showing_bars_for_match')
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClearMatchFilter}
                  className="mt-1 inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                >
                  {t('home_clear_match_filter')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-300 bg-clip-text text-transparent font-semibold tracking-tight text-lg md:text-2xl drop-shadow-sm">
                    where
                    <span className="font-black tracking-normal">2</span>
                    watch
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {selectedTeam
                    ? `Filter: ${selectedTeam}`
                    : t('home_go_to_matches')}
                </div>
              </>
            )}
          </div>

          {/* Right side: Lokasjon + Logg inn (web only) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={onToggleCityPanel}
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
                isCityPanelOpen
                  ? 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-200'
                  : 'border-zinc-300/70 dark:border-zinc-600/80 text-zinc-700 dark:text-zinc-200'
              }`}
              aria-label={t('home_location')}
            >
              <span className="text-xs font-medium tracking-tight">{t('home_location')}</span>
            </button>
            {!isIosApp && (
              <Link
                href="/admin"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300/70 dark:border-zinc-600/80 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {t('nav_login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

