# where2watch

where2watch er en Next.js-applikasjon som hjelper brukere med å finne sin neste favorittbar ved hjelp av Google Maps.

## Teknologier

- **Next.js 16** - React-rammeverk med App Router
- **TypeScript** - Type-sikkerhet
- **Tailwind CSS** - Styling
- **Google Maps API** - Kartfunksjonalitet
- **Firebase** (forberedt) - Autentisering og database

## Kom i gang

### 1. Installer avhengigheter

```bash
npm install
```

### 2. Sett opp Google Maps API

1. Gå til [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Opprett et nytt prosjekt eller velg et eksisterende
3. Aktiver Google Maps JavaScript API
4. Opprett en API-nøkkel
5. Kopier `.env.example` til `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
6. Legg til din Google Maps API-nøkkel i `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=din_api_nøkkel_her
   ```

### 3. Kjør utviklingsserveren

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren for å se resultatet.

## Prosjektstruktur

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Hjemmeside
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Globale stiler
├── components/            # React-komponenter
│   └── map/
│       └── GoogleMap.tsx  # Google Maps-komponent
└── lib/                   # Hjelpefunksjoner og konfigurasjoner
    └── firebase/
        └── config.ts      # Firebase-konfigurasjon (forberedt)
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
