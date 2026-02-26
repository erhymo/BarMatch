"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";

const RECENT_SEARCHES_STORAGE_KEY = "bar_match_recent_team_searches_v1";

export const LEAGUE_LABEL_BY_KEY: Record<LeagueKey, string> = {
  EPL: "Premier League",
  ENG_CHAMPIONSHIP: "Championship",
  FA_CUP: "FA Cup",
  EFL_TROPHY: "EFL Trophy",
  NOR_ELITESERIEN: "Eliteserien",
  NOR_1_DIVISION: "OBOS-ligaen",
  COPA_DEL_REY: "Copa del Rey",
  BUNDESLIGA: "Bundesliga",
  LIGUE_1: "Ligue 1",
  FIFA_CWC: "FIFA Club World Cup",
  FIFA_CWC_PLAYIN: "FIFA CWC Play-In",
  UEFA_NL: "UEFA Nations League",
  FRIENDLIES: "Friendlies",
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

export type SearchSuggestion = TeamSuggestion;

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
            entry && typeof entry.league === "string" && typeof entry.teamName === "string",
        )
        .slice(0, 2);
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

  const teamSuggestions = useMemo(() => {
    const teamMap = new Map<string, Set<LeagueKey>>();

    allFixtures.forEach((f) => {
      for (const team of [f.homeTeam, f.awayTeam]) {
        let set = teamMap.get(team);
        if (!set) { set = new Set<LeagueKey>(); teamMap.set(team, set); }
        set.add(f.league);
      }
    });

    const buildLabel = (league: LeagueKey) => LEAGUE_LABEL_BY_KEY[league] ?? league;

    const suggestions: TeamSuggestion[] = [];
    teamMap.forEach((leagues, teamName) => {
      leagues.forEach((league) => {
        suggestions.push({ type: "team", teamName, league, leagueLabel: buildLabel(league) });
      });
    });

    suggestions.sort((a, b) => a.teamName.localeCompare(b.teamName, "nb") || a.leagueLabel.localeCompare(b.leagueLabel, "nb"));

    return suggestions;
  }, [allFixtures]);

  const filteredTeamSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return teamSuggestions
      .filter((s) => s.teamName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [searchQuery, teamSuggestions]);

  const recentSuggestions: TeamSuggestion[] = useMemo(
    () =>
      recentSearches.map((entry): TeamSuggestion => ({
        type: "team",
        teamName: entry.teamName,
        league: entry.league,
        leagueLabel: LEAGUE_LABEL_BY_KEY[entry.league] ?? (entry.league as string),
      })),
    [recentSearches],
  );

  const hasSuggestions = filteredTeamSuggestions.length > 0;
  const showRecent = searchQuery.trim().length === 0 && recentSuggestions.length > 0;

  function addRecentSearch(suggestion: TeamSuggestion) {
    const filtered = recentSearches.filter(
      (entry) => !(entry.teamName === suggestion.teamName && entry.league === suggestion.league)
    );
    const newEntry: RecentSearchEntry = { teamName: suggestion.teamName, league: suggestion.league };
    const next = [newEntry, ...filtered].slice(0, 2);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
    setRecentSearches(next);
  }

  return {
    searchQuery, setSearchQuery,
    filteredTeamSuggestions,
    recentSuggestions, hasSuggestions, showRecent,
    addRecentSearch,
  };
}

