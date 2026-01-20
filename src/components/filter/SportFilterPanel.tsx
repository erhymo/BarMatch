"use client";

import { useState } from "react";
import { dummyMatches } from "@/lib/data/matches";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useLeagues, useTeamSelection } from "@/lib/hooks";
import { MatchService } from "@/lib/services";

interface SportFilterPanelProps {
	onTeamSelect: (teamId: string | null) => void;
}

export default function SportFilterPanel({
	onTeamSelect,
}: SportFilterPanelProps) {
	const [selectedLeague, setSelectedLeague] = useState<string>("");
	const [selectedTeam, setSelectedTeam] = useState<string>("");
	const [isExpanded, setIsExpanded] = useState(true);
	const { favoriteTeams, toggleFavoriteTeam, isFavoriteTeam } = useFavorites();

	// Extract unique leagues using hook
	const leagues = useLeagues(dummyMatches);

	// Extract and sort teams for selected league using hook
	const teams = useTeamSelection(dummyMatches, selectedLeague, favoriteTeams);

		const handleLeagueChange = (league: string) => {
			setSelectedLeague(league);
			// Nullstill lag-filter nar liga endres
			setSelectedTeam("");
			onTeamSelect(null);
		};

	const handleTeamChange = (teamId: string) => {
		setSelectedTeam(teamId);
		onTeamSelect(teamId || null);
	};

	const handleReset = () => {
		setSelectedLeague("");
		setSelectedTeam("");
		onTeamSelect(null);
	};

	return (
		<div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-700/50 max-w-md w-full text-sm">
			{/* Header */}
			<div className="px-4 py-3 border-b border-zinc-700/50">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
							<span className="text-2xl">⚽</span>
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">Finn din bar</h2>
							<p className="text-xs text-zinc-400">Velg liga og lag</p>
						</div>
					</div>
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors"
						aria-label={isExpanded ? "Skjul filter" : "Vis filter"}
					>
						<span className="text-zinc-400 text-lg">{isExpanded ? "−" : "+"}</span>
					</button>
				</div>
			</div>

			{/* Content */}
			{isExpanded && (
				<div className="p-5 space-y-4">
					{/* League Selection */}
					<div>
						<label className="block text-sm font-semibold text-zinc-300 mb-2">
							1. Velg liga
						</label>
						<div className="grid grid-cols-2 gap-2">
							{leagues.map((league) => (
								<button
									key={league}
									onClick={() => handleLeagueChange(league)}
									className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
										selectedLeague === league
											? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105"
											: "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 border border-zinc-700/50"
									}`}
								>
									<div className="flex items-center justify-center gap-2">
										<span className="text-lg">{MatchService.getLeagueEmoji(league)}</span>
										<span className="truncate">{league}</span>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Team Selection */}
					{selectedLeague && teams.length > 0 && (
						<div>
							<label className="block text-sm font-semibold text-zinc-300 mb-2">
								2. Velg lag
								{favoriteTeams.length > 0 && (
									<span className="ml-2 text-xs text-zinc-500">
										({favoriteTeams.length} favoritt
										{favoriteTeams.length !== 1 ? "er" : ""})
									</span>
								)}
							</label>
							<div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800/50">
								{teams.map((team) => {
									const isFav = isFavoriteTeam(team.id);
									return (
										<div key={team.id} className="flex items-center gap-2">
											<button
													onClick={() => handleTeamChange(team.id)}
													className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all text-left ${
														selectedTeam === team.id
															? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
															: "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 border border-zinc-700/50"
													}`}
											>
												<div className="flex items-center justify-between">
													<span>{team.name}</span>
													{isFav && <span className="text-yellow-400 text-lg">⭐</span>}
												</div>
											</button>
											<button
													onClick={(e) => {
														e.stopPropagation();
														toggleFavoriteTeam(team.id);
													}}
													className={`p-3 rounded-xl transition-all ${
														isFav
															? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
															: "bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-500 border border-zinc-700/50"
													}`}
												title={isFav ? "Fjern fra favoritter" : "Legg til i favoritter"}
											>
												<span className="text-lg">{isFav ? "❤️" : "🤍"}</span>
											</button>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Active Filter Display */}
					{selectedTeam && (
						<div className="pt-4 border-t border-zinc-700/50">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
									<span className="text-sm text-zinc-300">
										Viser barer for {" "}
										<span className="font-bold text-white">
											{teams.find((t) => t.id === selectedTeam)?.name}
										</span>
									</span>
								</div>
								<button
									onClick={handleReset}
									className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
								>
									Nullstill
								</button>
							</div>
						</div>
					)}

					{/* Help Text */}
					{!selectedLeague && (
						<div className="pt-2">
							<p className="text-xs text-zinc-500 text-center">
								💡 Velg en liga for å se tilgjengelige lag
							</p>
						</div>
					)}

					{selectedLeague && teams.length === 0 && (
						<div className="pt-2">
							<p className="text-xs text-zinc-500 text-center">
								Ingen lag funnet i denne ligaen
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

