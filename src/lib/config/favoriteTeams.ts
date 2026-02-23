export type FavoriteTeamOption = {
  id: string;
  name: string;
};

export const FAVORITE_TEAM_OPTIONS: FavoriteTeamOption[] = [
  { id: "tot", name: "Tottenham" },
  { id: "che", name: "Chelsea" },
  { id: "liv", name: "Liverpool" },
  { id: "mci", name: "Manchester City" },
  { id: "ars", name: "Arsenal" },
  { id: "mun", name: "Manchester United" },
  { id: "bar", name: "Barcelona" },
  { id: "rma", name: "Real Madrid" },
  { id: "atm", name: "Atletico Madrid" },
  { id: "sev", name: "Sevilla" },
  { id: "bay", name: "Bayern Munich" },
  { id: "bvb", name: "Borussia Dortmund" },
  { id: "rb", name: "RB Leipzig" },
  { id: "rbk", name: "Rosenborg" },
  { id: "vif", name: "Vålerenga" },
  { id: "mol", name: "Molde" },
  { id: "bod", name: "Bodø/Glimt" },
  { id: "bra", name: "Brann" },
  { id: "juv", name: "Juventus" },
  { id: "int", name: "Inter Milan" },
  { id: "acm", name: "AC Milan" },
  { id: "nap", name: "Napoli" },
  { id: "rom", name: "Roma" },
];

export const FAVORITE_TEAM_ID_TO_NAME: Record<string, string> =
  FAVORITE_TEAM_OPTIONS.reduce((acc, team) => {
    acc[team.id] = team.name;
    return acc;
  }, {} as Record<string, string>);

