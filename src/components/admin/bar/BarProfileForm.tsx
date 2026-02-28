'use client';

import { Autocomplete, GoogleMap as GoogleMapComponent, LoadScriptNext, Marker } from '@react-google-maps/api';
import type { BarProfileFormState } from '@/lib/admin/bar/types';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface BarProfileFormProps {
  profile: BarProfileFormState | null;
  location: { lat: number; lng: number } | null;
  busy: boolean;
  autocomplete: google.maps.places.Autocomplete | null;
  setAutocomplete: (ac: google.maps.places.Autocomplete) => void;
  updateProfileField: <K extends keyof BarProfileFormState>(key: K, value: BarProfileFormState[K]) => void;
  onAutocompletePlaceChanged: () => void;
  onMarkerDragEnd: (event: google.maps.MapMouseEvent) => void;
  onSave: () => void;
}

export function BarProfileForm({
  profile, location, busy, setAutocomplete,
  updateProfileField, onAutocompletePlaceChanged, onMarkerDragEnd, onSave,
}: BarProfileFormProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <span className="text-lg">✏️</span>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Barprofil</h2>
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Gjør det enkelt for supportere å forstå hvordan det er hos dere.
      </p>
      {!profile ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Laster barprofil…</p>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            <Field label="Navn på bar">
              <input type="text" className={inputCls} value={profile.name} onChange={(e) => updateProfileField('name', e.target.value)} />
            </Field>
            <Field label="Adresse">
              {GOOGLE_MAPS_API_KEY ? (
                <div className="space-y-3">
                  <LoadScriptNext id="bar-profile-address-map" googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']} preventGoogleFontsLoading>
                    <div className="space-y-3">
                      <Autocomplete onLoad={(ac) => setAutocomplete(ac)} onPlaceChanged={onAutocompletePlaceChanged}>
                        <input type="text" className={inputCls} value={profile.address} onChange={(e) => updateProfileField('address', e.target.value)} />
                      </Autocomplete>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="h-52 w-full">
                          {location ? (
                            <GoogleMapComponent mapContainerStyle={{ width: '100%', height: '100%' }} center={location} zoom={16} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
                              <Marker position={location} draggable onDragEnd={onMarkerDragEnd} />
                            </GoogleMapComponent>
                          ) : (
                            <div className="flex h-full items-center justify-center px-3 text-xs text-zinc-500 dark:text-zinc-400">
                              Søk opp adressen over og velg et treff for å se og finjustere plassering på kartet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </LoadScriptNext>
                </div>
              ) : (
                <>
                  <input type="text" className={inputCls} value={profile.address} onChange={(e) => updateProfileField('address', e.target.value)} />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Kart og adresseforslag krever en Google Maps API-nøkkel (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).</p>
                </>
              )}
            </Field>
            <Field label="Telefon">
              <input type="tel" className={inputCls} value={profile.phone} onChange={(e) => updateProfileField('phone', e.target.value)} />
            </Field>
            <Field label="Skjermer">
              <div className="flex flex-wrap items-center gap-3">
                <select className={inputCls} value={profile.screens} onChange={(e) => updateProfileField('screens', e.target.value)}>
                  <option value="">Velg antall skjermer</option>
                  <option value="1-2">1–2 skjermer</option>
                  <option value="3-5">3–5 skjermer</option>
                  <option value="6+">6+ skjermer</option>
                </select>
                <Checkbox label="Har projektor" checked={profile.hasProjector} onChange={(v) => updateProfileField('hasProjector', v)} />
              </div>
            </Field>
            <Field label="Mat">
              <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <Checkbox label="Serverer varm mat" checked={profile.servesWarmFood} onChange={(v) => updateProfileField('servesWarmFood', v)} />
                <Checkbox label="Snacks / småretter" checked={profile.servesSnacks} onChange={(v) => updateProfileField('servesSnacks', v)} />
                <Checkbox label="Vegetar/vegansk alternativer" checked={profile.hasVegetarianOptions} onChange={(v) => updateProfileField('hasVegetarianOptions', v)} />
              </div>
            </Field>
            <Field label="Fasiliteter">
              <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <Checkbox label="Uteservering" checked={profile.hasOutdoorSeating} onChange={(v) => updateProfileField('hasOutdoorSeating', v)} />
                <Checkbox label="Gratis WiFi" checked={profile.hasWifi} onChange={(v) => updateProfileField('hasWifi', v)} />
                <Checkbox label="Familievennlig før kl. 21" checked={profile.familyFriendly} onChange={(v) => updateProfileField('familyFriendly', v)} />
                <Checkbox label="Mulighet for å reservere bord til kamp" checked={profile.canReserveTable} onChange={(v) => updateProfileField('canReserveTable', v)} />
              </div>
            </Field>
            <Field label="Omtrent kapasitet (antall personer)">
              <input type="number" min={0} className={inputCls} value={profile.capacity} onChange={(e) => updateProfileField('capacity', e.target.value)} />
            </Field>
            <Field label="Om baren">
              <textarea rows={3} className={inputCls} value={profile.description} onChange={(e) => updateProfileField('description', e.target.value)} />
            </Field>
            <Field label="Tilbud & happy hour">
              <textarea rows={3} placeholder="F.eks. 2-for-1 på øl før kampstart, egne kampmenyer, happy hour-tider osv." className={inputCls} value={profile.specialOffers} onChange={(e) => updateProfileField('specialOffers', e.target.value)} />
            </Field>
          </div>
          <button type="button" disabled={busy} onClick={onSave}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 dark:bg-emerald-500 dark:shadow-emerald-500/15 dark:hover:bg-emerald-600 sm:w-auto">
            Lagre barprofil
          </button>
        </>
      )}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-all duration-150 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-xs text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
      <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:checked:bg-emerald-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

