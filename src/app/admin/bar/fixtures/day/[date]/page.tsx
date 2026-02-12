'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { useToast } from '@/contexts/ToastContext';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';
import { getCompetitionByKey } from '@/lib/config/competitions';

const DEFAULT_RANGE_DAYS = 30;
const LEAGUES: LeagueKey[] = ['EPL', 'NOR_ELITESERIEN', 'SERIE_A', 'UCL', 'UEL'];

type BarDoc = {
	id: string;
	name?: string;
	selectedFixtureIds?: unknown;
	cancelledFixtureIds?: unknown;
};

type SelectionState = {
	selected: string[];
	cancelled: string[];
};

function parseStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
		.map((v) => v.trim());
}

function dateKeyFromUtcIso(iso: string): string {
	const dt = new Date(iso);
	if (Number.isNaN(dt.getTime())) return 'Ukjent dato';
	const year = dt.getFullYear();
	const month = String(dt.getMonth() + 1).padStart(2, '0');
	const day = String(dt.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`; // YYYY-MM-DD i lokal tid
}

function formatKickoff(iso: string): string {
	const dt = new Date(iso);
	if (Number.isNaN(dt.getTime())) return iso;
	return dt.toLocaleTimeString('nb-NO', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatDateLabelFromKey(key: string | null | undefined): string {
	if (!key || typeof key !== 'string') return 'Ugyldig dato';
	const parts = key.split('-');
	if (parts.length !== 3) return key;
	const [yearStr, monthStr, dayStr] = parts;
	const year = Number.parseInt(yearStr ?? '', 10);
	const month = Number.parseInt(monthStr ?? '', 10) - 1;
	const day = Number.parseInt(dayStr ?? '', 10);
	const d = new Date(year, month, day);
	if (Number.isNaN(d.getTime())) return key;
	return d.toLocaleDateString('nb-NO', {
		weekday: 'short',
		day: '2-digit',
		month: 'short',
	});
}

export default function BarFixturesDayPage({ params }: { params: { date: string } }) {
	const { date } = params;
	const { showToast } = useToast();
	const { user, me } = useRequireAdminRole(['bar_owner']);
	const [bar, setBar] = useState<BarDoc | null>(null);
	const [busy, setBusy] = useState(false);
	const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
	const [fixturesError, setFixturesError] = useState<string | null>(null);
	const [fixtures, setFixtures] = useState<Fixture[]>([]);
	const [selection, setSelection] = useState<SelectionState>({ selected: [], cancelled: [] });
	const [activeLeagues, setActiveLeagues] = useState<LeagueKey[]>(LEAGUES);
	const [isSaving, setIsSaving] = useState(false);

	const fixtureProvider = useMemo(() => getFixtureProvider(), []);
	const selectedSet = useMemo(() => new Set(selection.selected), [selection.selected]);
	const cancelledSet = useMemo(() => new Set(selection.cancelled), [selection.cancelled]);
	const allLeaguesSelected = activeLeagues.length === LEAGUES.length;

	// Last bar-dokument og nåværende valg
	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
			setBusy(true);
			try {
				const token = await user.getIdToken();
				const res = await fetch(`/api/admin/bars/${me.barId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error(`Failed to load bar (${res.status})`);
				const data = (await res.json()) as BarDoc;
				if (cancelled) return;

				const selected = parseStringArray(data.selectedFixtureIds);
				const cancelledIds = parseStringArray(data.cancelledFixtureIds).filter((id) =>
					selected.includes(id),
				);

				setBar(data);
				setSelection({ selected, cancelled: cancelledIds });
			} catch (e) {
				if (cancelled) return;
				showToast({
					title: 'Feil',
					description: e instanceof Error ? e.message : 'Ukjent feil',
					variant: 'error',
				});
			} finally {
				if (!cancelled) setBusy(false);
			}
		};

		void run();
		return () => {
			cancelled = true;
		};
	}, [user, me, showToast]);

	// Last kamper (samme leverandør som planner, filtrerer på dato senere)
	useEffect(() => {
		let cancelled = false;

		async function loadFixtures() {
			setIsLoadingFixtures(true);
			setFixturesError(null);
			try {
				const now = new Date();
				const from = now.toISOString();
				const to = new Date(
					now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
				).toISOString();

				const results = await Promise.allSettled(
					LEAGUES.map((league) => fixtureProvider.getUpcomingFixtures(league, from, to)),
				);
				if (cancelled) return;

				const all: Fixture[] = [];
				results.forEach((r) => {
					if (r.status === 'fulfilled') all.push(...r.value);
					else console.error('[BarFixturesDayPage] Fixture fetch failed:', r.reason);
				});

				const deduped = new Map<string, Fixture>();
				all.forEach((f) => deduped.set(f.id, f));

				const list = Array.from(deduped.values()).sort(
					(a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime(),
				);
				setFixtures(list);
			} catch (e) {
				if (cancelled) return;
				setFixturesError('Kunne ikke laste kamper fra API.');
				console.error(e);
			} finally {
				if (!cancelled) setIsLoadingFixtures(false);
			}
		}

		void loadFixtures();
		return () => {
			cancelled = true;
		};
	}, [fixtureProvider]);

	const fixturesForDay = useMemo(() => {
		if (!date || typeof date !== 'string') return [];
		const list = fixtures.filter((f) => {
			if (!activeLeagues.includes(f.league)) return false;
			return dateKeyFromUtcIso(f.kickoffUtc) === date;
		});
		list.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
		return list;
	}, [fixtures, activeLeagues, date]);

	const selectedForDay = useMemo(
		() => fixturesForDay.filter((f) => selectedSet.has(f.id) && !cancelledSet.has(f.id)),
		[fixturesForDay, selectedSet, cancelledSet],
	);

	const cancelledForDayCount = useMemo(
		() => fixturesForDay.filter((f) => cancelledSet.has(f.id)).length,
		[fixturesForDay, cancelledSet],
	);

	const hasAnyFixtures = fixturesForDay.length > 0;

	const saveSelection = useCallback(
		async (nextSelection: SelectionState) => {
			if (!user || !me?.barId) return;
			setIsSaving(true);
			try {
				const token = await user.getIdToken();
				const res = await fetch(`/api/admin/bars/${me.barId}`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						selectedFixtureIds: nextSelection.selected,
						cancelledFixtureIds: nextSelection.cancelled,
					}),
				});

				const raw: unknown = await res.json().catch(() => ({}));
				const data =
					raw && typeof raw === 'object' && !Array.isArray(raw)
						? (raw as Record<string, unknown>)
						: null;
				if (!res.ok) {
					const msg = typeof data?.error === 'string' ? data.error : '';
					throw new Error(msg || `Failed to save (${res.status})`);
				}
			} catch (e) {
				showToast({
					title: 'Feil',
					description: e instanceof Error ? e.message : 'Ukjent feil ved lagring',
					variant: 'error',
				});
			} finally {
				setIsSaving(false);
			}
		},
		[user, me, showToast],
	);

	const handleToggleSelected = (fixtureId: string) => {
		setSelection((prev) => {
			const selected = new Set(prev.selected);
			const cancelledIds = new Set(prev.cancelled);
			if (selected.has(fixtureId)) {
				selected.delete(fixtureId);
				cancelledIds.delete(fixtureId);
			} else {
				selected.add(fixtureId);
			}
			const next = { selected: Array.from(selected), cancelled: Array.from(cancelledIds) };
			void saveSelection(next);
			return next;
		});
	};

	const handleToggleCancelled = (fixtureId: string) => {
		setSelection((prev) => {
			if (!prev.selected.includes(fixtureId)) return prev;
			const cancelledIds = new Set(prev.cancelled);
			if (cancelledIds.has(fixtureId)) cancelledIds.delete(fixtureId);
			else cancelledIds.add(fixtureId);
			const next = { ...prev, cancelled: Array.from(cancelledIds) };
			void saveSelection(next);
			return next;
		});
	};

	const toggleLeague = (league: LeagueKey) => {
		setActiveLeagues((prev) =>
			prev.includes(league) ? prev.filter((l) => l !== league) : [...prev, league],
		);
	};

	const toggleAllLeagues = () => {
		setActiveLeagues((prev) => (prev.length === LEAGUES.length ? [] : LEAGUES));
	};

	return (
		<div className="mx-auto max-w-6xl px-4 py-6">
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
						Kamper {formatDateLabelFromKey(date)}
					</h1>
					<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
						Se alle fotballkamper denne dagen, og huk av hvilke som vises hos dere.
						Endringer lagres automatisk.
					</p>
					<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
						Bar: <span className="font-medium">{bar?.name ?? '—'}</span>
						{busy && (
							<span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">Laster …</span>
						)}
					</p>
				</div>
				<div className="flex flex-col items-end gap-2">
					<Link
						href="/admin/bar"
						className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
					>
						Tilbake til kalender
					</Link>
					<span className="text-xs text-zinc-500 dark:text-zinc-400">
						{isSaving ? 'Lagrer…' : 'Endringer lagres automatisk.'}
					</span>
				</div>
			</div>

			<div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
				<span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
					valgt denne dagen: {selectedForDay.length}
				</span>
				<span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
					avlyst denne dagen: {cancelledForDayCount}
				</span>
			</div>

			<div className="mb-4">
				<p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
					Filtrer på ligaer
				</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={toggleAllLeagues}
						className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
							allLeaguesSelected
								? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
								: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
						}`}
					>
						{allLeaguesSelected ? 'Alle ligaer' : 'Velg alle'}
					</button>
					{LEAGUES.map((league) => {
						const comp = getCompetitionByKey(league);
						const isActive = activeLeagues.includes(league);
						return (
							<button
								key={league}
								type="button"
								onClick={() => toggleLeague(league)}
								className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
									isActive
										? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
										: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'
								}`}
							>
								{comp.label}
							</button>
						);
					})}
				</div>
			</div>

			{fixturesError && (
				<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
					{fixturesError}
				</div>
			)}

			{isLoadingFixtures && !hasAnyFixtures ? (
				<p className="text-sm text-zinc-600 dark:text-zinc-300">Laster kamper…</p>
			) : !hasAnyFixtures ? (
				<p className="text-sm text-zinc-600 dark:text-zinc-300">
					Ingen kamper denne dagen for de valgte ligaene.
				</p>
			) : (
				<div className="space-y-3">
					{fixturesForDay.map((f) => {
						const selected = selectedSet.has(f.id);
						const cancelled = cancelledSet.has(f.id);
						const comp = getCompetitionByKey(f.league);
						return (
							<div
								key={f.id}
								className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
											{comp.label}
										</span>
										<span className="text-xs text-zinc-500 dark:text-zinc-400">
											{formatKickoff(f.kickoffUtc)}
										</span>
										{cancelled && (
											<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
												Avlyst
											</span>
										)}
									</div>
									<div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
										{f.homeTeam} – {f.awayTeam}
									</div>
								</div>
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => handleToggleSelected(f.id)}
										className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
											selected
												? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
												: 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900'
										}`}
									>
										{selected ? 'Vises hos oss' : 'Vis hos oss'}
									</button>
									<button
										type="button"
										disabled={!selected}
										onClick={() => handleToggleCancelled(f.id)}
										className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
											cancelled
												? 'border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500 dark:text-zinc-900'
												: 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900'
										}`}
									>
										{cancelled ? 'Avlyst' : 'Marker avlyst'}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
