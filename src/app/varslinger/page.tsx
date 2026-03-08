'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePushNotifications } from '@/lib/hooks';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/contexts/ToastContext';
import { FAVORITE_TEAM_OPTIONS } from '@/lib/config/favoriteTeams';
import type { Bar } from '@/lib/models';
import { useTranslation } from '@/lib/i18n';

export default function VarslingerPage() {
  const {
    isNativeApp,
    permissionStatus,
    deviceToken,
    isSaving,
    requestPermission,
    savePreferences,
  } = usePushNotifications();

  const { favoriteTeams } = useFavorites();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Local state for push-specific selections
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedBarIds, setSelectedBarIds] = useState<string[]>([]);
  const [bars, setBars] = useState<Bar[]>([]);
  const [barsLoading, setBarsLoading] = useState(true);
  const [teamQuery, setTeamQuery] = useState('');
  const [hasSaved, setHasSaved] = useState(false);

  // Initialize selected teams from favorites
  useEffect(() => {
    if (favoriteTeams.length > 0 && selectedTeams.length === 0 && !hasSaved) {
      setSelectedTeams(favoriteTeams);
    }
  }, [favoriteTeams, selectedTeams.length, hasSaved]);

  // Fetch public bars for bar selection
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/bars');
        if (!res.ok) return;
        const data = (await res.json()) as { bars?: Bar[] };
        if (!cancelled && Array.isArray(data.bars)) {
          setBars(data.bars);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setBarsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  const filteredTeamOptions = useMemo(() => {
    const q = teamQuery.trim().toLowerCase();
    if (!q) return FAVORITE_TEAM_OPTIONS;
    return FAVORITE_TEAM_OPTIONS.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamQuery]);

  const toggleTeam = (name: string) => {
    setSelectedTeams((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const toggleBar = (barId: string) => {
    setSelectedBarIds((prev) =>
      prev.includes(barId) ? prev.filter((b) => b !== barId) : [...prev, barId],
    );
  };

  const handleSave = async () => {
    try {
      await savePreferences(selectedTeams, selectedBarIds);
      setHasSaved(true);
      showToast({ description: t('push_saved'), variant: 'success' });
    } catch (e) {
      showToast({
        description: e instanceof Error ? e.message : t('push_save_error'),
        variant: 'error',
      });
    }
  };

  // If not in a native app, show a message
  if (!isNativeApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <main className="container mx-auto px-4 py-12 pb-24">
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="text-4xl">📱</div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {t('push_title')}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('push_app_only')}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const isPushEnabled = permissionStatus === 'granted';

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <header className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              🔔 {t('push_header')}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('push_subtitle')}
            </p>
          </header>

          {/* Push permission card */}
          <PermissionCard
            status={permissionStatus}
            onRequest={requestPermission}
          />

          {/* Team selection */}
          {isPushEnabled && (
            <TeamSelection
              selectedTeams={selectedTeams}
              teamQuery={teamQuery}
              onTeamQueryChange={setTeamQuery}
              filteredOptions={filteredTeamOptions}
              onToggle={toggleTeam}
            />
          )}

          {/* Bar selection */}
          {isPushEnabled && (
            <BarSelection
              bars={bars}
              barsLoading={barsLoading}
              selectedBarIds={selectedBarIds}
              onToggle={toggleBar}
            />
          )}

          {/* Save button */}
          {isPushEnabled && deviceToken && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving ? t('push_saving') : t('push_save')}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function PermissionCard({
  status,
  onRequest,
}: {
  status: string;
  onRequest: () => void;
}) {
  const { t } = useTranslation();
  if (status === 'granted') {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-xl">
          ✅
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            {t('push_enabled')}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            {t('push_enabled_desc')}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-xl">
          🚫
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            {t('push_blocked')}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            {t('push_blocked_desc')}
          </p>
        </div>
      </div>
    );
  }

  // default / unknown — show enable button
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-5 text-center space-y-3">
      <div className="text-3xl">🔔</div>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {t('push_activate')}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t('push_activate_desc')}
      </p>
      <button
        type="button"
        onClick={onRequest}
        className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        {t('push_enable')}
      </button>
    </div>
  );
}

function TeamSelection({
  selectedTeams,
  teamQuery,
  onTeamQueryChange,
  filteredOptions,
  onToggle,
}: {
  selectedTeams: string[];
  teamQuery: string;
  onTeamQueryChange: (q: string) => void;
  filteredOptions: { id: string; name: string }[];
  onToggle: (name: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚽</span>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t('push_fav_teams')}
        </h2>
        <span className="ml-auto text-xs text-zinc-500">{selectedTeams.length} {t('push_selected')}</span>
      </div>

      {selectedTeams.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTeams.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => onToggle(team)}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
            >
              {team} <span className="text-[10px] opacity-70">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={teamQuery}
        onChange={(e) => onTeamQueryChange(e.target.value)}
        placeholder={t('push_search_teams')}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredOptions.map((opt) => {
          const isSelected = selectedTeams.includes(opt.name);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.name)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{opt.name}</span>
              <span className="text-[10px] font-medium">{isSelected ? '✓' : t('push_add')}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BarSelection({
  bars,
  barsLoading,
  selectedBarIds,
  onToggle,
}: {
  bars: Bar[];
  barsLoading: boolean;
  selectedBarIds: string[];
  onToggle: (barId: string) => void;
}) {
  const { t } = useTranslation();
  if (barsLoading) {
    return (
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-4 text-center">
        <p className="text-xs text-zinc-500">{t('push_loading_bars')}</p>
      </section>
    );
  }

  if (bars.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🍺</span>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t('push_fav_bars')}
        </h2>
        <span className="ml-auto text-xs text-zinc-500">{selectedBarIds.length} {t('push_selected')}</span>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {t('push_bars_desc')}
      </p>

      <div className="max-h-48 overflow-y-auto space-y-1">
        {bars.map((bar) => {
          const isSelected = selectedBarIds.includes(bar.id);
          return (
            <button
              key={bar.id}
              type="button"
              onClick={() => onToggle(bar.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="truncate">{bar.name}</span>
              <span className="text-[10px] font-medium ml-2 flex-shrink-0">
                {isSelected ? '✓' : t('push_add')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
