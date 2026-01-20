export type CityId = 'oslo' | 'bergen' | 'forde' | 'trondheim';

export interface CityConfig {
  id: CityId;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
}

// Forhåndsdefinerte bykoordinater som brukes til å sentrere kartet
export const CITIES: CityConfig[] = [
  {
    id: 'oslo',
    name: 'Oslo',
    center: {
      lat: 59.9139,
      lng: 10.7522,
    },
  },
  {
    id: 'bergen',
    name: 'Bergen',
    center: {
      lat: 60.39299,
      lng: 5.32415,
    },
  },
  {
    id: 'forde',
    name: 'Førde',
    center: {
      lat: 61.4507,
      lng: 5.8583,
    },
  },
  {
    id: 'trondheim',
    name: 'Trondheim',
    center: {
      lat: 63.4305,
      lng: 10.3951,
    },
  },
];

export const CITY_COORDINATES: Record<CityId, { lat: number; lng: number }> =
  CITIES.reduce((acc, city) => {
    acc[city.id] = city.center;
    return acc;
  }, {} as Record<CityId, { lat: number; lng: number }>);

