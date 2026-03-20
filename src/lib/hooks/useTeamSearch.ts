"use client";

import { useEffect, useMemo, useState } from "react";
import { ALL_LEAGUE_KEYS, getCompetitionByKey } from "@/lib/config/competitions";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";

const RECENT_SEARCHES_STORAGE_KEY = "bar_match_recent_team_searches_v1";

export const LEAGUE_LABEL_BY_KEY: Record<LeagueKey, string> = Object.fromEntries(
  ALL_LEAGUE_KEYS.map((key) => [key, getCompetitionByKey(key).label]),
) as Record<LeagueKey, string>;

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

function isRecentSearchEntry(entry: unknown): entry is RecentSearchEntry {
  if (!entry || typeof entry !== "object") return false;

  const candidate = entry as Record<string, unknown>;

  return (
    typeof candidate.teamName === "string" &&
    typeof candidate.league === "string" &&
    ALL_LEAGUE_KEYS.includes(candidate.league as LeagueKey)
  );
}

function loadRecentSearches(): RecentSearchEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecentSearchEntry).slice(0, 2);
  } catch {
    return [];
  }
}

/**
 * Håndterer søkeforslag, nylige søk og filtrering.
 */
export function useTeamSearch(allFixtures: Fixture[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>(() => loadRecentSearches());

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

