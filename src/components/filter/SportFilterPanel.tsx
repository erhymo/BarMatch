"use client";

import { useMemo, useState } from "react";
import type { LeagueKey } from "@/lib/types/fixtures";

type LeagueOption = { key: LeagueKey; label: string };

interface SportFilterPanelProps {
	leagues: LeagueOption[];
	selectedLeague: LeagueKey;
	onLeagueChange: (league: LeagueKey) => void;
	teams: string[];
	selectedTeam: string | null;
	onTeamSelect: (teamName: string | null) => void;
	isLoading?: boolean;
	error?: string | null;
	onRetryLoad?: () => void;
}

export default function SportFilterPanel({
	leagues,
	selectedLeague,
	onLeagueChange,
	teams,
	selectedTeam,
	onTeamSelect,
	isLoading = false,
	error = null,
	onRetryLoad,
}: SportFilterPanelProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	const leagueLabel = useMemo(() => {
		return leagues.find((l) => l.key === selectedLeague)?.label ?? selectedLeague;
	}, [leagues, selectedLeague]);

	const handleReset = () => {
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
							<p className="text-xs text-zinc-400">Filtrer på liga og lag</p>
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

					<div className="grid grid-cols-1 gap-3">
						<div>
							<label className="block text-xs font-medium text-zinc-300 mb-1">Liga</label>
							<select
								value={selectedLeague}
								onChange={(e) => onLeagueChange(e.target.value as LeagueKey)}
								className="w-full rounded-xl border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
								disabled={isLoading}
							>
								{leagues.map((l) => (
									<option key={l.key} value={l.key}>
										{l.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-zinc-300 mb-1">Lag ({leagueLabel})</label>
							<select
								value={selectedTeam ?? ""}
								onChange={(e) => onTeamSelect(e.target.value ? e.target.value : null)}
								className="w-full rounded-xl border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
								disabled={isLoading || Boolean(error) || teams.length === 0}
							>
								<option value="">Alle lag</option>
								{teams.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
							{isLoading && (
								<p className="mt-1 text-xs text-zinc-400">Laster kamper…</p>
							)}
							{!isLoading && !error && teams.length === 0 && (
								<p className="mt-1 text-xs text-zinc-400">Ingen lag funnet i perioden.</p>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between">
						<button
							onClick={handleReset}
							className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
						>
							Nullstill lag
						</button>
						<div className="text-xs text-zinc-400">
							{selectedTeam ? "Filter aktivt" : "Ingen filter"}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

