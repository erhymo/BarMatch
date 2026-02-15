"use client";

import { useMemo, useState } from "react";
import type { Fixture, LeagueKey } from "@/lib/types/fixtures";

type LeagueOption = { key: LeagueKey; label: string };

type TeamSuggestion = {
	type: "team";
	teamName: string;
	league: LeagueKey;
	leagueLabel: string;
};

type LeagueSuggestion = {
	type: "league";
	league: LeagueKey;
	label: string;
};

type SearchSuggestion = TeamSuggestion | LeagueSuggestion;

interface SportFilterPanelProps {
	leagues: LeagueOption[];
	selectedLeague: LeagueKey;
	selectedTeam: string | null;
	fixtures: Fixture[];
	onLeagueChange: (league: LeagueKey) => void;
	onTeamSelect: (teamName: string | null) => void;
	isLoading?: boolean;
	error?: string | null;
	onRetryLoad?: () => void;
	onDone?: () => void;
}

export default function SportFilterPanel({
	leagues,
	selectedLeague,
	selectedTeam,
	fixtures,
	onLeagueChange,
	onTeamSelect,
	isLoading = false,
	error = null,
	onRetryLoad,
	onDone,
}: SportFilterPanelProps) {
	const [query, setQuery] = useState("");

	const leagueLabelMap = useMemo(() => {
		const map = new Map<LeagueKey, string>();
		leagues.forEach((l) => {
			map.set(l.key, l.label);
		});
		return map;
	}, [leagues]);

	const selectedLeagueLabel = useMemo(() => {
		return leagueLabelMap.get(selectedLeague) ?? selectedLeague;
	}, [leagueLabelMap, selectedLeague]);

	const { teamSuggestions, leagueSuggestions } = useMemo(() => {
		const teamMap = new Map<string, Set<LeagueKey>>();
		const leagueSet = new Set<LeagueKey>();

		fixtures.forEach((f) => {
			leagueSet.add(f.league);

			let set = teamMap.get(f.homeTeam);
			if (!set) {
				set = new Set<LeagueKey>();
				teamMap.set(f.homeTeam, set);
			}
			set.add(f.league);

			set = teamMap.get(f.awayTeam);
			if (!set) {
				set = new Set<LeagueKey>();
				teamMap.set(f.awayTeam, set);
			}
			set.add(f.league);
		});

		const leagueKeys: LeagueKey[] =
			leagueSet.size > 0 ? Array.from(leagueSet) : leagues.map((l) => l.key);

		const buildLeagueLabel = (league: LeagueKey) =>
			leagueLabelMap.get(league) ?? league;

		const teamSuggestions: TeamSuggestion[] = [];
		teamMap.forEach((leagueSetForTeam, teamName) => {
			leagueSetForTeam.forEach((league) => {
				teamSuggestions.push({
					type: "team",
					teamName,
					league,
					leagueLabel: buildLeagueLabel(league),
				});
			});
		});

		const leagueSuggestions: LeagueSuggestion[] = leagueKeys.map((league) => ({
			type: "league",
			league,
			label: buildLeagueLabel(league),
		}));

		teamSuggestions.sort((a, b) => {
			const nameCompare = a.teamName.localeCompare(b.teamName, "nb");
			if (nameCompare !== 0) return nameCompare;
			return a.leagueLabel.localeCompare(b.leagueLabel, "nb");
		});

		leagueSuggestions.sort((a, b) =>
			a.label.localeCompare(b.label, "nb"),
		);

		return { teamSuggestions, leagueSuggestions };
	}, [fixtures, leagues, leagueLabelMap]);

	const filteredTeamSuggestions = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return teamSuggestions.slice(0, 15);
		}
		return teamSuggestions
			.filter(
				(s) =>
					s.teamName.toLowerCase().includes(q) ||
					s.leagueLabel.toLowerCase().includes(q),
			)
			.slice(0, 20);
	}, [query, teamSuggestions]);

	const filteredLeagueSuggestions = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return leagueSuggestions;
		}
		return leagueSuggestions.filter((s) =>
			s.label.toLowerCase().includes(q),
		);
	}, [query, leagueSuggestions]);

	const handleReset = () => {
		onTeamSelect(null);
		// Behold valgt liga, som tidligere.
		setQuery("");
	};

	const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
		if (suggestion.type === "team") {
			onLeagueChange(suggestion.league);
			onTeamSelect(suggestion.teamName);
		} else {
			onLeagueChange(suggestion.league);
			onTeamSelect(null);
		}
		setQuery("");
		onDone?.();
	};

	const hasSuggestions =
		filteredTeamSuggestions.length > 0 ||
		filteredLeagueSuggestions.length > 0;

	return (
		<div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-700/50 max-w-md w-full text-sm">
			<div className="p-4 space-y-4">
				{error ? (
					<div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3">
						<p className="text-sm text-red-100 font-semibold mb-1">Kunne ikke laste kamper</p>
						<p className="text-xs text-red-200/90">{error}</p>
						{onRetryLoad && (
							<div className="mt-3">
								<button
									onClick={onRetryLoad}
									className="px-3 py-1.5 text-xs font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors"
								>
									Prøv igjen
								</button>
							</div>
						)}
					</div>
				) : null}

				<div>
					<label className="block text-xs font-medium text-zinc-300 mb-1">
						Søk etter lag eller liga
					</label>
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="F.eks. Rosenborg eller Premier League"
						className="w-full rounded-xl border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
						disabled={isLoading}
					/>
					{isLoading && (
						<p className="mt-1 text-xs text-zinc-400">Laster kamper…</p>
					)}
				</div>

				{fixtures.length === 0 && !isLoading && !error ? (
					<p className="text-xs text-zinc-400">
						Ingen kamper er lastet inn ennå. Åpne søket på nytt om et øyeblikk, eller prøv igjen.
					</p>
				) : null}

				{hasSuggestions ? (
					<div className="space-y-3">
						{filteredTeamSuggestions.length > 0 && (
							<div>
								<p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">
									Lag
								</p>
								<div className="space-y-1">
									{filteredTeamSuggestions.map((s) => (
										<button
											key={`team-${s.teamName}-${s.league}`}
											type="button"
											onClick={() => handleSelectSuggestion(s)}
											className="w-full flex items-center justify-between rounded-xl bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-left text-sm text-zinc-100 transition-colors"
										>
											<span className="font-medium">{s.teamName}</span>
											<span className="ml-2 text-[11px] text-zinc-400">{s.leagueLabel}</span>
										</button>
									))}
								</div>
							</div>
						)}

						{filteredLeagueSuggestions.length > 0 && (
							<div>
								<p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">
									Ligaer
								</p>
								<div className="space-y-1">
									{filteredLeagueSuggestions.map((s) => (
										<button
											key={`league-${s.league}`}
											type="button"
											onClick={() => handleSelectSuggestion(s)}
											className="w-full flex items-center justify-between rounded-xl bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-left text-sm text-zinc-100 transition-colors"
										>
											<span className="font-medium">{s.label}</span>
											{selectedLeague === s.league && !selectedTeam && (
												<span className="ml-2 text-[11px] text-green-400">Aktiv</span>
											)}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
			) : !isLoading && fixtures.length > 0 ? (
				<p className="text-xs text-zinc-400">
					Ingen treff. Prøv et annet lag eller en annen liga.
				</p>
			) : null}

			<div className="flex items-center justify-between pt-2 border-t border-zinc-700/60">
				<button
					type="button"
					onClick={handleReset}
					className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
				>
					Nullstill lag
				</button>
				<div className="text-xs text-zinc-400">
					{selectedTeam
						? `Filter: ${selectedTeam} (${selectedLeagueLabel})`
						: "Ingen lagfilter"}
				</div>
			</div>
		</div>
	</div>
	);
}
