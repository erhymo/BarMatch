'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black px-4 pb-24">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700 space-y-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Bar Login
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Innlogging er midlertidig deaktivert mens vi fjerner demo/mock-data.
            Den kommer tilbake når vi har ekte bar-eier backend.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Tilbake til kartet
            </Link>
            <Link
              href="/kamper"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 transition-colors"
            >
              Se kamper
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
