export default function OnboardSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Betaling registrert</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Takk! Abonnementet ditt er registrert. Baren din er fortsatt usynlig til du skrur på synlighet.
      </p>
      <a
        href="/admin/bar"
        className="mt-6 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Gå til bar-panelet
      </a>
    </div>
  );
}

