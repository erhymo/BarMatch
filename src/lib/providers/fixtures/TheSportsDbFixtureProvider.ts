import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import type { FixtureProvider } from './FixtureProvider';
import { mapTheSportsDbEventToFixture } from './theSportsDbMapper';

// TheSportsDB v1 base-URL. API-nøkkel legges direkte inn i pathen.
const API_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/';

export class TheSportsDbFixtureProvider implements FixtureProvider {
  private readonly apiKey: string;

  constructor() {
    // Les API-nokkel fra server-side environment (ikke eksponert til klienten)
    this.apiKey = process.env.THESPORTSDB_API_KEY ?? '';
  }

  // TODO: Når denne provideren skal tas i bruk, fjern throw-linjen og bruk skjelett-koden
  //       nedenfor (som i dag er kommentert ut for å unngå faktiske nettverkskall).
  async getUpcomingFixtures(
    league: LeagueKey,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
	  // Mark as used (provider is stubbed out for now)
	  void league;
	  void fromUtcIso;
	  void toUtcIso;
	  void API_BASE_URL;
	  void mapTheSportsDbEventToFixture;
    throw new Error('TheSportsDB provider not enabled yet');

    /*
    const leagueId = this.mapLeagueKeyToTheSportsDbLeagueId(league);

    // a) Neste kamper i ligaen: eventsnextleague.php?id={leagueId}
    const nextLeagueUrl = `${API_BASE_URL}${this.apiKey}/eventsnextleague.php?id=${leagueId}`;
    const nextLeagueResponse = await fetch(nextLeagueUrl);
    if (!nextLeagueResponse.ok) {
      throw new Error(
        `TheSportsDB: Klarte ikke å hente neste kamper for leagueId=${leagueId}`,
      );
    }

    const nextLeagueJson = (await nextLeagueResponse.json()) as {
      // TheSportsDB svarer typisk med et "events"-felt som er en array.
      events?: unknown[] | null;
    };
    const nextLeagueEvents = nextLeagueJson.events ?? [];

    // b) Sesong-endepunkt: eventsseason.php?id={leagueId}&s={season}
    //    Kan brukes senere for å supplere med flere kamper hvis nødvendig.
    const seasonYear = new Date(fromUtcIso).getUTCFullYear();
    const season = String(seasonYear); // f.eks. "2024" eller "2024-2025".

    const seasonUrl =
      `${API_BASE_URL}${this.apiKey}/eventsseason.php?id=${leagueId}&s=${encodeURIComponent(
        season,
      )}`;
    const seasonResponse = await fetch(seasonUrl);
    if (!seasonResponse.ok) {
      throw new Error(
        `TheSportsDB: Klarte ikke å hente sesong-kamper for leagueId=${leagueId}, season=${season}`,
      );
    }

    const seasonJson = (await seasonResponse.json()) as {
      events?: unknown[] | null;
    };
    const seasonEvents = seasonJson.events ?? [];

    const allEvents = [...nextLeagueEvents, ...seasonEvents];

    // Map TheSportsDB-events til vårt interne Fixture-format
    return allEvents.map((event) =>
      mapTheSportsDbEventToFixture(event as any, league),
    );
    */
  }

  async getFixturesByTeam(
    league: LeagueKey,
    teamName: string,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
	  void league;
	  void teamName;
	  void fromUtcIso;
	  void toUtcIso;
    // TODO: Implementer team-baserte oppslag mot TheSportsDB naar provideren tas i bruk.
    throw new Error('TheSportsDB provider not enabled yet');
  }

  /**
   * Map vårt interne LeagueKey til TheSportsDB league-id.
   *
   * Merk: Verdiene under er basert på offentlig TheSportsDB-info og bør verifiseres
   * før provideren aktiveres i produksjon.
   */
  private mapLeagueKeyToTheSportsDbLeagueId(league: LeagueKey): string {
    switch (league) {
      case 'EPL':
        return '4328'; // English Premier League
      case 'NOR_ELITESERIEN':
        return '4358'; // Eliteserien (norsk liga)
      case 'SERIE_A':
        return '4332'; // Serie A (Italia)
	      case 'UCL':
	        throw new Error('TheSportsDB provider does not support UCL yet');
    }
  }
}

