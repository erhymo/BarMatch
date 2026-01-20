"use client";

import { useEffect, useMemo, useState } from "react";
import { CITIES, type CityId } from "@/lib/data/cities";

interface CityFilterPanelProps {
  favoriteCity: CityId | null;
  onFavoriteCityChange: (city: CityId | null) => void;
}

export default function CityFilterPanel({
  favoriteCity,
  onFavoriteCityChange,
}: CityFilterPanelProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Hent brukerens posisjon for å kunne sortere byene etter nærhet
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Ignorer feil – vi faller tilbake til standard rekkefølge
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const sortedCities = useMemo(() => {
    if (!userLocation) return CITIES;

    const distanceSq = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dLat = a.lat - b.lat;
      const dLng = a.lng - b.lng;
      return dLat * dLat + dLng * dLng;
    };

    return [...CITIES].sort(
      (a, b) => distanceSq(userLocation, a.center) - distanceSq(userLocation, b.center)
    );
  }, [userLocation]);

  return (
    <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-700/50 max-w-md w-full text-sm">
      <div className="px-4 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-2xl">📍</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Finn din by</h2>
            <p className="text-xs text-zinc-400">Velg startposisjon for kartet</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-[11px] text-zinc-400">
          Velg en by for å sette hvor kartet skal starte. Vi foreslår nærmeste by hvis du deler
          posisjon.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onFavoriteCityChange(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
              !favoriteCity
                ? "bg-zinc-100/10 text-zinc-100 border-zinc-400/60"
                : "bg-transparent text-zinc-400 hover:bg-zinc-800/60 border-zinc-700/80"
            }`}
          >
            Ingen
          </button>

          {sortedCities.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onFavoriteCityChange(city.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
                favoriteCity === city.id
                  ? "bg-green-500/20 text-green-300 border-green-400/70"
                  : "bg-transparent text-zinc-300 hover:bg-zinc-800/60 border-zinc-700/80"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

