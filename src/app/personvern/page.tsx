import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personvernerklæring – Where2Watch",
  description: "Personvernerklæring for Where2Watch",
};

export default function PersonvernPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-sm sm:prose-base">
          <h1>Personvernerklæring</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sist oppdatert: 26. februar 2026
          </p>

          <h2>1. Om tjenesten</h2>
          <p>
            Where2Watch («vi», «oss», «vår») er en tjeneste som hjelper brukere
            med å finne barer og utesteder som viser sportsbegivenheter. Tjenesten
            er tilgjengelig som nettside på{" "}
            <a href="https://where2watch.no">where2watch.no</a> og som app.
          </p>

          <h2>2. Behandlingsansvarlig</h2>
          <p>
            Øyvind Myhre er behandlingsansvarlig for personopplysninger som samles
            inn gjennom Where2Watch. Kontakt oss på{" "}
            <a href="mailto:support@where2watch.no">support@where2watch.no</a>.
          </p>

          <h2>3. Hvilke opplysninger vi samler inn</h2>
          <h3>3.1 Opplysninger du gir oss</h3>
          <ul>
            <li>
              <strong>Favoritlag og -byer:</strong> Lagres lokalt i nettleseren din
              (localStorage). Vi lagrer ikke dette på våre servere.
            </li>
            <li>
              <strong>Søkehistorikk:</strong> Dine siste søk lagres lokalt i
              nettleseren. Vi lagrer ikke dette på våre servere.
            </li>
          </ul>

          <h3>3.2 Opplysninger vi samler inn automatisk</h3>
          <ul>
            <li>
              <strong>Posisjonsdata:</strong> Dersom du gir tillatelse, bruker vi
              GPS-posisjonen din for å vise barer i nærheten. Posisjonen din
              sendes ikke til våre servere og lagres ikke.
            </li>
            <li>
              <strong>Bruksdata:</strong> Vi bruker Vercel Analytics for å samle
              anonymisert statistikk om sidevisninger. Ingen personlig
              identifiserbar informasjon samles inn.
            </li>
          </ul>

          <h2>4. Hvordan vi bruker opplysningene</h2>
          <p>Vi bruker opplysningene til å:</p>
          <ul>
            <li>Vise barer i nærheten av deg på kartet</li>
            <li>Huske dine favorittlag og -byer lokalt</li>
            <li>Forbedre tjenesten basert på anonymisert bruksstatistikk</li>
          </ul>

          <h2>5. Deling med tredjeparter</h2>
          <p>Vi bruker følgende tredjepartstjenester:</p>
          <ul>
            <li>
              <strong>Google Maps:</strong> For å vise kart og barer.
              Google&nbsp;Maps har egen{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                personvernerklæring
              </a>
              .
            </li>
            <li>
              <strong>API-Football:</strong> For å hente kampdata. Ingen
              personopplysninger deles med denne tjenesten.
            </li>
            <li>
              <strong>Vercel:</strong> Hosting og anonymisert analyse.
            </li>
          </ul>
          <p>Vi selger aldri personopplysningene dine til tredjeparter.</p>

          <h2>6. Lagring og sikkerhet</h2>
          <p>
            Personlige innstillinger (favorittlag, søkehistorikk) lagres kun
            lokalt i nettleseren din og slettes når du tømmer nettleserdata. Vi
            lagrer ingen personopplysninger på våre servere for vanlige brukere.
          </p>

          <h2>7. Dine rettigheter</h2>
          <p>
            I henhold til personopplysningsloven og GDPR har du rett til å:
          </p>
          <ul>
            <li>Be om innsyn i opplysninger vi har om deg</li>
            <li>Be om retting eller sletting av opplysninger</li>
            <li>Trekke tilbake samtykke (f.eks. posisjonstillatelse)</li>
            <li>Klage til Datatilsynet</li>
          </ul>
          <p>
            Siden vi lagrer minimalt med data, kan du selv slette alle lokale
            data ved å tømme nettleserens lagring for where2watch.no.
          </p>

          <h2>8. Informasjonskapsler (cookies)</h2>
          <p>
            Where2Watch bruker kun teknisk nødvendige informasjonskapsler for å
            sikre at tjenesten fungerer. Vi bruker ikke sporingskapsler eller
            markedsføringskapsler.
          </p>

          <h2>9. Endringer</h2>
          <p>
            Vi kan oppdatere denne personvernerklæringen. Vesentlige endringer
            vil bli kommunisert via tjenesten. Gjeldende versjon er alltid
            tilgjengelig på denne siden.
          </p>

          <h2>10. Kontakt</h2>
          <p>
            Spørsmål om personvern? Kontakt oss på{" "}
            <a href="mailto:support@where2watch.no">support@where2watch.no</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

