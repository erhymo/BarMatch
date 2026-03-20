import { dummyMatches } from '@/lib/data/matches';
import type { Match } from '@/lib/models';
import type { Fixture, LeagueKey } from '@/lib/types/fixtures';
import type { FixtureProvider } from './FixtureProvider';

function competitionToLeagueKey(competition: string): LeagueKey | null {
  switch (competition) {
    case 'Premier League':
      return 'EPL';
    case 'Championship':
      return 'ENG_CHAMPIONSHIP';
    case 'FA Cup':
      return 'FA_CUP';
    case 'League Cup':
    case 'EFL Cup':
    case 'EFL Trophy':
      return 'EFL_CUP';
    case 'Copa del Rey':
      return 'COPA_DEL_REY';
    case 'Bundesliga':
      return 'BUNDESLIGA';
    case 'Ligue 1':
      return 'LIGUE_1';
    case 'Eliteserien':
      return 'NOR_ELITESERIEN';
    case 'OBOS-ligaen':
    case '1. Division':
      return 'NOR_1_DIVISION';
    case 'NM Cupen':
      return 'NOR_NM_CUPEN';
    case 'FIFA Club World Cup':
      return 'FIFA_CWC';
    case 'FIFA Club World Cup - Play-In':
      return 'FIFA_CWC_PLAYIN';
    case 'UEFA Nations League':
      return 'UEFA_NL';
    case 'World Cup - Qualification Intercontinental Play-offs':
    case 'Play-offs':
      return 'WCQ_INTERCONTINENTAL_PLAYOFFS';
    case 'Friendlies':
      return 'FRIENDLIES';
    case 'Serie A':
      return 'SERIE_A';
	    case 'Champions League':
	    case 'UEFA Champions League':
	      return 'UCL';
		    case 'Europa League':
		    case 'UEFA Europa League':
		      return 'UEL';
    default:
      return null;
  }
}

function toKickoffUtc(date: string, time: string): string {
  const isoCandidate = `${date}T${time}:00Z`;
  const dateObj = new Date(isoCandidate);

  if (Number.isNaN(dateObj.getTime())) {
    const fallback = new Date(`${date}T00:00:00Z`);
    return fallback.toISOString();
  }

  return dateObj.toISOString();
}

function mapMatchToFixture(match: Match, league: LeagueKey): Fixture {
	  return {
	    id: match.id,
	    league,
	    homeTeam: match.homeTeam.name,
	    awayTeam: match.awayTeam.name,
	    kickoffUtc: toKickoffUtc(match.date, match.time),
	    homeTeamLogoUrl: match.homeTeam.logo,
	    awayTeamLogoUrl: match.awayTeam.logo,
	  };
}

export class MockFixtureProvider implements FixtureProvider {
  async getUpcomingFixtures(
    league: LeagueKey,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
    const from = new Date(fromUtcIso);
    const to = new Date(toUtcIso);

    const fixtures: Fixture[] = dummyMatches
      .map((match) => {
        const leagueKey = competitionToLeagueKey(match.competition);
        if (!leagueKey) return null;
        return { leagueKey, match };
      })
      .filter((entry): entry is { leagueKey: LeagueKey; match: Match } => !!entry)
      .filter((entry) => entry.leagueKey === league)
      .map((entry) => mapMatchToFixture(entry.match, entry.leagueKey))
      .filter((fixture) => {
        const kickoff = new Date(fixture.kickoffUtc);
        return kickoff >= from && kickoff <= to;
      })
      .sort((a, b) => {
        return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
      });

    return fixtures;
  }

  async getFixturesByTeam(
    league: LeagueKey,
    teamName: string,
    fromUtcIso: string,
    toUtcIso: string,
  ): Promise<Fixture[]> {
    const from = new Date(fromUtcIso);
    const to = new Date(toUtcIso);
    const normalized = teamName.trim().toLowerCase();

    const fixtures: Fixture[] = dummyMatches
      .map((match) => {
        const leagueKey = competitionToLeagueKey(match.competition);
        if (!leagueKey) return null;
        return { leagueKey, match };
      })
      .filter((entry): entry is { leagueKey: LeagueKey; match: Match } => !!entry)
      .filter((entry) => entry.leagueKey === league)
      .filter(({ match }) => {
        if (!normalized) return true;

        const homeName = match.homeTeam.name.toLowerCase();
        const awayName = match.awayTeam.name.toLowerCase();
        const homeId = match.homeTeam.id.toLowerCase();
        const awayId = match.awayTeam.id.toLowerCase();

        // Støtt både team-navn og interne ID-er (f.eks. "liv") i mocken
        return (
          homeName.includes(normalized) ||
          awayName.includes(normalized) ||
          homeId === normalized ||
          awayId === normalized
        );
      })
      .map((entry) => mapMatchToFixture(entry.match, entry.leagueKey))
      .filter((fixture) => {
        const kickoff = new Date(fixture.kickoffUtc);
        return kickoff >= from && kickoff <= to;
      })
      .sort((a, b) => {
        return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
      });

    return fixtures;
  }
}

