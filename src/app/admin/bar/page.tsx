'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Autocomplete, GoogleMap as GoogleMapComponent, LoadScriptNext, Marker } from '@react-google-maps/api';
import { useToast } from '@/contexts/ToastContext';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { sendEmailVerification } from 'firebase/auth';
import { StatusPill } from '@/components/admin/StatusPill';
import { getBillingText } from '@/lib/admin/statusText';
import { daysRemaining, tsToMs } from '@/lib/utils/time';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import { getFixtureProvider } from '@/lib/providers/fixtures';

const CALENDAR_RANGE_DAYS = 30;
const LEAGUES: LeagueKey[] = ['EPL', 'NOR_ELITESERIEN', 'SERIE_A', 'UCL', 'UEL'];

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

type BarDoc = {
	id: string;
	name?: string;
	email?: string;
	address?: string;
	phone?: string;
	location?: {
		lat: number;
		lng: number;
	};
	isVisible?: boolean;
	billingEnabled?: boolean;
	billingStatus?: string;
	stripe?: {
		gracePeriodEndsAt?: unknown;
	};
	description?: string;
	specialOffers?: string;
	facilities?: {
		screens?: number;
		hasFood?: boolean;
		hasOutdoorSeating?: boolean;
		hasWifi?: boolean;
		capacity?: number;
		hasProjector?: boolean;
		servesWarmFood?: boolean;
		servesSnacks?: boolean;
		hasVegetarianOptions?: boolean;
		familyFriendly?: boolean;
		canReserveTable?: boolean;
	};
	selectedFixtureIds?: unknown;
	cancelledFixtureIds?: unknown;
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
	return `${year}-${month}-${day}`; // YYYY-MM-DD in local time
}

function createCalendarRange(): { from: string; to: string } {
	const now = new Date();
	const from = now.toISOString();
	const toDate = new Date(now.getTime() + CALENDAR_RANGE_DAYS * 24 * 60 * 60 * 1000);
	const to = toDate.toISOString();
	return { from, to };
}

	function formatCalendarDate(date: Date): string {
		return date.toLocaleDateString('nb-NO', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
		});
	}

type BarProfileFormState = {
	name: string;
	address: string;
	phone: string;
	screens: string;
	hasProjector: boolean;
	servesWarmFood: boolean;
	servesSnacks: boolean;
	hasVegetarianOptions: boolean;
	hasOutdoorSeating: boolean;
	hasWifi: boolean;
	familyFriendly: boolean;
	canReserveTable: boolean;
	capacity: string;
	description: string;
	specialOffers: string;
};

function buildProfileFromBar(bar: BarDoc): BarProfileFormState {
  const f = bar.facilities ?? {};
  let screensBucket = '';
	  if (typeof f.screens === 'number' && Number.isFinite(f.screens) && f.screens > 0) {
	    if (f.screens <= 2) screensBucket = '1-2';
	    else if (f.screens <= 5) screensBucket = '3-5';
	    else screensBucket = '6+';
	  }
	  return {
	    name: bar.name ?? '',
	    address: typeof bar.address === 'string' ? bar.address : '',
	    phone: typeof bar.phone === 'string' ? bar.phone : '',
	    screens: screensBucket,
	    hasProjector: Boolean(f.hasProjector),
	    servesWarmFood: Boolean(f.servesWarmFood),
	    servesSnacks: Boolean(f.servesSnacks),
	    hasVegetarianOptions: Boolean(f.hasVegetarianOptions),
	    hasOutdoorSeating: Boolean(f.hasOutdoorSeating),
	    hasWifi: Boolean(f.hasWifi),
	    familyFriendly: Boolean(f.familyFriendly),
	    canReserveTable: Boolean(f.canReserveTable),
	    capacity:
	      typeof f.capacity === 'number' && Number.isFinite(f.capacity) && f.capacity > 0
	        ? String(f.capacity)
	        : '',
	    description: bar.description ?? '',
	    specialOffers: bar.specialOffers ?? '',
	  };
}

export default function BarOwnerDashboard() {
  const { showToast } = useToast();
  const { user, me } = useRequireAdminRole(['bar_owner']);
  const [bar, setBar] = useState<BarDoc | null>(null);
	const [busy, setBusy] = useState(false);
	const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
	const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
			  const [profile, setProfile] = useState<BarProfileFormState | null>(null);
	  const [fixtures, setFixtures] = useState<Fixture[]>([]);
	  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
	  const [fixturesError, setFixturesError] = useState<string | null>(null);


  const emailVerified = Boolean(user?.emailVerified);
  const graceEndsMs = tsToMs(bar?.stripe?.gracePeriodEndsAt);
  const paymentFailed = bar?.billingStatus === 'payment_failed';

	  const graceDaysRemaining = useMemo(() => {
    if (!paymentFailed || typeof graceEndsMs !== 'number') return null;
    const d = daysRemaining(graceEndsMs);
    return d > 0 ? d : null;
  }, [paymentFailed, graceEndsMs]);

  const graceActive = paymentFailed && typeof graceDaysRemaining === 'number';
  const graceExpired = paymentFailed && !graceActive;
  const canceled = bar?.billingStatus === 'canceled';

	  const visibilityBlockedReason =
    !emailVerified
      ? 'Du må verifisere e-post før baren kan settes synlig.'
      : canceled
        ? 'Abonnementet er kansellert. Baren kan ikke settes synlig.'
        : graceExpired
          ? 'Betalingen har feilet og fristen er utløpt. Oppdater betalingskort før baren kan bli synlig.'
          : null;

	  const fixtureProvider = useMemo(() => getFixtureProvider(), []);
	  const calendarRange = useMemo(() => createCalendarRange(), []);

	  useEffect(() => {
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
		        setBar(data);
		        setProfile(buildProfileFromBar(data));
		        if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
		        	setLocation({ lat: data.location.lat, lng: data.location.lng });
		        } else {
		        	setLocation(null);
		        }
      } catch (e) {
        showToast({
          title: 'Feil',
          description: e instanceof Error ? e.message : 'Ukjent feil',
          variant: 'error',
        });
      } finally {
        setBusy(false);
      }
    };
	    void run();
	  }, [user, me, showToast]);

	  useEffect(() => {
	    let cancelled = false;

	    async function loadFixtures() {
	      setIsLoadingFixtures(true);
	      setFixturesError(null);
	      try {
	        const results = await Promise.allSettled(
	          LEAGUES.map((league) => fixtureProvider.getUpcomingFixtures(league, calendarRange.from, calendarRange.to)),
	        );
	        if (cancelled) return;

	        const all: Fixture[] = [];
	        results.forEach((r) => {
	          if (r.status === 'fulfilled') all.push(...r.value);
	          else console.error('[BarOwnerDashboard] Fixture fetch failed:', r.reason);
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
	  }, [fixtureProvider, calendarRange.from, calendarRange.to]);

	  const activeSelectedFixtureIds = useMemo(() => {
	    const selected = new Set(parseStringArray(bar?.selectedFixtureIds));
	    const cancelled = parseStringArray(bar?.cancelledFixtureIds);
	    for (const id of cancelled) {
	      selected.delete(id);
	    }
	    return selected;
	  }, [bar?.selectedFixtureIds, bar?.cancelledFixtureIds]);

	  const selectedFixturesByDateKey = useMemo(() => {
	    const map = new Map<string, Fixture[]>();
	    if (activeSelectedFixtureIds.size === 0 || fixtures.length === 0) return map;

	    for (const f of fixtures) {
	      if (!activeSelectedFixtureIds.has(f.id)) continue;
	      const key = dateKeyFromUtcIso(f.kickoffUtc);
	      const list = map.get(key) ?? [];
	      list.push(f);
	      map.set(key, list);
	    }
	    map.forEach((list) => {
	      list.sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
	    });
	    return map;
	  }, [fixtures, activeSelectedFixtureIds]);

			const hasSelectedFixturesInCalendar = selectedFixturesByDateKey.size > 0;
		
			const calendarDays = useMemo(() => {
	    const fromDate = new Date(calendarRange.from);
	    const toDate = new Date(calendarRange.to);
	    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];
	    const days: { key: string; date: Date }[] = [];
	    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
	    // Safety guard on number of days
	    while (current <= toDate && days.length < 62) {
	      const date = new Date(current);
	      const year = date.getFullYear();
	      const month = String(date.getMonth() + 1).padStart(2, '0');
	      const day = String(date.getDate()).padStart(2, '0');
	      const key = `${year}-${month}-${day}`;
	      days.push({ key, date });
	      current.setDate(current.getDate() + 1);
	    }
	    return days;
	  }, [calendarRange.from, calendarRange.to]);

	  const todayKey = useMemo(() => {
	    const now = new Date();
	    const year = now.getFullYear();
	    const month = String(now.getMonth() + 1).padStart(2, '0');
	    const day = String(now.getDate()).padStart(2, '0');
	    return `${year}-${month}-${day}`;
	  }, []);

	  const hasAnyFixtures = fixtures.length > 0;

  const toggleVisible = async () => {
    if (!user || !me?.barId || !bar) return;
    const next = !bar.isVisible;
		if (next && visibilityBlockedReason) {
			showToast({
				title: 'Kan ikke settes synlig',
				description: visibilityBlockedReason,
				variant: 'error',
			});
			return;
		}
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/bars/${me.barId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVisible: next }),
      });
			const raw: unknown = await res.json().catch(() => ({}));
			const data =
				raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
			if (!res.ok) {
				const msg = typeof data?.error === 'string' ? data.error : '';
				throw new Error(msg || `Failed to update (${res.status})`);
			}
      setBar({ ...bar, isVisible: next });
      showToast({
        title: 'Oppdatert',
			description: next ? 'Baren er nå synlig i appen.' : 'Baren er nå skjult.',
        variant: 'success',
      });
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

	const resendVerification = async () => {
		if (!user) return;
		setBusy(true);
		try {
			await sendEmailVerification(user);
			showToast({
				title: 'Sendt',
				description: 'Vi har sendt en ny e-post for verifisering. Sjekk innboksen.',
				variant: 'success',
			});
		} catch (e) {
			showToast({
				title: 'Feil',
				description: e instanceof Error ? e.message : 'Ukjent feil',
				variant: 'error',
			});
		} finally {
			setBusy(false);
		}
	};

  const updatePaymentCard = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      const errMsg = typeof data?.error === 'string' ? data.error : '';
      if (!res.ok) throw new Error(errMsg || `Kunne ikke åpne portal (${res.status})`);

      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) throw new Error('Mangler portal-url');
      window.location.assign(url);
    } catch (e) {
      showToast({
        title: 'Feil',
        description: e instanceof Error ? e.message : 'Ukjent feil',
        variant: 'error',
      });
      setBusy(false);
    }
  };

	  const updateProfileField = <K extends keyof BarProfileFormState>(
	    key: K,
	    value: BarProfileFormState[K],
	  ) => {
	    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
	  };

		const handleAutocompletePlaceChanged = () => {
			if (!autocomplete) return;
			const place = autocomplete.getPlace();
			if (!place) return;

			const formatted =
				(typeof place.formatted_address === 'string' && place.formatted_address) ||
				(typeof place.name === 'string' && place.name) ||
				'';

			if (formatted) {
				updateProfileField('address', formatted);
			}

			const geometry = place.geometry;
			const loc = geometry?.location;
			if (loc) {
				const lat = loc.lat();
				const lng = loc.lng();
				if (Number.isFinite(lat) && Number.isFinite(lng)) {
					setLocation({ lat, lng });
				}
			}
		};

		const handleMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
			const lat = event.latLng?.lat();
			const lng = event.latLng?.lng();
			if (typeof lat === 'number' && typeof lng === 'number') {
				setLocation({ lat, lng });
			}
		};

			const saveProfile = async () => {
				if (!user || !me?.barId || !profile) return;
				setBusy(true);
				try {
					const token = await user.getIdToken();

					let screensNumber: number | undefined;
					switch (profile.screens) {
						case '1-2':
							screensNumber = 2;
							break;
						case '3-5':
							screensNumber = 4;
							break;
						case '6+':
							screensNumber = 6;
							break;
						default:
							screensNumber = undefined;
					}

					const facilities: Record<string, unknown> = {
						hasProjector: profile.hasProjector,
						servesWarmFood: profile.servesWarmFood,
						servesSnacks: profile.servesSnacks,
						hasVegetarianOptions: profile.hasVegetarianOptions,
						hasOutdoorSeating: profile.hasOutdoorSeating,
						hasWifi: profile.hasWifi,
						familyFriendly: profile.familyFriendly,
						canReserveTable: profile.canReserveTable,
					};

					if (typeof screensNumber === 'number') {
						facilities.screens = screensNumber;
					}

					const capacityNum = Number.parseInt(profile.capacity.trim(), 10);
					if (Number.isFinite(capacityNum) && capacityNum > 0) {
						facilities.capacity = capacityNum;
					}

					// Avled hasFood ut fra om de serverer varm mat eller snacks.
					facilities.hasFood = Boolean(profile.servesWarmFood || profile.servesSnacks);

					const name = profile.name.trim();
					const address = profile.address.trim();
					const phone = profile.phone.trim();

						const body: Record<string, unknown> = {
							description: profile.description.trim(),
							specialOffers: profile.specialOffers.trim(),
							facilities,
						};

					if (name) {
						body.name = name;
					}

					if (address) {
						body.address = address;
					}

						body.phone = phone;

						if (location) {
							body.location = location;
						}

					const res = await fetch(`/api/admin/bars/${me.barId}`, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(body),
					});
					const raw: unknown = await res.json().catch(() => ({}));
					const data =
						raw && typeof raw === 'object' && !Array.isArray(raw)
							? (raw as Record<string, unknown>)
							: null;
					if (!res.ok) {
						const msg = typeof data?.error === 'string' ? data.error : '';
						throw new Error(msg || `Kunne ikke lagre barprofil (${res.status})`);
					}

							setBar((prev) =>
								prev
									? {
									    ...prev,
									    name: name || prev.name,
									    address: address || prev.address,
									    phone,
									    location: location ?? prev.location,
									    description: body.description as string,
									    specialOffers: body.specialOffers as string,
									    facilities: {
									      ...(prev.facilities ?? {}),
									      ...(facilities as Record<string, unknown>),
									    },
									  }
									: prev,
									);

					showToast({
						title: 'Lagret',
						description: 'Barprofilen er oppdatert.',
						variant: 'success',
					});
				} catch (e) {
					showToast({
						title: 'Feil',
						description: e instanceof Error ? e.message : 'Ukjent feil',
						variant: 'error',
					});
				} finally {
					setBusy(false);
				}
			};

			const previewName =
				(profile?.name && profile.name.trim()) ||
				(typeof bar?.name === 'string' && bar.name.trim()) ||
				'Navn ikke satt ennå';

			const previewAddress =
				(profile?.address && profile.address.trim()) ||
				(typeof bar?.address === 'string' && bar.address.trim()) ||
				'Adresse ikke satt ennå';

			const previewPhone =
				(profile?.phone && profile.phone.trim()) ||
				(typeof bar?.phone === 'string' && bar.phone.trim()) ||
				'';

			const previewScreensLabel = (() => {
				if (!profile) return 'Ikke oppgitt';
				switch (profile.screens) {
					case '1-2':
						return '1–2 skjermer';
					case '3-5':
						return '3–5 skjermer';
					case '6+':
						return '6+ skjermer';
					default:
						return 'Ikke oppgitt';
				}
			})();

			const previewFoodDetails: string[] = [];
			if (profile?.servesWarmFood) previewFoodDetails.push('Varm mat');
			if (profile?.servesSnacks) previewFoodDetails.push('Snacks / småretter');
			if (profile?.hasVegetarianOptions) previewFoodDetails.push('Vegetar/vegansk');
			const previewFoodLabel =
				previewFoodDetails.length > 0 ? previewFoodDetails.join(' • ') : 'Ikke oppgitt';

			const previewFacilityBadges: string[] = [];
			if (profile?.hasOutdoorSeating) previewFacilityBadges.push('🌤️ Uteservering');
			if (profile?.hasWifi) previewFacilityBadges.push('📶 Gratis WiFi');
			if (profile?.familyFriendly)
				previewFacilityBadges.push('👨‍👩‍👧 Familievennlig før kl. 21');
			if (profile?.canReserveTable) previewFacilityBadges.push('📅 Reservasjon til kamp');
			if (profile?.hasProjector) previewFacilityBadges.push('📽️ Projektor');

			const previewCapacityLabel =
				profile && profile.capacity.trim().length > 0
					? `Ca. ${profile.capacity.trim()} personer`
					: 'Ikke oppgitt';

			return (
	    <div>
	      <div className="mb-6">
	        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Bar-panel</h1>
	        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
	          Synlighet, betaling og barprofil.
	        </p>
	      </div>

	      {!emailVerified && (
	        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
	          <div className="font-medium">E-post ikke verifisert</div>
	          <div className="mt-1">
	            Du kan ikke sette baren synlig før e-posten er verifisert.
	          </div>
	          <button
	            type="button"
	            disabled={busy}
	            onClick={resendVerification}
	            className="mt-3 inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
	          >
	            Send verifisering på nytt
	          </button>
	        </div>
	      )}

	      {paymentFailed && graceActive && (
	        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
	          <div className="font-medium">Betaling feilet</div>
	          <div className="mt-1">
		            Baren kan fortsatt være synlig i en kort periode.
		            {typeof graceDaysRemaining === 'number'
		              ? ` Vises i ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'dag' : 'dager'}.`
		              : ''}{' '}
		            Oppdater betalingskort så snart som mulig.
	          </div>
	        </div>
	      )}

	      {paymentFailed && graceExpired && (
	        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
		          <div className="font-medium">Frist utløpt</div>
	          <div className="mt-1">
	            Baren kan ikke settes synlig før betaling er fikset.
	          </div>
	        </div>
	      )}

		      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{bar?.name ?? '—'}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{bar?.email ?? '—'}</p>
				<div className="mt-3">
				  <StatusPill kind="visibility" isVisible={bar?.isVisible} />
				</div>
          <button
            type="button"
			    disabled={busy || !bar || (!bar?.isVisible && Boolean(visibilityBlockedReason))}
            onClick={toggleVisible}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
				    {bar?.isVisible ? 'Skjul' : 'Gjør synlig'}
          </button>
				{!bar?.isVisible && visibilityBlockedReason && (
				  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{visibilityBlockedReason}</p>
				)}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Betaling</h2>
				  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
				    <StatusPill
				      kind="billing"
				      billingEnabled={bar?.billingEnabled}
				      billingStatus={bar?.billingStatus}
				      gracePeriodEndsAt={bar?.stripe?.gracePeriodEndsAt}
				    />
				  </div>
				  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
				    Status: <span className="font-medium">{getBillingText({
				      billingEnabled: bar?.billingEnabled,
				      billingStatus: bar?.billingStatus,
				      gracePeriodEndsAt: bar?.stripe?.gracePeriodEndsAt,
				    })}</span>
				  </p>

          <button
            type="button"
            disabled={busy || !bar}
            onClick={updatePaymentCard}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
	            Oppdater betalingskort
          </button>
        </div>

		        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
		          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kamper</h2>
		          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
		            Velg hvilke kamper baren din viser, slik at de vises på kartet for sluttbrukere.
		          </p>
		          <Link
		            href="/admin/bar/fixtures"
		            className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
		          >
		            Velg kamper
		          </Link>
		        </div>

			        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Kalender: valgte kamper</h2>
			          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
			            Oversikt over kampene du har valgt å vise på baren din (neste {CALENDAR_RANGE_DAYS} dager).
			          </p>
			          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
			            Endre hvilke kamper som vises under fanen <span className="font-medium">Kamper</span>.
			          </p>
			
			          {fixturesError && (
			            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
			              {fixturesError}
			            </div>
			          )}
			
			          {isLoadingFixtures && !hasAnyFixtures ? (
			            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Laster kamper…</p>
			          ) : !hasAnyFixtures ? (
			            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
			              Ingen kommende kamper i kalenderperioden.
			            </p>
			          ) : !hasSelectedFixturesInCalendar ? (
			            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
			              Du har ikke valgt noen kamper ennå. Gå til
			              <Link href="/admin/bar/fixtures" className="ml-1 underline">
			                Kamper
			              </Link>
			              {' '}for å velge.
			            </p>
			          ) : (
			            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
			              {calendarDays.map(({ key, date }) => {
			                const dayFixtures = selectedFixturesByDateKey.get(key) ?? [];
			                const isToday = key === todayKey;
			                if (dayFixtures.length === 0) {
			                  return (
			                    <div
			                      key={key}
			                      className="flex flex-col rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400"
			                    >
			                      <div className="flex items-baseline justify-between gap-2">
			                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
			                          {formatCalendarDate(date)}
			                        </span>
			                        {isToday && (
			                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
			                            I dag
			                          </span>
			                        )}
			                      </div>
			                      <span className="mt-1">Ingen kamper</span>
			                    </div>
			                  );
			                }
			
			                const maxVisible = 2;
			                const visible = dayFixtures.slice(0, maxVisible);
			                const remaining = dayFixtures.length - visible.length;
			
			                return (
			                  <div
			                    key={key}
			                    className="flex flex-col rounded-xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
			                  >
			                    <div className="flex items-baseline justify-between gap-2">
			                      <span className="font-medium">
			                        {formatCalendarDate(date)}
			                      </span>
			                      {isToday && (
			                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
			                          I dag
			                        </span>
			                      )}
			                    </div>
			                    <div className="mt-1 space-y-0.5">
			                      {visible.map((f) => (
			                        <div key={f.id} className="truncate">
			                          {f.homeTeam} – {f.awayTeam}
			                        </div>
			                      ))}
			                      {remaining > 0 && (
			                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
			                          +{remaining} flere kamper
			                        </div>
			                      )}
			                    </div>
			                  </div>
			                );
			              })}
			            </div>
			          )}
			        </div>

		        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
		          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Barprofil</h2>
		          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
		            Gjør det enkelt for supportere å forstå hvordan det er hos dere når de ser kamp.
		          </p>
		          {!profile ? (
		            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Laster barprofil…</p>
		          ) : (
			            <>
			              <div className="mt-4 space-y-4">
			                <div>
			                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
			                    Navn på bar
			                  </label>
			                  <input
			                    type="text"
			                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
			                    value={profile.name}
			                    onChange={(e) => updateProfileField('name', e.target.value)}
			                  />
			                </div>
			
			                <div>
			                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
			                    Adresse
			                  </label>
				                  {GOOGLE_MAPS_API_KEY ? (
				                    <div className="space-y-3">
				                      <LoadScriptNext
				                        id="bar-profile-address-map"
				                        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
				                        libraries={['places']}
				                        preventGoogleFontsLoading
				                      >
				                        <div className="space-y-3">
				                          <Autocomplete
				                            onLoad={(ac) => setAutocomplete(ac)}
				                            onPlaceChanged={handleAutocompletePlaceChanged}
				                          >
				                            <input
				                              type="text"
				                              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
				                              value={profile.address}
				                              onChange={(e) => updateProfileField('address', e.target.value)}
				                            />
				                          </Autocomplete>
				
				                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
				                            <div className="h-52 w-full">
				                              {location ? (
				                                <GoogleMapComponent
				                                  mapContainerStyle={{ width: '100%', height: '100%' }}
				                                  center={location}
				                                  zoom={16}
				                                  options={{
				                                    streetViewControl: false,
				                                    mapTypeControl: false,
				                                    fullscreenControl: true,
				                                  }}
				                                >
				                                  <Marker position={location} draggable onDragEnd={handleMarkerDragEnd} />
				                                </GoogleMapComponent>
				                              ) : (
				                                <div className="flex h-full items-center justify-center px-3 text-xs text-zinc-500 dark:text-zinc-400">
				                                  Søk opp adressen over og velg et treff for å se og finjustere plassering
				                                  på kartet.
				                                </div>
				                              )}
				                            </div>
				                          </div>
				                        </div>
				                      </LoadScriptNext>
				                    </div>
				                  ) : (
				                    <>
				                      <input
				                        type="text"
				                        className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
				                        value={profile.address}
				                        onChange={(e) => updateProfileField('address', e.target.value)}
				                      />
				                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
				                        Kart og adresseforslag krever en Google Maps API-nøkkel
				                        (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
				                      </p>
				                    </>
				                  )}
			                </div>
			
			                <div>
			                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
			                    Telefon
			                  </label>
			                  <input
			                    type="tel"
			                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
			                    value={profile.phone}
			                    onChange={(e) => updateProfileField('phone', e.target.value)}
			                  />
			                </div>
		                {/* Skjermer */}
		                <div>
		                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Skjermer</p>
		                  <div className="flex flex-wrap items-center gap-3">
		                    <select
		                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
		                      value={profile.screens}
		                      onChange={(e) => updateProfileField('screens', e.target.value)}
		                    >
		                      <option value="">Velg antall skjermer</option>
		                      <option value="1-2">1–2 skjermer</option>
		                      <option value="3-5">3–5 skjermer</option>
		                      <option value="6+">6+ skjermer</option>
		                    </select>
		                    <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.hasProjector}
		                        onChange={(e) => updateProfileField('hasProjector', e.target.checked)}
		                      />
		                      Har projektor
		                    </label>
		                  </div>
		                </div>

		                {/* Mat */}
		                <div>
		                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Mat</p>
		                  <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.servesWarmFood}
		                        onChange={(e) => updateProfileField('servesWarmFood', e.target.checked)}
		                      />
		                      Serverer varm mat
		                    </label>
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.servesSnacks}
		                        onChange={(e) => updateProfileField('servesSnacks', e.target.checked)}
		                      />
		                      Snacks / småretter
		                    </label>
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.hasVegetarianOptions}
		                        onChange={(e) => updateProfileField('hasVegetarianOptions', e.target.checked)}
		                      />
		                      Vegetar/vegansk alternativer
		                    </label>
		                  </div>
		                </div>

		                {/* Fasiliteter */}
		                <div>
		                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Fasiliteter</p>
		                  <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.hasOutdoorSeating}
		                        onChange={(e) => updateProfileField('hasOutdoorSeating', e.target.checked)}
		                      />
		                      Uteservering
		                    </label>
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.hasWifi}
		                        onChange={(e) => updateProfileField('hasWifi', e.target.checked)}
		                      />
		                      Gratis WiFi
		                    </label>
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.familyFriendly}
		                        onChange={(e) => updateProfileField('familyFriendly', e.target.checked)}
		                      />
		                      Familievennlig før kl. 21
		                    </label>
		                    <label className="inline-flex items-center gap-2">
		                      <input
		                        type="checkbox"
		                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
		                        checked={profile.canReserveTable}
		                        onChange={(e) => updateProfileField('canReserveTable', e.target.checked)}
		                      />
		                      Mulighet for å reservere bord til kamp
		                    </label>
		                  </div>
		                </div>

		                {/* Kapasitet */}
		                <div>
		                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
		                    Omtrent kapasitet (antall personer)
		                  </label>
		                  <input
		                    type="number"
		                    min={0}
		                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
		                    value={profile.capacity}
		                    onChange={(e) => updateProfileField('capacity', e.target.value)}
		                  />
		                </div>

		                {/* Tekstfelter */}
		                <div>
		                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
		                    Om baren
		                  </label>
		                  <textarea
		                    rows={3}
		                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
		                    value={profile.description}
		                    onChange={(e) => updateProfileField('description', e.target.value)}
		                  />
		                </div>

		                <div>
		                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
		                    Tilbud & happy hour
		                  </label>
		                  <textarea
		                    rows={3}
		                    placeholder="F.eks. 2-for-1 på øl før kampstart, egne kampmenyer, happy hour-tider osv."
		                    className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
		                    value={profile.specialOffers}
		                    onChange={(e) => updateProfileField('specialOffers', e.target.value)}
		                  />
		                </div>
		              </div>

		              <button
		                type="button"
		                disabled={busy}
		                onClick={saveProfile}
		                className="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
		              >
		                Lagre barprofil
		              </button>
		            </>
			          )}
			        </div>
			
			        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
			            Forhåndsvisning for brukere
			          </h2>
			          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
			            Slik vil baren din se ut i kartet og detaljvisningen for supportere.
			          </p>
			          {!profile ? (
			            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
			              Laster forhåndsvisning…
			            </p>
			          ) : (
			            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100">
			              <div>
			                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
			                  {previewName}
			                </p>
			                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
			                  <span>📍</span>
			                  <span>{previewAddress}</span>
			                </p>
			              </div>

			              <div className="mt-3 flex flex-wrap gap-2">
			                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
			                  📺 {previewScreensLabel}
			                </span>
			                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
			                  🍽️ {previewFoodLabel}
			                </span>
			                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
			                  👥 {previewCapacityLabel}
			                </span>
			              </div>

			              {previewFacilityBadges.length > 0 && (
			                <div className="mt-2 flex flex-wrap gap-2">
			                  {previewFacilityBadges.map((badge) => (
			                    <span
			                      key={badge}
			                      className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
			                    >
			                      {badge}
			                    </span>
			                  ))}
			                </div>
			              )}

			              {profile.description.trim().length > 0 && (
			                <div className="mt-3">
			                  <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
			                    Om baren
			                  </p>
			                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line">
			                    {profile.description}
			                  </p>
			                </div>
			              )}

			              {profile.specialOffers.trim().length > 0 && (
			                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-50">
			                  <p className="text-[11px] font-medium uppercase tracking-wide">
			                    Tilbud &amp; kamp
			                  </p>
			                  <p className="mt-1 whitespace-pre-line">{profile.specialOffers}</p>
			                </div>
			              )}

			              <div className="mt-3 flex gap-2">
			                {previewPhone ? (
			                  <a
			                    href={`tel:${previewPhone}`}
			                    className="flex-1 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors text-center text-xs"
			                  >
			                    📞 Ring
			                  </a>
			                ) : (
			                  <div className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium rounded-lg text-center text-xs">
			                    📞 Ingen telefon
			                  </div>
			                )}
			              </div>

			              <p className="mt-3 text-[10px] text-zinc-500 dark:text-zinc-400">
			                Dette er kun en forhåndsvisning. Den faktiske visningen i appen avhenger også
			                av synlighet og hvilke kamper du har valgt.
			              </p>
			            </div>
			          )}
			        </div>
			      </div>
			    </div>
			  );
		}
		