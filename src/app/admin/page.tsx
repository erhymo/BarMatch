'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-10 pb-24 max-w-2xl">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Admin
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Admin-funksjoner er midlertidig deaktivert. Vi skrur dette på igjen når vi
          har ekte backend-data for bar-&gt;kamper, kampanjer og meldinger.
        </p>

        <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Målet nå er at appen kun viser ekte kampdata via API (se <b>/kamper</b>),
            og at barene på kartet fortsatt finnes som statiske lokasjoner.
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
