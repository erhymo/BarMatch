'use client';

import type { BarProfileFormState } from '@/lib/admin/bar/types';

interface BarProfilePreviewProps {
  profile: BarProfileFormState | null;
  previewName: string;
  previewAddress: string;
  previewPhone: string;
  previewScreensLabel: string;
  previewFoodLabel: string;
  previewFacilityBadges: string[];
  previewCapacityLabel: string;
}

export function BarProfilePreview({
  profile, previewName, previewAddress, previewPhone,
  previewScreensLabel, previewFoodLabel, previewFacilityBadges, previewCapacityLabel,
}: BarProfilePreviewProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Forhåndsvisning for brukere</h2>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Slik vil baren din se ut i kartet og detaljvisningen for supportere.
      </p>
      {!profile ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Laster forhåndsvisning…</p>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{previewName}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              <span>📍</span><span>{previewAddress}</span>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>📺 {previewScreensLabel}</Badge>
            <Badge>🍽️ {previewFoodLabel}</Badge>
            <Badge>👥 {previewCapacityLabel}</Badge>
          </div>
          {previewFacilityBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previewFacilityBadges.map((badge) => <Badge key={badge}>{badge}</Badge>)}
            </div>
          )}
          {profile.description.trim().length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">Om baren</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line">{profile.description}</p>
            </div>
          )}
          {profile.specialOffers.trim().length > 0 && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-50">
              <p className="text-[11px] font-medium uppercase tracking-wide">Tilbud &amp; kamp</p>
              <p className="mt-1 whitespace-pre-line">{profile.specialOffers}</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {previewPhone ? (
              <a href={`tel:${previewPhone}`} className="flex-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors text-center text-xs">📞 Ring</a>
            ) : (
              <div className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium rounded-lg text-center text-xs">📞 Ingen telefon</div>
            )}
          </div>
          <p className="mt-3 text-[10px] text-zinc-500 dark:text-zinc-400">
            Dette er kun en forhåndsvisning. Den faktiske visningen i appen avhenger også av synlighet og hvilke kamper du har valgt.
          </p>
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {children}
    </span>
  );
}

