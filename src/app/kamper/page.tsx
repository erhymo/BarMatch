"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeagueKey } from "@/lib/types/fixtures";
import { useKamperFixtures, useTeamSearch } from "@/lib/hooks";
import type { TeamSuggestion } from "@/lib/hooks/useTeamSearch";
import FixtureCard from "@/components/kamper/FixtureCard";
import LeagueFilter from "@/components/kamper/LeagueFilter";
import TeamSearchInput from "@/components/kamper/TeamSearchInput";
import { useTranslation } from '@/lib/i18n';
import { useNativeAppPlatform } from '@/lib/push/nativeApp';

function getFixturesCountFromBody(body: unknown): number {
  if (!body || typeof body !== "object") return 0;
  const maybe = body as Record<string, unknown>;
  const fixtures = maybe.fixtures;
  return Array.isArray(fixtures) ? fixtures.length : 0;
}

function getApiErrorFromBody(body: unknown): { error?: string; details?: unknown } {
  if (!body || typeof body !== "object") return {};
  const maybe = body as Record<string, unknown>;
  return {
    error: typeof maybe.error === "string" ? maybe.error : undefined,
    details: maybe.details,
  };
}

const IS_DEV = process.env.NODE_ENV !== "production";

export default function KamperPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | "">("");
  const [selfTestResult, setSelfTestResult] = useState<string | null>(null);
  const [selfTestLoading, setSelfTestLoading] = useState(false);
  const isNativeApp = useNativeAppPlatform() !== null;

  const { allFixtures, isLoading, loadError } = useKamperFixtures();
  const {
    searchQuery, setSearchQuery,
    filteredTeamSuggestions,
    recentSuggestions, hasSuggestions, showRecent,
    addRecentSearch,
  } = useTeamSearch(allFixtures);

  function handleSelectSuggestion(suggestion: TeamSuggestion) {
    addRecentSearch(suggestion);
    setSelectedLeague(suggestion.league);
    setSearchQuery(suggestion.teamName);
  }

  const filteredFixtures = useMemo(() => {
    let fixtures = allFixtures;

    if (selectedLeague) {
      fixtures = fixtures.filter((fixture) => fixture.league === selectedLeague);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      fixtures = fixtures.filter((fixture) =>
        fixture.homeTeam.toLowerCase().includes(q) ||
        fixture.awayTeam.toLowerCase().includes(q)
      );
    }

    return fixtures;
  }, [
    allFixtures,
    selectedLeague,
    searchQuery,
  ]);

  const handleMatchClick = (matchId: string) => {
    // Naviger til kartet og filtrer barer som viser denne kampen
    router.push(`/?matchId=${matchId}`);
  };

			  const handleSelfTest = async () => {
			    if (!IS_DEV) return;

	    setSelfTestLoading(true);
	    setSelfTestResult(null);

		    try {
		      const res = await fetch(
		        "/api/fixtures?leagueKey=EPL&season=2025&from=2025-08-01&to=2025-08-20",
		      );

		      let body: unknown = null;
	      try {
	        body = await res.json();
	      } catch {
	        body = null;
	      }

		      if (res.ok) {
		        const count = getFixturesCountFromBody(body);
	        setSelfTestResult(
	          `Test API OK (HTTP ${res.status}). Fixtures: ${count}`,
	        );
	      } else {
		        const { error: apiError, details: apiDetails } = getApiErrorFromBody(body);
		        const errMessage = apiError || t('kamper_unknown_error');
	        const msg = t('kamper_test_failed_http').replace('{status}', String(res.status)).replace('{message}', errMessage);
	        setSelfTestResult(msg);

			        if (IS_DEV && apiDetails) {
		          console.log("[Kamper Test API] details:", apiDetails);
	        }
	      }
	    } catch (error) {
	      const message =
	        error instanceof Error && error.message
	          ? error.message
	          : t('kamper_unknown_error_test');
	      setSelfTestResult(`${t('kamper_test_failed')}: ${message}`);
	    } finally {
	      setSelfTestLoading(false);
	    }
	  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <header>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
                {t('kamper_title')}
              </h1>
              {isNativeApp && (
                <Link
                  href="/varslinger"
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  🔔 {t('nav_notifications')}
                </Link>
              )}
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t('kamper_subtitle')}
            </p>
	            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	              {t('kamper_tap_match')}
	            </p>
          </header>

			          {IS_DEV && (
	            <section className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-100">
	              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
	                <div>
	                  <p className="font-semibold">
	                    Dev: Test API-Football via /api/fixtures
	                  </p>
			          <p className="text-[11px]">
			            Kaller EPL 2025-08-01 til 2025-08-20 og viser antall kamper eller
			            feil/status.
			          </p>
	                </div>
	                <button
	                  type="button"
	                  onClick={handleSelfTest}
	                  disabled={selfTestLoading}
	                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
		                >
		                  {selfTestLoading ? t('kamper_testing') : t('kamper_test_api')}
		                </button>
	              </div>
	              {selfTestResult && (
	                <p className="mt-2 break-words">{selfTestResult}</p>
	              )}
	            </section>
	          )}

          {/* Filters */}
          <section className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <LeagueFilter selectedLeague={selectedLeague} onSelectLeague={setSelectedLeague} />

              <TeamSearchInput
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filteredTeamSuggestions={filteredTeamSuggestions}
                recentSuggestions={recentSuggestions}
                hasSuggestions={hasSuggestions}
                showRecent={showRecent}
                isLoading={isLoading}
                hasFixtures={allFixtures.length > 0}
                onSelectSuggestion={handleSelectSuggestion}
              />

            </div>
          </section>

          {/* Match list */}
          <section className="space-y-4">
            {loadError && (
              <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30 p-4 text-sm text-red-800 dark:text-red-100">
                {loadError}
              </div>
            )}

            {isLoading && filteredFixtures.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-6 text-center">
                <div className="mb-2 text-2xl">⏳</div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('kamper_loading')}
                </p>
              </div>
            ) : filteredFixtures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-6 text-center">
                <div className="mb-2 text-2xl">📅</div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('kamper_no_matches')}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {t('kamper_change_filter')}
                </p>
              </div>
            ) : (
              filteredFixtures.map((fixture, index) => {
                const prev = filteredFixtures[index - 1];
                const currentDayKey = new Date(fixture.kickoffUtc).toISOString().slice(0, 10);
                const prevDayKey = prev ? new Date(prev.kickoffUtc).toISOString().slice(0, 10) : null;
                const isFirstOfDay = index === 0 || prevDayKey !== currentDayKey;
                return (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    isFirstOfDay={isFirstOfDay}
                    onClick={() => handleMatchClick(fixture.id)}
                  />
                );
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
