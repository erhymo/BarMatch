"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";

const RECENT_SEARCHES_STORAGE_KEY = "bar_match_recent_team_searches_v1";

export const LEAGUE_LABEL_BY_KEY: Record<LeagueKey, string> = {
  EPL: "Premier League",
  NOR_ELITESERIEN: "Eliteserien",
  SERIE_A: "Serie A",
  UCL: "UEFA Champions League",
  UEL: "UEFA Europa League",
};

export type TeamSuggestion = {
  type: "team";
  teamName: string;
  league: LeagueKey;
  leagueLabel: string;
};

export type LeagueSuggestion = {
  type: "league";
  league: LeagueKey;
  label: string;
};

export type SearchSuggestion = TeamSuggestion | LeagueSuggestion;

type RecentSearchEntry = {
  teamName: string;
  league: LeagueKey;
};

/**
 * Håndterer søkeforslag, nylige søk og filtrering.
 */
export function useTeamSearch(allFixtures: Fixture[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  // Last inn nylige søk fra localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned: RecentSearchEntry[] = parsed
        .filter(
          (entry: any) =>
            entry && typeof entry.teamName === "string" && typeof entry.league === "string",
        )
        .slice(0, 6);
      setRecentSearches(cleaned);
    } catch {
      // Ignorer korrupt lagret data
    }
  }, []);

  // Persist til localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch {
      // Best effort
    }
  }, [recentSearches]);

  const { teamSuggestions, leagueSuggestions } = useMemo(() => {
    const teamMap = new Map<string, Set<LeagueKey>>();
    const leagueSet = new Set<LeagueKey>();

    allFixtures.forEach((f) => {
      leagueSet.add(f.league);
      for (const team of [f.homeTeam, f.awayTeam]) {
        let set = teamMap.get(team);
        if (!set) { set = new Set<LeagueKey>(); teamMap.set(team, set); }
        set.add(f.league);
      }
    });

    const leagueKeys: LeagueKey[] =
      leagueSet.size > 0
        ? Array.from(leagueSet)
        : (["EPL", "NOR_ELITESERIEN", "SERIE_A", "UCL", "UEL"] as LeagueKey[]);

    const buildLabel = (league: LeagueKey) => LEAGUE_LABEL_BY_KEY[league] ?? league;

    const teamSuggestions: TeamSuggestion[] = [];
    teamMap.forEach((leagues, teamName) => {
      leagues.forEach((league) => {
        teamSuggestions.push({ type: "team", teamName, league, leagueLabel: buildLabel(league) });
      });
    });

    const leagueSuggestions: LeagueSuggestion[] = leagueKeys.map((league) => ({
      type: "league", league, label: buildLabel(league),
    }));

    teamSuggestions.sort((a, b) => a.teamName.localeCompare(b.teamName, "nb") || a.leagueLabel.localeCompare(b.leagueLabel, "nb"));
    leagueSuggestions.sort((a, b) => a.label.localeCompare(b.label, "nb"));

    return { teamSuggestions, leagueSuggestions };
  }, [allFixtures]);

  const filteredTeamSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return teamSuggestions
      .filter((s) => s.teamName.toLowerCase().includes(q) || s.leagueLabel.toLowerCase().includes(q))
      .slice(0, 20);
  }, [searchQuery, teamSuggestions]);

  const filteredLeagueSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return leagueSuggestions.filter((s) => s.label.toLowerCase().includes(q));
  }, [searchQuery, leagueSuggestions]);

  const recentSuggestions: TeamSuggestion[] = useMemo(
    () =>
      recentSearches.map((entry) => ({
        type: "team" as const,
        teamName: entry.teamName,
        league: entry.league,
        leagueLabel: LEAGUE_LABEL_BY_KEY[entry.league] ?? (entry.league as string),
      })),
    [recentSearches],
  );

  const hasSuggestions = filteredTeamSuggestions.length > 0 || filteredLeagueSuggestions.length > 0;
  const showRecent = searchQuery.trim().length === 0 && recentSuggestions.length > 0;

  function addRecentFromTeamSuggestion(suggestion: TeamSuggestion) {
    const filtered = recentSearches.filter(
      (entry) => !(entry.teamName === suggestion.teamName && entry.league === suggestion.league),
    );
    const next: RecentSearchEntry[] = [
      { teamName: suggestion.teamName, league: suggestion.league },
      ...filtered,
    ].slice(0, 6);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
    setRecentSearches(next);
  }

  return {
    searchQuery, setSearchQuery,
    filteredTeamSuggestions, filteredLeagueSuggestions,
    recentSuggestions, hasSuggestions, showRecent,
    addRecentFromTeamSuggestion,
  };
}

