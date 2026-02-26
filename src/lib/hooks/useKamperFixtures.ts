"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";
import { getFixtureProvider } from "@/lib/providers/fixtures";

const DEFAULT_RANGE_DAYS = 14;
const IS_DEV = process.env.NODE_ENV !== "production";

const LEAGUES: LeagueKey[] = ["EPL", "ENG_CHAMPIONSHIP", "FA_CUP", "EFL_TROPHY", "NOR_ELITESERIEN", "NOR_1_DIVISION", "SERIE_A", "COPA_DEL_REY", "BUNDESLIGA", "LIGUE_1", "UCL", "UEL"];

function getErrorInfo(err: unknown): { message: string; details?: string } {
  if (err && typeof err === "object") {
    const maybe = err as Record<string, unknown>;
    const message =
      typeof maybe.message === "string" && maybe.message.length > 0
        ? maybe.message
        : "Kunne ikke laste kamper.";
    const details =
      typeof maybe.details === "string" && maybe.details.length > 0
        ? maybe.details
        : undefined;
    return { message, details };
  }
  if (typeof err === "string" && err.length > 0) return { message: err };
  return { message: "Kunne ikke laste kamper." };
}

function isRejected<T>(r: PromiseSettledResult<T>): r is PromiseRejectedResult {
  return r.status === "rejected";
}

type DateRange = { from: string; to: string };

function createDefaultRange(): DateRange {
  const now = new Date();
  const from = now.toISOString();
  const toDate = new Date(now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return { from, to: toDate.toISOString() };
}

/**
 * Henter fixtures for alle ligaer med klient-side cache.
 * Returnerer sortert liste, loading-state og ev. feilmelding.
 */
export function useKamperFixtures() {
  const [fixturesByLeague, setFixturesByLeague] = useState<Record<LeagueKey, Fixture[]>>({
    EPL: [], ENG_CHAMPIONSHIP: [], FA_CUP: [], EFL_TROPHY: [], NOR_ELITESERIEN: [], NOR_1_DIVISION: [], SERIE_A: [], COPA_DEL_REY: [], BUNDESLIGA: [], LIGUE_1: [], UCL: [], UEL: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range] = useState<DateRange>(() => createDefaultRange());
  const cacheRef = useRef<Map<string, Fixture[]>>(new Map());
  const fixtureProvider = useMemo(() => getFixtureProvider(), []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchForLeague(league: LeagueKey): Promise<Fixture[]> {
      const cacheKey = `${league}|${range.from}|${range.to}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) return cached;

      const fixtures = await fixtureProvider.getUpcomingFixtures(league, range.from, range.to);
      if (IS_DEV) {
        console.log("[Fixtures]", league, "from", range.from, "to", range.to, "- count:", fixtures.length);
      }
      cacheRef.current.set(cacheKey, fixtures);
      return fixtures;
    }

    async function loadAll() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const results = await Promise.allSettled(LEAGUES.map((key) => fetchForLeague(key)));
        if (isCancelled) return;

        const byLeague: Record<LeagueKey, Fixture[]> = { EPL: [], ENG_CHAMPIONSHIP: [], FA_CUP: [], EFL_TROPHY: [], NOR_ELITESERIEN: [], NOR_1_DIVISION: [], SERIE_A: [], COPA_DEL_REY: [], BUNDESLIGA: [], LIGUE_1: [], UCL: [], UEL: [] };
        LEAGUES.forEach((key, i) => {
          const r = results[i];
          if (r.status === "fulfilled") {
            byLeague[key] = r.value;
          } else {
            console.error(`[Fixtures] Feil ved henting av ${key}-kamper:`, r.reason);
          }
        });

        const allRejected = results.every(isRejected);
        if (allRejected) {
          const firstReason = (results.find(isRejected) as PromiseRejectedResult)?.reason;
          const { message, details } = getErrorInfo(firstReason);
          const combinedMessage =
            IS_DEV && details && details.length > 0
              ? `${message} Detaljer: ${details.slice(0, 200)}`
              : message;
          setLoadError(combinedMessage);
        }

        setFixturesByLeague(byLeague);
      } catch (error) {
        if (isCancelled) return;
        console.error("[Fixtures] Uventet feil ved lasting av kamper:", error);
        const { message: baseMessage, details } = getErrorInfo(error);
        const combinedMessage =
          IS_DEV && details && details.length > 0
            ? `${baseMessage} Detaljer: ${details.slice(0, 200)}`
            : baseMessage;
        setLoadError(combinedMessage);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadAll();
    return () => { isCancelled = true; };
  }, [fixtureProvider, range.from, range.to]);

  const allFixtures = useMemo(() => {
    const all = LEAGUES.flatMap((key) => fixturesByLeague[key]);
    return all.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
  }, [fixturesByLeague]);

  return { allFixtures, isLoading, loadError };
}

