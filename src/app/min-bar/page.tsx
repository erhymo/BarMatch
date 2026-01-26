'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function MinBarPage() {
  const { isAuthenticated, currentBar } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            Min bar
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
            Området for bar-eiere. Herfra går du videre til admin-dashboardet der du styrer profil,
            kampoppsett, kampanjer og meldinger.
          </p>

          {!isAuthenticated && (
            <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-full bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">🔐</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    Kun for bar-eiere
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Logg inn med bar-kontoen din for å administrere kampoppsett, kampanjer,
                    chat/bordforespørsler og annen informasjon om baren din.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors w-full sm:w-auto"
                >
                  Gå til bar-login
                </Link>
              </div>

              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Har du ikke fått innlogging ennå? Denne demoen bruker forhåndsdefinerte barer
                som du finner på innloggingssiden.
              </p>
            </div>
          )}

          {isAuthenticated && (
            <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-8 rounded-full bg-green-600/10 dark:bg-green-500/20 flex items-center justify-center">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    Du er logget inn
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {currentBar
                      ? `Administrer ${currentBar.name} i admin-dashboardet.`
                      : 'Åpne admin-dashboardet for å administrere baren din.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors w-full sm:w-auto"
                >
                  Åpne admin-dashboard
                </Link>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Her styrer du kampoppsett, kalender, kampanjer, chat og barprofil.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
