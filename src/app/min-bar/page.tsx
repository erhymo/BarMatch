'use client';

import Link from 'next/link';

export default function MinBarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-10 pb-24 max-w-2xl">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Min bar
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Dette området kommer senere, når vi har ekte bar-eier data (profil,
          kampoppsett og meldinger) fra backend.
        </p>

        <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Foreløpig: bruk <b>/kamper</b> for ekte kampdata, og kartet for å finne
            barer.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Tilbake til kartet
            </Link>
            <Link
              href="/kamper"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Se kamper
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
