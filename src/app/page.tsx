import type { Metadata } from 'next';

const CONTACT_EMAIL = 'support@where2watch.no';

export const metadata: Metadata = {
  title: 'Where2Watch er satt på pause',
  description: 'Where2Watch er for øyeblikket ikke i aktiv drift.',
};

export default function PausedPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-200 shadow-sm backdrop-blur">
          Where2Watch
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Where2Watch er satt på pause
        </h1>

        <p className="mt-6 text-lg leading-8 text-zinc-300">
          Where2Watch er for øyeblikket ikke i aktiv drift. Tjenesten er derfor
          ikke tilgjengelig for nye eller eksisterende brukere akkurat nå.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-left shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <h2 className="text-xl font-semibold text-white">Spørsmål?</h2>
          <p className="mt-3 text-zinc-300">
            Har du spørsmål om appen, data eller tidligere bruk av tjenesten,
            kan du kontakte oss på e-post.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 sm:w-auto"
          >
            Send e-post til {CONTACT_EMAIL}
          </a>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          Takk til alle som har testet og brukt Where2Watch.
        </p>

      </section>
    </main>
  );
}