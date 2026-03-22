# where2watch Library

Dette er kjernebiblioteket for where2watch-applikasjonen. Koden her er strukturert for å være **plattform-agnostisk** og kan gjenbrukes i både web (Next.js) og mobile apps (Capacitor).

## 📁 Struktur

```
src/lib/
├── models/          # TypeScript-typer og interfaces
├── services/        # Business logic (plattform-agnostisk)
├── hooks/           # React hooks (React-spesifikk)
└── data/            # Mock/dummy data
```

## 🎯 Designprinsipper

### 1. **Separation of Concerns**
- **Models**: Kun type-definisjoner, ingen logikk
- **Services**: Ren business logic, ingen React-avhengigheter
- **Hooks**: React-spesifikk state management som wrapper services
- **Components**: Kun UI, bruker hooks for all logikk

### 2. **Platform Agnostic**
Services er designet for å fungere på tvers av plattformer:
- ✅ Web (Next.js)
- ✅ Mobile (Capacitor)
- ✅ Desktop (Electron)
- ✅ Server (Node.js)

### 3. **Testability**
All business logic i services kan testes isolert uten React eller DOM.

## 📦 Moduler

### Models (`/models`)
TypeScript-typer og interfaces for hele applikasjonen.

**Filer:**
- `bar.model.ts` - Bar, BarFacilities, BarOpeningHours, Position
- `match.model.ts` - Match, MatchStatus, Where2WatchMatch
- `team.model.ts` - Team
- `favorites.model.ts` - Favorites, FAVORITES_STORAGE_KEYS
- `chat.model.ts` - ChatThread, ChatMessage, ChatParticipant, CHAT_STORAGE_KEYS

**Bruk:**
```typescript
import { Bar, Match, Team } from '@/lib/models';
```

### Services (`/services`)
Plattform-agnostisk business logic. Ingen React-avhengigheter.

**Filer:**
- `bar.service.ts` - Bar-relaterte operasjoner (filtrering, sortering, avstand)
- `match.service.ts` - Match-relaterte operasjoner (filtrering, formatering)
- `favorites.service.ts` - Favoritt-håndtering (lagring, toggle)
- `rating.service.ts` - Vurderinger/stjerner per bar (lagring, gjennomsnitt)
- `campaign.service.ts` - Kampanjer og tilbud per bar
- `chat.service.ts` - Chat/messaging-håndtering (tråder, meldinger, lagring)
- `barfixtureselection.service.ts` - Hvilke kamper hver bar viser (valg/kansellering)

**Bruk:**
```typescript
import { BarService, MatchService, FavoritesService } from '@/lib/services';

// Filtrer barer basert på lag
const filteredBars = BarService.filterBarsByTeam(bars, teamId);

// Hent kommende kamper
const upcoming = MatchService.getUpcomingMatches(matches);

// Toggle favoritt
const newFavorites = FavoritesService.toggleTeam(teamId, currentFavorites);
```

### Hooks (`/hooks`)
React hooks som wrapper services med state management.

**Filer:**
- `useFavorites.ts` - Favoritt-state med localStorage-persistering
- `useBarFilter.ts` - Bar-filtrering med memoization
- `useTeamSelection.ts` - Lag-valg og liga-ekstraksjon
- `useChat.ts` - Chat-state med localStorage-persistering
- `useRatings.ts` - Rating-state for barer med localStorage-persistering
- `useCampaigns.ts` - Kampanje-state for barer med localStorage-persistering

**Bruk:**
```typescript
import { useFavorites, useBarFilter, useTeamSelection } from '@/lib/hooks';

function MyComponent() {
  const { favoriteTeams, toggleFavoriteTeam } = useFavorites();
  const filteredBars = useBarFilter(bars, selectedTeam);
  const teams = useTeamSelection(matches, selectedLeague, favoriteTeams);
}
```

### Data (`/data`)
Mock/dummy data for utvikling og testing.

**Filer:**
- `bars.ts` - Dummy-barer i Oslo

## 🔄 Migrering til Capacitor

Når du skal lage en mobil app med Capacitor:

1. **Gjenbruk services direkte** - Ingen endringer nødvendig
2. **Erstatt hooks** - Lag nye hooks for React Native eller bruk services direkte
3. **Erstatt localStorage** - Bruk Capacitor Storage API i stedet

Eksempel:
```typescript
// Web (Next.js)
const favorites = FavoritesService.loadFavorites(localStorage);

// Mobile (Capacitor)
import { Storage } from '@capacitor/storage';
const favorites = FavoritesService.loadFavorites(Storage);
```

## 🧪 Testing

Services kan testes isolert:

```typescript
import { BarService } from '@/lib/services';

describe('BarService', () => {
  it('should filter bars by team', () => {
    const result = BarService.filterBarsByTeam(mockBars, 'team-1');
    expect(result).toHaveLength(2);
  });
});
```

## 📝 Retningslinjer

### Når du legger til ny funksjonalitet:

1. **Legg til types i `/models`** hvis du trenger nye datastrukturer
2. **Legg til logikk i `/services`** hvis det er plattform-agnostisk
3. **Legg til hook i `/hooks`** hvis du trenger React state management
4. **Bruk hooks i komponenter** - aldri importer services direkte i komponenter

### Eksempel på riktig struktur:

```typescript
// ❌ FEIL - Logikk i komponent
function MyComponent() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const filtered = data.filter(item => item.active);
    // ... mer logikk
  }, [data]);
}

// ✅ RIKTIG - Logikk i service, hook wrapper state
// service.ts
export class MyService {
  static filterActive(items) {
    return items.filter(item => item.active);
  }
}

// hook.ts
export function useMyData(items) {
  return useMemo(() => MyService.filterActive(items), [items]);
}

// component.tsx
function MyComponent() {
  const filteredData = useMyData(data);
}
```

## 🚀 Fremtidige forbedringer

- [ ] Legg til unit tests for alle services
- [ ] Legg til JSDoc-kommentarer for bedre IntelliSense
- [ ] Vurder å bruke Zod for runtime type validation
- [ ] Lag en service for API-kall når backend er klar
- [ ] Implementer caching-strategi i services

