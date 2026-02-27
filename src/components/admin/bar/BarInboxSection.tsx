'use client';

import type { BarMessage } from '@/lib/admin/bar/types';

function formatMessageCategory(category: string | null | undefined): string {
  switch (category) {
    case 'booking': return 'Bordreservasjon / større følge';
    case 'match_question': return 'Spørsmål om kamp';
    case 'other':
    default: return 'Annet / ikke spesifisert';
  }
}

interface BarInboxSectionProps {
  barName: string | undefined;
  messages: BarMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  messagesOpen: boolean;
  unreadMessages: BarMessage[];
  readMessages: BarMessage[];
  unreadMessageCount: number;
  onToggle: () => void;
}

function MessageCard({ msg, barName }: { msg: BarMessage; barName: string | undefined }) {
  const createdLabel = msg.createdAt && typeof msg.createdAt === 'string'
    ? new Date(msg.createdAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })
    : 'Ukjent tidspunkt';
  const subjectBase = barName ? `Svar: melding til ${barName}` : 'Svar: melding via where2watch';
  const bodyBase =
    `Hei${msg.name ? ' ' + msg.name : ''},\n\n` +
    `Takk for meldingen din til ${barName ?? 'baren vår'} via where2watch.\n\n` +
    '---\nOriginal melding:\n' + msg.message;
  const replyHref = `mailto:${encodeURIComponent(msg.email)}?subject=${encodeURIComponent(subjectBase)}&body=${encodeURIComponent(bodyBase)}`;

  return (
    <div className={`rounded-xl border p-3 ${msg.readByBar ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900' : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{msg.name || 'Ukjent navn'}</div>
          <div className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            {msg.email}{msg.phone ? ` · ${msg.phone}` : ''}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              {formatMessageCategory(msg.category)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>{createdLabel}</span>
          {!msg.readByBar && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">Ny</span>
          )}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-xs text-zinc-700 dark:text-zinc-200">{msg.message}</p>
      <div className="mt-2 flex justify-end">
        <a href={replyHref} className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">Svar</a>
      </div>
    </div>
  );
}

export function BarInboxSection({
  barName, messages, messagesLoading, messagesError, messagesOpen,
  unreadMessages, readMessages, unreadMessageCount, onToggle,
}: BarInboxSectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Innboks</div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Meldinger fra kunder</div>
            <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {messagesLoading ? 'Laster meldinger...'
                : unreadMessageCount > 0 ? `${unreadMessageCount} ulest${unreadMessageCount === 1 ? '' : 'e'} melding${unreadMessageCount === 1 ? '' : 'er'}`
                : messages.length > 0 ? 'Ingen uleste meldinger'
                : 'Ingen meldinger ennå'}
            </div>
            {messagesError && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{messagesError}</div>}
          </div>
          <div className="flex items-center gap-2">
            {unreadMessageCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">{unreadMessageCount}</span>
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{messagesOpen ? 'Skjul' : 'Vis'}</span>
          </div>
        </button>
        {messagesOpen && (
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-xs">
            {messages.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">Ingen meldinger ennå.</p>
            ) : (
              <>
                {unreadMessages.length > 0 && (
                  <div className="space-y-2">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Nye meldinger</div>
                    {unreadMessages.map((m) => <MessageCard key={m.id} msg={m} barName={barName} />)}
                  </div>
                )}
                {readMessages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="mb-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Tidligere meldinger</div>
                    {readMessages.map((m) => <MessageCard key={m.id} msg={m} barName={barName} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

