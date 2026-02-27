export type BarDoc = {
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
    customerId?: string;
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

export type BarMessage = {
  id: string;
  barId: string;
  name: string | null;
  email: string;
  phone: string | null;
  message: string;
  category: string | null;
  readByBar: boolean;
  createdAt?: string | null;
};

export type BarProfileFormState = {
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

export function buildProfileFromBar(bar: BarDoc): BarProfileFormState {
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

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

export function dateKeyFromUtcIso(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Ukjent dato';
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

