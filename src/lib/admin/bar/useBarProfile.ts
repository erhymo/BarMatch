'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useToast } from '@/contexts/ToastContext';
import type { BarDoc, BarProfileFormState } from './types';

interface UseBarProfileArgs {
  user: User | null;
  barId: string | undefined;
  profile: BarProfileFormState | null;
  setProfile: React.Dispatch<React.SetStateAction<BarProfileFormState | null>>;
  location: { lat: number; lng: number } | null;
  setLocation: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | null>>;
  bar: BarDoc | null;
  setBar: React.Dispatch<React.SetStateAction<BarDoc | null>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useBarProfile({
  user, barId, profile, setProfile, location, setLocation, bar, setBar, setBusy,
}: UseBarProfileArgs) {
  const { showToast } = useToast();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

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
    if (formatted) updateProfileField('address', formatted);
    const loc = place.geometry?.location;
    if (loc) {
      const lat = loc.lat();
      const lng = loc.lng();
      if (Number.isFinite(lat) && Number.isFinite(lng)) setLocation({ lat, lng });
    }
  };

  const handleMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    if (typeof lat === 'number' && typeof lng === 'number') setLocation({ lat, lng });
  };

  const saveProfile = async () => {
    if (!user || !barId || !profile) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      let screensNumber: number | undefined;
      switch (profile.screens) {
        case '1-2': screensNumber = 2; break;
        case '3-5': screensNumber = 4; break;
        case '6+': screensNumber = 6; break;
        default: screensNumber = undefined;
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
      if (typeof screensNumber === 'number') facilities.screens = screensNumber;
      const capacityNum = Number.parseInt(profile.capacity.trim(), 10);
      if (Number.isFinite(capacityNum) && capacityNum > 0) facilities.capacity = capacityNum;
      facilities.hasFood = Boolean(profile.servesWarmFood || profile.servesSnacks);

      const name = profile.name.trim();
      const address = profile.address.trim();
      const phone = profile.phone.trim();
      const body: Record<string, unknown> = {
        description: profile.description.trim(),
        specialOffers: profile.specialOffers.trim(),
        facilities,
      };
      if (name) body.name = name;
      if (address) body.address = address;
      body.phone = phone;
      if (location) body.location = location;

      const res = await fetch(`/api/admin/bars/${barId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        throw new Error(msg || `Kunne ikke lagre barprofil (${res.status})`);
      }
      const savedAddress = typeof data?.address === 'string' ? data.address : address;
      const savedCity = typeof data?.city === 'string' ? data.city : undefined;
      const savedCountry = typeof data?.country === 'string' ? data.country : undefined;
      const savedLocationRaw = data?.location && typeof data.location === 'object' && !Array.isArray(data.location)
        ? data.location as { lat?: unknown; lng?: unknown }
        : null;
      const savedLocation = typeof savedLocationRaw?.lat === 'number' && typeof savedLocationRaw?.lng === 'number'
        ? { lat: savedLocationRaw.lat, lng: savedLocationRaw.lng }
        : location;
      setProfile((prev) => (prev ? { ...prev, address: savedAddress } : prev));
      if (savedLocation) setLocation(savedLocation);
      setBar((prev) =>
        prev
          ? {
              ...prev,
              name: name || prev.name,
              address: savedAddress || prev.address,
              city: savedCity ?? prev.city,
              country: savedCountry ?? prev.country,
              phone,
              location: savedLocation ?? prev.location,
              description: body.description as string,
              specialOffers: body.specialOffers as string,
              facilities: { ...(prev.facilities ?? {}), ...(facilities as Record<string, unknown>) },
            }
          : prev,
      );
      showToast({ title: 'Lagret', description: 'Barprofilen er oppdatert.', variant: 'success' });
    } catch (e) {
      showToast({ title: 'Feil', description: e instanceof Error ? e.message : 'Ukjent feil', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Preview computed values
  const previewName = (profile?.name?.trim()) || (bar?.name?.trim()) || 'Navn ikke satt ennå';
  const previewAddress = (profile?.address?.trim()) || (bar?.address?.trim()) || 'Adresse ikke satt ennå';
  const previewPhone = (profile?.phone?.trim()) || (bar?.phone?.trim()) || '';
  const previewScreensLabel = (() => {
    if (!profile) return 'Ikke oppgitt';
    switch (profile.screens) {
      case '1-2': return '1–2 skjermer';
      case '3-5': return '3–5 skjermer';
      case '6+': return '6+ skjermer';
      default: return 'Ikke oppgitt';
    }
  })();
  const previewFoodDetails: string[] = [];
  if (profile?.servesWarmFood) previewFoodDetails.push('Varm mat');
  if (profile?.servesSnacks) previewFoodDetails.push('Snacks / småretter');
  if (profile?.hasVegetarianOptions) previewFoodDetails.push('Vegetar/vegansk');
  const previewFoodLabel = previewFoodDetails.length > 0 ? previewFoodDetails.join(' • ') : 'Ikke oppgitt';



  const previewFacilityBadges: string[] = [];
  if (profile?.hasOutdoorSeating) previewFacilityBadges.push('🌤️ Uteservering');
  if (profile?.hasWifi) previewFacilityBadges.push('📶 Gratis WiFi');
  if (profile?.familyFriendly) previewFacilityBadges.push('👨‍👩‍👧 Familievennlig før kl. 21');
  if (profile?.canReserveTable) previewFacilityBadges.push('📅 Reservasjon til kamp');
  if (profile?.hasProjector) previewFacilityBadges.push('📽️ Prosjektor');

  const previewCapacityLabel =
    profile && profile.capacity.trim().length > 0
      ? `Ca. ${profile.capacity.trim()} personer`
      : 'Ikke oppgitt';

  return {
    autocomplete, setAutocomplete,
    updateProfileField,
    handleAutocompletePlaceChanged,
    handleMarkerDragEnd,
    saveProfile,
    previewName, previewAddress, previewPhone,
    previewScreensLabel, previewFoodLabel, previewFacilityBadges, previewCapacityLabel,
  };
}