'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
	  { name: 'Hjem', href: '/' },
	  { name: 'Kamper', href: '/kamper' },
	];

export default function Navigation() {
	  const pathname = usePathname();

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

  return (
    <>
	      {/* Top navigation (desktop/tablet) */}
	      <nav className="hidden md:block bg-white dark:bg-zinc-800 shadow-md">
	        <div className="container mx-auto px-4">
	          <div className="flex items-center justify-between h-16">
	            <div className="flex items-center space-x-1">
	              <Link
	                href="/"
	                className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mr-8"
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
	              item.name === 'Hjem'
	                ? 'Hjem/resett'
	                : item.name === 'Kamper'
	                ? 'Kamper'
	                : item.name;

	            return (
	              <Link
	                key={item.href}
	                href={item.href}
			                onClick={item.href === '/' ? handleHomeClick : undefined}
	                className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors ${
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

