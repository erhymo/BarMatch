import { Match } from '../models';

export const dummyMatches: Match[] = [
  // Premier League - Weekend 1
  {
    id: '1',
    homeTeam: { id: 'tot', name: 'Tottenham' },
    awayTeam: { id: 'che', name: 'Chelsea' },
    date: '2026-01-25',
    time: '17:30',
    competition: 'Premier League',
  },
  {
    id: '2',
    homeTeam: { id: 'liv', name: 'Liverpool' },
    awayTeam: { id: 'mci', name: 'Manchester City' },
    date: '2026-01-25',
    time: '20:00',
    competition: 'Premier League',
  },
  {
    id: '3',
    homeTeam: { id: 'ars', name: 'Arsenal' },
    awayTeam: { id: 'tot', name: 'Tottenham' },
    date: '2026-01-26',
    time: '14:00',
    competition: 'Premier League',
  },
  {
    id: '4',
    homeTeam: { id: 'mun', name: 'Manchester United' },
    awayTeam: { id: 'liv', name: 'Liverpool' },
    date: '2026-01-26',
    time: '16:30',
    competition: 'Premier League',
  },
  {
    id: '5',
    homeTeam: { id: 'che', name: 'Chelsea' },
    awayTeam: { id: 'ars', name: 'Arsenal' },
    date: '2026-01-27',
    time: '19:00',
    competition: 'Premier League',
  },

  // La Liga
  {
    id: '6',
    homeTeam: { id: 'bar', name: 'Barcelona' },
    awayTeam: { id: 'rma', name: 'Real Madrid' },
    date: '2026-01-25',
    time: '21:00',
    competition: 'La Liga',
  },
  {
    id: '7',
    homeTeam: { id: 'atm', name: 'Atletico Madrid' },
    awayTeam: { id: 'bar', name: 'Barcelona' },
    date: '2026-01-26',
    time: '18:00',
    competition: 'La Liga',
  },
  {
    id: '8',
    homeTeam: { id: 'sev', name: 'Sevilla' },
    awayTeam: { id: 'rma', name: 'Real Madrid' },
    date: '2026-01-27',
    time: '21:00',
    competition: 'La Liga',
  },

  // Bundesliga
  {
    id: '9',
    homeTeam: { id: 'bay', name: 'Bayern Munich' },
    awayTeam: { id: 'bvb', name: 'Borussia Dortmund' },
    date: '2026-01-25',
    time: '18:30',
    competition: 'Bundesliga',
  },
  {
    id: '10',
    homeTeam: { id: 'rb', name: 'RB Leipzig' },
    awayTeam: { id: 'bay', name: 'Bayern Munich' },
    date: '2026-01-26',
    time: '15:30',
    competition: 'Bundesliga',
  },

  // Champions League
  {
    id: '11',
    homeTeam: { id: 'mci', name: 'Manchester City' },
    awayTeam: { id: 'rma', name: 'Real Madrid' },
    date: '2026-01-28',
    time: '21:00',
    competition: 'Champions League',
  },
  {
    id: '12',
    homeTeam: { id: 'bay', name: 'Bayern Munich' },
    awayTeam: { id: 'liv', name: 'Liverpool' },
    date: '2026-01-28',
    time: '21:00',
    competition: 'Champions League',
  },
  {
    id: '13',
    homeTeam: { id: 'bar', name: 'Barcelona' },
    awayTeam: { id: 'che', name: 'Chelsea' },
    date: '2026-01-29',
    time: '21:00',
    competition: 'Champions League',
  },

  // Eliteserien (Norwegian League)
  {
    id: '14',
    homeTeam: { id: 'rbk', name: 'Rosenborg' },
    awayTeam: { id: 'vif', name: 'Vålerenga' },
    date: '2026-01-25',
    time: '18:00',
    competition: 'Eliteserien',
  },
  {
    id: '15',
    homeTeam: { id: 'mol', name: 'Molde' },
    awayTeam: { id: 'bod', name: 'Bodø/Glimt' },
    date: '2026-01-26',
    time: '19:00',
    competition: 'Eliteserien',
  },
  {
    id: '16',
    homeTeam: { id: 'bra', name: 'Brann' },
    awayTeam: { id: 'rbk', name: 'Rosenborg' },
    date: '2026-01-27',
    time: '18:00',
    competition: 'Eliteserien',
  },
  {
    id: '17',
    homeTeam: { id: 'vif', name: 'Vålerenga' },
    awayTeam: { id: 'mol', name: 'Molde' },
    date: '2026-01-28',
    time: '20:00',
    competition: 'Eliteserien',
  },

  // Serie A
  {
    id: '18',
    homeTeam: { id: 'juv', name: 'Juventus' },
    awayTeam: { id: 'int', name: 'Inter Milan' },
    date: '2026-01-25',
    time: '20:45',
    competition: 'Serie A',
  },
  {
    id: '19',
    homeTeam: { id: 'acm', name: 'AC Milan' },
    awayTeam: { id: 'nap', name: 'Napoli' },
    date: '2026-01-26',
    time: '20:45',
    competition: 'Serie A',
  },
  {
    id: '20',
    homeTeam: { id: 'rom', name: 'Roma' },
    awayTeam: { id: 'juv', name: 'Juventus' },
    date: '2026-01-27',
    time: '18:00',
    competition: 'Serie A',
  },
];

