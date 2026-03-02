import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy / Personvernerklæring – Where2Watch",
  description: "Privacy Policy for Where2Watch / Personvernerklæring for Where2Watch",
};

export default function PersonvernPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-sm sm:prose-base">
          {/* ───── NORSK ───── */}
          <h1>Personvernerklæring</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sist oppdatert: 2. mars 2026
          </p>

          <h2>1. Om tjenesten</h2>
          <p>
            Where2Watch («vi», «oss», «vår») er en tjeneste som hjelper brukere
            med å finne barer og utesteder som viser sportsbegivenheter. Tjenesten
            er tilgjengelig som nettside på{" "}
            <a href="https://where2watch.no">where2watch.no</a> og som iOS-app.
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
            <li>
              <strong>Push-varselpreferanser:</strong> Dersom du aktiverer
              push-varsler i iOS-appen, lagrer vi ditt enhetstoken (device token),
              valgte lag og valgte barer på våre servere (Firebase/Firestore) for
              å kunne sende deg relevante kampvarsler.
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
            <li>Sende push-varsler om kamper som vises på barer du følger (kun iOS-appen)</li>
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
              <strong>Firebase/Google Cloud:</strong> For lagring av
              push-varselabonnementer og bardata.
            </li>
            <li>
              <strong>Apple Push Notification service (APNs):</strong> For å
              levere push-varsler til iOS-enheter.
            </li>
            <li>
              <strong>Vercel:</strong> Hosting og anonymisert analyse.
            </li>
          </ul>
          <p>Vi selger aldri personopplysningene dine til tredjeparter.</p>

          <h2>6. Lagring og sikkerhet</h2>
          <p>
            Personlige innstillinger (favorittlag, søkehistorikk) lagres kun
            lokalt i nettleseren din og slettes når du tømmer nettleserdata.
            Push-varselabonnementer lagres på våre servere og kan deaktiveres
            når som helst via innstillingene i appen.
          </p>

          <h2>7. Dine rettigheter</h2>
          <p>
            I henhold til personopplysningsloven og GDPR har du rett til å:
          </p>
          <ul>
            <li>Be om innsyn i opplysninger vi har om deg</li>
            <li>Be om retting eller sletting av opplysninger</li>
            <li>Trekke tilbake samtykke (f.eks. posisjonstillatelse eller push-varsler)</li>
            <li>Klage til Datatilsynet</li>
          </ul>
          <p>
            Du kan selv slette alle lokale data ved å tømme nettleserens
            lagring for where2watch.no. For å slette push-varseldata,
            deaktiver push-varsler i appen eller kontakt oss.
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

          <hr className="my-12 border-zinc-300 dark:border-zinc-700" />

          {/* ───── ENGLISH ───── */}
          <h1>Privacy Policy</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Last updated: March 2, 2026
          </p>

          <h2>1. About the service</h2>
          <p>
            Where2Watch (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a service that helps users
            find bars and venues showing sports events. The service is available
            as a website at{" "}
            <a href="https://where2watch.no">where2watch.no</a> and as an iOS app.
          </p>

          <h2>2. Data controller</h2>
          <p>
            Øyvind Myhre is the data controller for personal data collected
            through Where2Watch. Contact us at{" "}
            <a href="mailto:support@where2watch.no">support@where2watch.no</a>.
          </p>

          <h2>3. What data we collect</h2>
          <h3>3.1 Data you provide</h3>
          <ul>
            <li>
              <strong>Favorite teams and cities:</strong> Stored locally in your
              browser (localStorage). We do not store this on our servers.
            </li>
            <li>
              <strong>Search history:</strong> Your recent searches are stored
              locally in your browser. We do not store this on our servers.
            </li>
            <li>
              <strong>Push notification preferences:</strong> If you enable push
              notifications in the iOS app, we store your device token, selected
              teams, and selected bars on our servers (Firebase/Firestore) in
              order to send you relevant match notifications.
            </li>
          </ul>

          <h3>3.2 Data collected automatically</h3>
          <ul>
            <li>
              <strong>Location data:</strong> If you grant permission, we use
              your GPS location to show nearby bars. Your location is not sent
              to our servers and is not stored.
            </li>
            <li>
              <strong>Usage data:</strong> We use Vercel Analytics to collect
              anonymized page view statistics. No personally identifiable
              information is collected.
            </li>
          </ul>

          <h2>4. How we use the data</h2>
          <p>We use the data to:</p>
          <ul>
            <li>Show bars near you on the map</li>
            <li>Remember your favorite teams and cities locally</li>
            <li>Send push notifications about matches shown at bars you follow (iOS app only)</li>
            <li>Improve the service based on anonymized usage statistics</li>
          </ul>

          <h2>5. Third-party sharing</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li>
              <strong>Google Maps:</strong> To display maps and bars.
              Google&nbsp;Maps has its own{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>API-Football:</strong> To fetch match data. No personal
              data is shared with this service.
            </li>
            <li>
              <strong>Firebase/Google Cloud:</strong> For storing push
              notification subscriptions and bar data.
            </li>
            <li>
              <strong>Apple Push Notification service (APNs):</strong> To
              deliver push notifications to iOS devices.
            </li>
            <li>
              <strong>Vercel:</strong> Hosting and anonymized analytics.
            </li>
          </ul>
          <p>We never sell your personal data to third parties.</p>

          <h2>6. Storage and security</h2>
          <p>
            Personal preferences (favorite teams, search history) are stored
            only in your browser and are deleted when you clear browser data.
            Push notification subscriptions are stored on our servers and can
            be deactivated at any time via the app settings.
          </p>

          <h2>7. Your rights</h2>
          <p>
            Under the Norwegian Personal Data Act and the GDPR, you have the
            right to:
          </p>
          <ul>
            <li>Request access to data we hold about you</li>
            <li>Request correction or deletion of data</li>
            <li>Withdraw consent (e.g., location permission or push notifications)</li>
            <li>File a complaint with the Norwegian Data Protection Authority (Datatilsynet)</li>
          </ul>
          <p>
            You can delete all local data by clearing your browser storage for
            where2watch.no. To delete push notification data, disable push
            notifications in the app or contact us.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Where2Watch only uses technically necessary cookies to ensure the
            service works. We do not use tracking cookies or marketing cookies.
          </p>

          <h2>9. Changes</h2>
          <p>
            We may update this privacy policy. Significant changes will be
            communicated through the service. The current version is always
            available on this page.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about privacy? Contact us at{" "}
            <a href="mailto:support@where2watch.no">support@where2watch.no</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

