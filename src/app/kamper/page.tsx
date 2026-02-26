"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/contexts/FavoritesContext";
import type { LeagueKey } from "@/lib/types/fixtures";
import { useKamperFixtures, useTeamSearch, LEAGUE_LABEL_BY_KEY } from "@/lib/hooks";
import type { SearchSuggestion } from "@/lib/hooks/useTeamSearch";
import FixtureCard from "@/components/kamper/FixtureCard";
import LeagueFilter from "@/components/kamper/LeagueFilter";
import TeamSearchInput from "@/components/kamper/TeamSearchInput";

// Mapping fra interne lag-ID-er (favoritter) til visningsnavn slik de kommer fra Fixture
const TEAM_ID_TO_NAME: Record<string, string> = {
  tot: "Tottenham",
  che: "Chelsea",
  liv: "Liverpool",
  mci: "Manchester City",
  ars: "Arsenal",
  mun: "Manchester United",
  bar: "Barcelona",
  rma: "Real Madrid",
  atm: "Atletico Madrid",
  sev: "Sevilla",
  bay: "Bayern Munich",
  bvb: "Borussia Dortmund",
  rb: "RB Leipzig",
  rbk: "Rosenborg",
  vif: "Vålerenga",
  mol: "Molde",
  bod: "Bodø/Glimt",
  bra: "Brann",
  juv: "Juventus",
  int: "Inter Milan",
  acm: "AC Milan",
  nap: "Napoli",
  rom: "Roma",
};

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
  const { favoriteTeams } = useFavorites();

  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | "">("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [selfTestResult, setSelfTestResult] = useState<string | null>(null);
  const [selfTestLoading, setSelfTestLoading] = useState(false);

  const { allFixtures, isLoading, loadError } = useKamperFixtures();
  const {
    searchQuery, setSearchQuery,
    filteredTeamSuggestions, filteredLeagueSuggestions,
    recentSuggestions, hasSuggestions, showRecent,
    addRecentFromTeamSuggestion,
  } = useTeamSearch(allFixtures);

  const favoriteTeamNames = useMemo(() => {
    const names = favoriteTeams
      .map((id) => TEAM_ID_TO_NAME[id])
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
  }, [favoriteTeams]);

  const favoriteTeamNameSet = useMemo(
    () => new Set(favoriteTeamNames),
    [favoriteTeamNames],
  );

  function handleSelectSuggestion(suggestion: SearchSuggestion) {
    if (suggestion.type === "team") {
      addRecentFromTeamSuggestion(suggestion);
      setSelectedLeague(suggestion.league);
      setSearchQuery(suggestion.teamName);
    } else {
      setSelectedLeague(suggestion.league);
      setSearchQuery("");
    }
  }

  const filteredFixtures = useMemo(() => {
    let fixtures = allFixtures;

    if (selectedLeague) {
      fixtures = fixtures.filter((fixture) => fixture.league === selectedLeague);
    }

    if (showOnlyFavorites && favoriteTeamNameSet.size > 0) {
      fixtures = fixtures.filter((fixture) => {
        const { homeTeam, awayTeam } = fixture;
        return (
          favoriteTeamNameSet.has(homeTeam) || favoriteTeamNameSet.has(awayTeam)
        );
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      fixtures = fixtures.filter((fixture) => {
        const leagueLabel =
          LEAGUE_LABEL_BY_KEY[fixture.league] ?? String(fixture.league);
        return (
          fixture.homeTeam.toLowerCase().includes(q) ||
          fixture.awayTeam.toLowerCase().includes(q) ||
          leagueLabel.toLowerCase().includes(q)
        );
      });
    }

    return fixtures;
  }, [
    allFixtures,
    selectedLeague,
    showOnlyFavorites,
    favoriteTeamNameSet,
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
		        const errMessage = apiError || "Ukjent feil";
	        const msg = `Test API feilet (HTTP ${res.status}): ${errMessage}`;
	        setSelfTestResult(msg);

			        if (IS_DEV && apiDetails) {
		          console.log("[Kamper Test API] details:", apiDetails);
	        }
	      }
	    } catch (error) {
	      const message =
	        error instanceof Error && error.message
	          ? error.message
	          : "Ukjent feil ved Test API";
	      setSelfTestResult(`Test API feilet: ${message}`);
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
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              Kamper
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Se kommende kamper, filtrer på liga og fokuser på dine favorittlag.
            </p>
	            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	              Trykk på en kamp for å se hvilke barer som viser den på kartet.
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
		                  {selfTestLoading ? "Tester…" : "Test API"}
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
                filteredLeagueSuggestions={filteredLeagueSuggestions}
                recentSuggestions={recentSuggestions}
                hasSuggestions={hasSuggestions}
                showRecent={showRecent}
                isLoading={isLoading}
                hasFixtures={allFixtures.length > 0}
                onSelectSuggestion={handleSelectSuggestion}
              />

              {/* Favorites toggle */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    Favorittlag
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {favoriteTeams.length > 0
                      ? "Vis bare kamper der dine lag spiller"
                      : "Legg til favorittlag på forsiden for å bruke dette filteret"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOnlyFavorites((prev) => !prev)}
                  disabled={favoriteTeams.length === 0}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    showOnlyFavorites && favoriteTeams.length > 0
                      ? "bg-blue-600 border-blue-600"
                      : "bg-zinc-200 border-zinc-300 dark:bg-zinc-700 dark:border-zinc-600"
                  } ${
                    favoriteTeams.length === 0
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      showOnlyFavorites && favoriteTeams.length > 0
                        ? "translate-x-5"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
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
                  Laster kommende kamper…
                </p>
              </div>
            ) : filteredFixtures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-6 text-center">
                <div className="mb-2 text-2xl">📅</div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ingen kommende kamper matcher filtrene dine ennå.
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Endre liga, skru av favorittfilteret eller sjekk igjen litt senere.
                </p>
              </div>
            ) : (
              filteredFixtures.map((fixture, index) => {
                const prev = filteredFixtures[index - 1];
                const currentDayKey = new Date(fixture.kickoffUtc).toISOString().slice(0, 10);
                const prevDayKey = prev ? new Date(prev.kickoffUtc).toISOString().slice(0, 10) : null;
                const isFirstOfDay = index === 0 || prevDayKey !== currentDayKey;
                const isFavoriteMatch =
                  favoriteTeamNameSet.has(fixture.homeTeam) || favoriteTeamNameSet.has(fixture.awayTeam);

                return (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    isFavoriteMatch={isFavoriteMatch}
                    favoriteTeamNameSet={favoriteTeamNameSet}
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
