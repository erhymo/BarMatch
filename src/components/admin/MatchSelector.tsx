'use client';

interface MatchSelectorProps {
  selectedMatchIds: string[];
  onMatchSelectionChange: (matchIds: string[]) => void;
}

export default function MatchSelector({
  selectedMatchIds,
  onMatchSelectionChange,
}: MatchSelectorProps) {
  // Keep props for compatibility, but disable the feature until we have real backend data.
  void selectedMatchIds;
  void onMatchSelectionChange;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-4">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Kampvalg er midlertidig deaktivert mens vi fjerner demo/mock-data. Dette
        kommer tilbake når vi har ekte bar-&gt;kamp data fra backend.
      </p>
    </div>
  );
}
