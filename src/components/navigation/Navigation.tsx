'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { name: 'Hjem', href: '/' },
  { name: 'Kamper', href: '/kamper' },
  { name: 'Min bar', href: '/min-bar' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

	  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
	    if (pathname === '/') {
	      event.preventDefault();
	      window.dispatchEvent(
	        new CustomEvent('where2watch:reset-home-filters'),
	      );
	    }
	  };

  const isActive = (href: string) => {
    // Treat /admin as part of "Min bar" for highlighting
    if (href === '/min-bar') {
      return pathname === '/min-bar' || pathname === '/admin';
    }
    return pathname === href;
  };

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
	
	            {/* Right side: login/admin actions */}
	            <div>
	              {isAuthenticated ? (
	                <Link
	                  href="/admin"
	                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
	                    pathname === '/admin'
	                      ? 'bg-blue-600 text-white dark:bg-blue-500'
	                      : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-zinc-700'
	                  }`}
	                >
	                  Admin
	                </Link>
	              ) : (
	                <Link
	                  href="/login"
	                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
	                    pathname === '/login'
	                      ? 'bg-blue-600 text-white dark:bg-blue-500'
	                      : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-zinc-700'
	                  }`}
	                >
	                  Bar Login
	                </Link>
	              )}
	            </div>
	          </div>
	        </div>
	      </nav>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 md:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-around h-16 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href);

	            let icon = '⚽';
	            if (item.name === 'Hjem') icon = '🏠';
	            if (item.name === 'Kamper') icon = '📅';
	            if (item.name === 'Min bar') icon = '🍻';

            return (
              <Link
                key={item.href}
                href={item.href}
		                onClick={item.href === '/' ? handleHomeClick : undefined}
                className={`flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                  active
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

