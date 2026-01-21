import type { Fixture, LeagueKey } from '@/lib/types/fixtures';

type TheSportsDbEventLike = {
  dateEvent?: string | null;
  dateEventLocal?: string | null;
  date?: string | null;
  strTime?: string | null;
  strTimeLocal?: string | null;
  time?: string | null;
  strTimestamp?: string | null;
  strHomeTeam?: string | null;
  homeTeam?: string | null;
  strAwayTeam?: string | null;
  awayTeam?: string | null;
  intRound?: number | string | null;
  strRound?: string | null;
  strVenue?: string | null;
  strStadium?: string | null;
  idEvent?: string | number | null;
  id?: string | number | null;
};

function toKickoffUtcFromTheSportsDb(event: TheSportsDbEventLike): string {
  const date =
    event?.dateEvent ||
    event?.dateEventLocal ||
    event?.date ||
    undefined;

  const time =
    event?.strTime ||
    event?.strTimeLocal ||
    event?.time ||
    undefined;

  const timestamp = event?.strTimestamp;

  if (timestamp) {
    const tsDate = new Date(timestamp);
    if (!Number.isNaN(tsDate.getTime())) {
      return tsDate.toISOString();
    }
  }

	if (date && time) {
	  // TODO: strTime er ofte lokal tid uten eksplisitt tidssone i TheSportsDB.
	  // Foreløpig antar vi at tidspunktet er i UTC og legger til 'Z' hvis ingen
	  // tidssone er spesifisert. Dette bør forbedres når vi vet mer om faktisk
	  // tidssone per liga.
	  const isoCandidate = `${date}T${time}${
	    typeof time === 'string' && time.includes('Z') ? '' : 'Z'
	  }`;
    const dt = new Date(isoCandidate);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

  if (date) {
    const dt = new Date(`${date}T00:00:00Z`);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

	// Fallback til "nå" hvis vi ikke kan tolke dato/tid fra eventet
  return new Date().toISOString();
}

export function mapTheSportsDbEventToFixture(
  event: TheSportsDbEventLike,
  league: LeagueKey,
): Fixture {
  const homeTeam =
    event?.strHomeTeam ||
    event?.homeTeam ||
    'Ukjent hjemmelag';

  const awayTeam =
    event?.strAwayTeam ||
    event?.awayTeam ||
    'Ukjent bortelag';

  const round =
    (typeof event?.intRound === 'number'
      ? String(event.intRound)
      : event?.strRound) || undefined;

  const venue =
    event?.strVenue ||
    event?.strStadium ||
    undefined;

  const idSource =
    event?.idEvent ??
    event?.id ??
    `${league}-${homeTeam}-${awayTeam}-${event?.dateEvent ?? ''}-${event?.strTime ?? ''}`;

  return {
    id: String(idSource),
    league,
    homeTeam,
    awayTeam,
    kickoffUtc: toKickoffUtcFromTheSportsDb(event),
    round,
    venue,
  };
}

