'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useRequireAdminRole } from '@/lib/admin/useRequireAdminRole';
import { sendEmailVerification } from 'firebase/auth';
import { StatusPill } from '@/components/admin/StatusPill';
import { getBillingText } from '@/lib/admin/statusText';
import { daysRemaining, tsToMs } from '@/lib/utils/time';

type BarDoc = {
  id: string;
  name?: string;
  email?: string;
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
};

type BarProfileFormState = {
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
	  const [profile, setProfile] = useState<BarProfileFormState | null>(null);


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

	      const body: Record<string, unknown> = {
	        description: profile.description.trim(),
	        specialOffers: profile.specialOffers.trim(),
	        facilities,
	      };

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
		          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Barprofil</h2>
		          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
		            Gjør det enkelt for supportere å forstå hvordan det er hos dere når de ser kamp.
		          </p>
		          {!profile ? (
		            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Laster barprofil…</p>
		          ) : (
		            <>
		              <div className="mt-4 space-y-4">
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
		      </div>
		    </div>
		  );
}
