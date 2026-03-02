'use client';

import type { MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation, LOCALE_FLAGS, LOCALE_LABELS } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const LOCALES: Locale[] = ['no', 'en'];

export default function Navigation() {
	  const pathname = usePathname();
	  const [langOpen, setLangOpen] = useState(false);
	  const langRef = useRef<HTMLDivElement>(null);
	  const { t, locale, setLocale } = useTranslation();

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

	  const navItems = useMemo(
	    () => [
	      { name: t('nav_home'), href: '/' },
	      { name: t('nav_matches'), href: '/kamper' },
	    ],
	    [t],
	  );

	  // Hide the public navigation inside admin/onboarding areas
	  // (admin has its own layout/header)
	  if (pathname?.startsWith('/admin') || pathname?.startsWith('/onboard')) {
	    return null;
	  }

	  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
	    if (pathname === '/') {
	      event.preventDefault();
	      window.dispatchEvent(
	        new CustomEvent('where2watch:reset-home-filters'),
	      );
	    }
	  };

	  const isActive = (href: string) => pathname === href;

	  const langButton = (
	    <div ref={langRef} className="relative">
	      <button
	        type="button"
	        onClick={() => setLangOpen((prev) => !prev)}
	        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
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
	  );

  return (
    <>
	      {/* Top navigation (desktop/tablet) */}
	      <nav className="hidden md:block bg-white dark:bg-zinc-800 shadow-md">
	        <div className="container mx-auto px-4">
	          <div className="flex items-center justify-between h-16">
	            <div className="flex items-center space-x-1">
	              {langButton}
	              <Link
	                href="/"
	                className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mr-8 ml-2"
	              >
	                where2watch
	              </Link>

	              <div className="flex space-x-1">
	                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
	                    onClick={item.href === '/' ? handleHomeClick : undefined}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
	              </div>
	            </div>

	          </div>
	        </div>
	      </nav>

	      {/* Bottom navigation (mobile) */}
	      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 md:hidden">
	        <div className="max-w-xl mx-auto flex items-center justify-around h-16 px-4">
	          {navItems.map((item) => {
	            const active = isActive(item.href);

	            const label =
	              item.href === '/'
	                ? t('nav_home_reset')
	                : item.name;

	            return (
	              <Link
	                key={item.href}
	                href={item.href}
			                onClick={item.href === '/' ? handleHomeClick : undefined}
	                className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
	                  active
	                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
	                    : 'border-zinc-300/70 text-zinc-700 dark:border-zinc-600/80 dark:text-zinc-200'
	                }`}
	              >
	                <span className="text-xs font-medium tracking-tight">{label}</span>
	              </Link>
	            );
	          })}
	        </div>
	      </nav>
    </>
  );
}

