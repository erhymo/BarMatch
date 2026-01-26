"use client";

import { useState } from "react";

interface SportFilterPanelProps {
	onTeamSelect: (teamId: string | null) => void;
}

export default function SportFilterPanel({
	onTeamSelect,
}: SportFilterPanelProps) {
	const [isExpanded, setIsExpanded] = useState(true);

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
							<p className="text-xs text-zinc-400">Filter kommer snart</p>
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
						<div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
							<p className="text-sm text-zinc-200 font-semibold mb-1">
								Filter kommer snart
							</p>
							<p className="text-xs text-zinc-400">
								Vi har fjernet all mock/demo-kampdata. Nar vi har ekte kobling mellom barer og kamper
								kan du filtrere pa liga og lag her.
							</p>
						</div>

						<div className="flex justify-end">
							<button
								onClick={handleReset}
								className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
							>
								Nullstill
							</button>
						</div>
					</div>
			)}
		</div>
	);
}

