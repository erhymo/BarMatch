"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MatchService } from "@/lib/services";
import { useFavorites } from "@/contexts/FavoritesContext";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";
import { getFixtureProvider } from "@/lib/providers/fixtures";

const DEFAULT_RANGE_DAYS = 14;

const LEAGUES: { key: LeagueKey; label: string }[] = [
  { key: "EPL", label: "Premier League" },
  { key: "NOR_ELITESERIEN", label: "Eliteserien" },
  { key: "SERIE_A", label: "Serie A" },
];

const LEAGUE_LABEL_BY_KEY: Record<LeagueKey, string> = {
  EPL: "Premier League",
  NOR_ELITESERIEN: "Eliteserien",
  SERIE_A: "Serie A",
};

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

type DateRange = { from: string; to: string };

function createDefaultRange(): DateRange {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(
    now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
  );
  const to = toDate.toISOString();
  return { from, to };
}

function formatTimeFromUtc(kickoffUtc: string, locale: string = "nb-NO"): string {
  const date = new Date(kickoffUtc);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KamperPage() {
  const router = useRouter();
  const { favoriteTeams } = useFavorites();

  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | "">("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [range] = useState<DateRange>(() => createDefaultRange());
  const [fixturesByLeague, setFixturesByLeague] = useState<
    Record<LeagueKey, Fixture[]>
  >({
    EPL: [],
    NOR_ELITESERIEN: [],
    SERIE_A: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Enkel klient-cache per league+range for å unngå unødvendige kall
  const cacheRef = useRef<Map<string, Fixture[]>>(new Map());

	  const fixtureProvider = getFixtureProvider();

	  useEffect(() => {
    let isCancelled = false;

		    async function fetchFixturesForLeague(league: LeagueKey): Promise<Fixture[]> {
		      const cacheKey = `${league}|${range.from}|${range.to}`;
		      const cached = cacheRef.current.get(cacheKey);
		      if (cached) {
		        return cached;
		      }
		
		      const fixtures = await fixtureProvider.getUpcomingFixtures(
		        league,
		        range.from,
		        range.to,
		      );
		
		      if (process.env.NODE_ENV !== "production") {
		        console.log(
		          "[Fixtures]",
		          league,
		          "from",
		          range.from,
		          "to",
		          range.to,
		          "- count:",
		          fixtures.length,
		        );
		      }
		
		      cacheRef.current.set(cacheKey, fixtures);
		      return fixtures;
		    }
		
	    async function loadAllLeagues() {
	      setIsLoading(true);
	      setLoadError(null);
	  
	      try {
	        const results = await Promise.allSettled(
	          LEAGUES.map(({ key }) => fetchFixturesForLeague(key)),
	        );
	  
	        if (isCancelled) return;
	  
	        const [eplResult, norEliteserienResult, serieAResult] = results;
	  
	        const toFixtures = (
	          result: PromiseSettledResult<Fixture[]>,
	        ): Fixture[] => {
	          if (result.status === "fulfilled") {
	            return result.value;
	          }
	  
	          console.error("[Fixtures] Feil ved henting av kamper:", result.reason);
	          return [];
	        };
	  
	        const epl = toFixtures(eplResult);
	        const norEliteserien = toFixtures(norEliteserienResult);
	        const serieA = toFixtures(serieAResult);
	  
	        // Hvis absolutt alle ligaer feiler, vis feilmelding i UI
	        if (!epl.length && !norEliteserien.length && !serieA.length) {
	          setLoadError("Kunne ikke laste kamper. Prøv igjen senere.");
	        }
	  
	        setFixturesByLeague({
	          EPL: epl,
	          NOR_ELITESERIEN: norEliteserien,
	          SERIE_A: serieA,
	        });
	      } catch (error) {
	        if (isCancelled) return;
	        console.error("[Fixtures] Uventet feil ved lasting av kamper:", error);
	        setLoadError("Kunne ikke laste kamper. Prøv igjen senere.");
	      } finally {
	        if (!isCancelled) {
	          setIsLoading(false);
	        }
	      }
	    }

    loadAllLeagues();

    return () => {
      isCancelled = true;
    };
  }, [range.from, range.to]);

  const allFixtures = useMemo(() => {
    const all = [
      ...fixturesByLeague.EPL,
      ...fixturesByLeague.NOR_ELITESERIEN,
      ...fixturesByLeague.SERIE_A,
    ];

    return all.sort((a, b) => {
      return (
        new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
      );
    });
  }, [fixturesByLeague]);

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

    return fixtures;
  }, [allFixtures, selectedLeague, showOnlyFavorites, favoriteTeamNameSet]);

  const handleMatchClick = (matchId: string) => {
    // Naviger til kartet og filtrer barer som viser denne kampen
    router.push(`/?matchId=${matchId}`);
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
          </header>

          {/* Filters */}
          <section className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              {/* League filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    Liga
                  </h2>
                  {selectedLeague && (
                    <button
                      type="button"
                      onClick={() => setSelectedLeague("")}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      Nullstill
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {LEAGUES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setSelectedLeague((prev) => (prev === key ? "" : key))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
                        selectedLeague === key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span className="mr-1 text-base">
                        {MatchService.getLeagueEmoji(label)}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

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
                const currentDayKey = new Date(
                  fixture.kickoffUtc,
                )
                  .toISOString()
                  .slice(0, 10);
                const prevDayKey = prev
                  ? new Date(prev.kickoffUtc).toISOString().slice(0, 10)
                  : null;
                const isFirstOfDay = index === 0 || prevDayKey !== currentDayKey;

                const isFavoriteMatch =
                  favoriteTeamNameSet.has(fixture.homeTeam) ||
                  favoriteTeamNameSet.has(fixture.awayTeam);

                const leagueLabel = LEAGUE_LABEL_BY_KEY[fixture.league];

                return (
                  <div key={fixture.id} className="space-y-2">
                    {isFirstOfDay && (
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {MatchService.formatDate(fixture.kickoffUtc)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMatchClick(fixture.id)}
                      className="w-full rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                            {formatTimeFromUtc(fixture.kickoffUtc)}
                          </span>
                          <span>
                            {MatchService.getLeagueEmoji(leagueLabel)} {leagueLabel}
                          </span>
                        </div>
                        <div className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
                          <span
                            className={
                              favoriteTeamNameSet.has(fixture.homeTeam)
                                ? "text-blue-600 dark:text-blue-400"
                                : ""
                            }
                          >
                            {fixture.homeTeam}
                          </span>
                          <span className="mx-1 text-zinc-400">vs</span>
                          <span
                            className={
                              favoriteTeamNameSet.has(fixture.awayTeam)
                                ? "text-blue-600 dark:text-blue-400"
                                : ""
                            }
                          >
                            {fixture.awayTeam}
                          </span>
                        </div>
                      </div>

                      {isFavoriteMatch && (
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                            <span>⭐</span>
                            <span>Favorittlag</span>
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
