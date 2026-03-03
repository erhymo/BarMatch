export type Locale = 'no' | 'en';

export const LOCALE_FLAGS: Record<Locale, string> = {
  no: '🇳🇴',
  en: '🇬🇧',
};

export const LOCALE_LABELS: Record<Locale, string> = {
  no: 'Norsk',
  en: 'English',
};

export type TranslationKeys = typeof translations.no;

export const translations = {
  no: {
    // Navigation
    nav_home: 'Hjem',
    nav_matches: 'Kamper',
    nav_notifications: 'Varslinger',
    nav_home_reset: 'Hjem/resett',

    // Home header
    home_filtering_match: 'Filtrerer på kamp',
    home_showing_bars_for: 'Viser barer som viser:',
    home_showing_bars_for_match: 'Viser barer som viser valgt kamp.',
    home_clear_match_filter: 'Fjern kampfilter',
    home_go_to_matches: 'Gå til «Kamper» for å søke etter lag og liga',
    home_location: 'Lokasjon',
    home_find_nearest_bar: 'Finn nærmeste bar',

    // Map overlays
    map_loading_bars: 'Laster barer…',
    map_error_title: 'Kunne ikke hente barer fra databasen.',
    map_error_subtitle: 'Viser demo-barer midlertidig.',
    map_no_bars_team: 'Ingen barer viser dette laget i nærheten akkurat nå.',
    map_no_bars_match: 'Ingen barer viser denne kampen akkurat nå.',
    map_try_other: 'Prøv et annet lag, en annen liga eller fjern filtrene for å se flere barer.',
    map_auth_error: 'Google Maps kunne ikke autentiseres. Sjekk at API-nøkkelen er gyldig og at Maps JavaScript API er aktivert.',
    map_load_error: 'Kunne ikke laste Google Maps-skriptet (nettverk eller blokkert ressurs).',
    map_geo_unsupported: 'Geolocation er ikke støttet av din nettleser',
    map_geo_denied: '📍 Del posisjonen din for å se barer i nærheten! Gå til Innstillinger → Personvern → Stedstjenester for å slå på posisjon.',
    map_geo_unavailable: 'Posisjonsinformasjon er ikke tilgjengelig',
    map_geo_timeout: 'Forespørsel om posisjon tok for lang tid',
    map_geo_unknown: 'En ukjent feil oppstod',
    map_mailto_greeting: 'Hei Where2Watch,',
    map_mailto_body: 'Vi eier eller drifter {name} og ønsker å se på hvordan vi kan bli synlige i appen deres.',
    map_mailto_interest: 'Send oss gjerne litt informasjon om hvordan vi kommer i gang, og hva dere trenger fra oss.',
    map_mailto_closing: 'Vennlig hilsen',
    map_could_not_load: 'Kartet kunne ikke lastes',
    map_tip_reload: 'Tips: Sjekk API-nøkkel-restriksjoner (HTTP referrers) og prøv å reloade siden.',

    // Nearest bar list
    nearest_bars_title: 'Barer nær deg',
    nearest_sorted: 'Sortert på avstand.',
    nearest_enable_location: 'Aktiver posisjon for å sortere på avstand.',
    nearest_no_bars: 'Ingen barer å vise med gjeldende filter.',
    close: 'Lukk',

    // Bar details panel
    bar_address_unavailable: 'Adresse ikke tilgjengelig',
    bar_distance_away: 'unna',
    bar_add_favorite: 'Legg til i favoritter',
    bar_remove_favorite: 'Fjern fra favoritter',
    bar_directions: 'Veibeskrivelse',
    bar_send_message: 'Send melding',
    bar_call: 'Ring',
    bar_no_phone: 'Ingen telefon',

    // Rating
    bar_rating: 'Vurdering',
    bar_no_ratings: 'Ingen vurderinger enda',
    bar_remove_rating: 'Fjern min vurdering',
    bar_rating_removed: 'Vurdering fjernet',
    bar_rating_removed_desc: 'Din vurdering er fjernet.',
    bar_thanks: 'Takk!',
    bar_rating_given: 'Du ga {name} {rating} stjerner.',
    bar_your_rating: 'Din vurdering: {rating}★',
    bar_give_rating: 'Gi din vurdering',

    // Bar matches
    bar_matches_at_bar: 'Kamper hos denne baren',
    bar_today_count: 'I dag',
    bar_upcoming_count: 'Kommende',
    bar_loading_matches: 'Laster kamper…',
    bar_no_matches_setup: 'Denne baren har ikke satt opp kamper enda.',
    bar_no_matches_now: 'Ingen kamper akkurat nå (eller de er passert 90-minutters cutoff).',
    bar_see_matches_below: 'Se kamper lenger ned på siden.',
    bar_see_all: 'Se alle',
    bar_matches_this_week: 'Baren viser {count} kamp denne uken.',
    bar_matches_this_week_plural: 'Baren viser {count} kamper denne uken.',
    bar_next_match: 'Neste kamp',
    bar_next_matches: 'Neste kamper',
    bar_starting_soon: 'Starter snart hos denne baren',
    bar_today: 'I dag',
    bar_no_matches_today: 'Ingen kamper i dag.',
    bar_upcoming: 'Kommende',
    bar_no_upcoming: 'Ingen kommende kamper.',
    bar_retry: 'Prøv igjen',

    // About bar
    bar_about: 'Om baren',
    bar_no_description: 'Ingen beskrivelse lagt til enda.',
    bar_candidate_notice: 'Denne baren er foreløpig ikke aktiv kunde hos Where2Watch. Eier du baren?',
    bar_candidate_cta: 'Trykk her for å sende oss en e-post om onboarding',

    // Facilities
    bar_facilities: 'Fasiliteter',
    bar_hide: 'Skjul',
    bar_show: 'Vis',
    bar_screens: 'Skjermer',
    bar_screens_1_2: '1-2 skjermer',
    bar_screens_3_5: '3-5 skjermer',
    bar_screens_6_plus: '6+ skjermer',
    bar_not_specified: 'Ikke oppgitt',
    bar_food: 'Mat',
    bar_warm_food: 'Varm mat',
    bar_snacks: 'Snacks / småretter',
    bar_vegetarian: 'Vegetar/vegansk',
    bar_serves_food: 'Serverer mat',
    bar_no_food: 'Serverer ikke mat',
    bar_outdoor: 'Uteservering',
    bar_wifi: 'WiFi',
    bar_yes: 'Ja',
    bar_no: 'Nei',
    bar_capacity: 'Kapasitet',
    bar_outdoor_badge: '🌤️ Uteservering',
    bar_wifi_badge: '📶 Gratis WiFi',
    bar_family_badge: '👨‍👩‍👧 Familievennlig før kl. 21',
    bar_reservation_badge: '📅 Reservasjon til kamp',
    bar_projector_badge: '📽️ Prosjektor',

    // Opening hours
    bar_opening_hours: 'Åpningstider',
    day_monday: 'Mandag',
    day_tuesday: 'Tirsdag',
    day_wednesday: 'Onsdag',
    day_thursday: 'Torsdag',
    day_friday: 'Fredag',
    day_saturday: 'Lørdag',
    day_sunday: 'Søndag',

    // Contact section
    bar_contact: 'Kontakt',
    bar_phone_label: 'Telefon',
    bar_no_phone_registered: 'Ingen telefonnummer registrert.',

    // Campaigns
    bar_campaigns: 'Kampanjer & tilbud',
    bar_permanent_offer: 'Fast fra baren',
    bar_no_campaigns: 'Ingen kampanjer eller tilbud er registrert enda.',

    // Matches section (bar detail - at bottom)
    bar_matches: 'Kamper',
    bar_matches_based_on: 'Vises basert på hva baren har registrert at de viser.',

    // Contact form modal
    contact_title: 'Kontakt {name}',
    contact_subtitle: 'Meldingen sendes både som e-post til baren og inn i where2watch-innboksen deres. De svarer deg direkte på e-post.',
    contact_name: 'Navn (valgfritt)',
    contact_email: 'E-post',
    contact_phone: 'Telefon (valgfritt)',
    contact_category_label: 'Hva gjelder henvendelsen?',
    contact_booking: 'Bordreservasjon / større følge',
    contact_match_question: 'Spørsmål om en spesifikk kamp',
    contact_other: 'Annet',
    contact_category_help: 'Dette hjelper baren å forstå hva du trenger.',
    contact_message: 'Melding',
    contact_placeholder: 'Hva lurer du på? For eksempel reservasjon, antall personer eller kamp du vil se.',
    contact_info: 'Baren får meldingen både som e-post og i where2watch-innboksen sin. De fleste svarer i løpet av åpningstiden.',
    contact_cancel: 'Avbryt',
    contact_sending: 'Sender...',
    contact_send: 'Send melding',
    contact_fill_required: 'Fyll inn e-post og melding.',
    contact_send_error: 'Kunne ikke sende meldingen. Prøv igjen senere.',
    contact_sent_title: 'Melding sendt',
    contact_sent_desc: 'Meldingen din er sendt til {name}. Baren får den både som e-post og i where2watch-innboksen sin.',
    contact_error_title: 'Feil',
    contact_unknown_error: 'Ukjent feil ved sending av melding.',

    // Kamper page
    kamper_title: 'Kamper',
    kamper_subtitle: 'Se kommende kamper og filtrer på liga eller lag.',
    kamper_tap_match: 'Trykk på en kamp for å se hvilke barer som viser den på kartet.',
    kamper_loading: 'Laster kommende kamper…',
    kamper_no_matches: 'Ingen kommende kamper matcher filtrene dine ennå.',
    kamper_change_filter: 'Endre liga eller søk, eller sjekk igjen litt senere.',
    kamper_could_not_load: 'Kunne ikke laste kamper akkurat nå.',
    kamper_could_not_load_generic: 'Kunne ikke laste kamper',
    kamper_unknown_error: 'Ukjent feil',
    kamper_unknown_error_test: 'Ukjent feil ved Test API',
    kamper_testing: 'Tester…',
    kamper_test_api: 'Test API',
    kamper_test_failed: 'Test API feilet',
    kamper_test_failed_http: 'Test API feilet (HTTP {status}): {message}',

    // City filter
    city_title: 'Finn din by',
    city_subtitle: 'Velg startposisjon for kartet',
    city_description: 'Velg en by for å sette hvor kartet skal starte. Vi foreslår nærmeste by hvis du deler posisjon.',
    city_none: 'Ingen',

    // Favorite teams panel
    fav_title: 'Favorittlag',
    fav_subtitle: 'Velg opptil {max} lag du vil følge ekstra nøye.',
    fav_your_favorites: 'Dine favoritter',
    fav_no_favorites: 'Du har ingen favorittlag ennå. Søk etter lag under og legg dem til her.',
    fav_search: 'Søk etter lag',
    fav_search_placeholder: 'F.eks. Rosenborg, Liverpool eller Barcelona',
    fav_suggested: 'Foreslåtte lag',
    fav_no_teams: 'Vi fant ingen lag akkurat nå. Prøv igjen senere, eller gå til «Kamper» for å laste inn kamper.',
    fav_no_match: 'Ingen lag matcher søket ditt.',
    fav_remove: 'Fjern',
    fav_add: 'Legg til',
    fav_loading: 'Laster inn lag fra kommende kamper…',
    fav_max_title: 'Maks antall favoritter',
    fav_max_desc: 'Du kan bare ha 6 favorittlag. Fjern ett lag før du legger til et nytt.',

    // Sport filter panel
    sport_error_loading: 'Kunne ikke laste kamper',
    sport_retry: 'Prøv igjen',
    sport_search_label: 'Søk etter lag eller liga',
    sport_search_placeholder: 'F.eks. Rosenborg eller Premier League',
    sport_loading: 'Laster kamper…',
    sport_no_fixtures: 'Ingen kamper er lastet inn ennå. Åpne søket på nytt om et øyeblikk, eller prøv igjen.',
    sport_teams: 'Lag',
    sport_leagues: 'Ligaer',
    sport_active: 'Aktiv',
    sport_no_results: 'Ingen treff. Prøv et annet lag eller en annen liga.',
    sport_reset: 'Nullstill lag',
    sport_no_filter: 'Ingen lagfilter',

    // Team filter
    team_filter_label: 'Filtrer etter lag:',
    team_filter_all: 'Alle barer',
    team_filter_reset: 'Nullstill',

    // League filter
    league_football: 'Fotball',
    league_show_all: 'Vis alle ligaer',

    // Team search input (kamper page)
    search_team: 'Søk etter lag',
    search_placeholder: 'F.eks. Rosenborg, AC Milan...',
    search_showing_matches: 'Viser bare kamper for valgt lag.',
    search_recent: 'Siste søk',
    search_no_results: 'Ingen treff. Prøv et annet lag.',

    // Chat
    chat_guest: 'Gjest',
    chat_message_sent: 'Melding sendt',
    chat_message_sent_desc: 'Meldingen din er sendt til {barName}.',
    chat_subtitle: 'Send melding eller book bord',
    chat_close: 'Lukk chat',
    chat_no_messages: 'Ingen meldinger ennå',
    chat_start_conversation: 'Send en melding for å starte samtalen',
    chat_placeholder: 'Skriv en melding...',
    chat_send: 'Send',

    // Varslinger page
    push_title: 'Push-varsler',
    push_ios_only: 'Push-varsler er kun tilgjengelig i Where2Watch iOS-appen. Last ned appen fra App Store for å motta varsler om kamper.',
    push_header: '🔔 Varslinger',
    push_subtitle: 'Få push-varsler når favorittlagene dine spiller på en bar nær deg.',
    push_enabled: 'Push-varsler er aktivert',
    push_enabled_desc: 'Du mottar varsler når lagene dine spiller.',
    push_blocked: 'Push-varsler er blokkert',
    push_blocked_desc: 'Gå til Innstillinger → Where2Watch → Varsler for å aktivere.',
    push_activate: 'Aktiver push-varsler',
    push_activate_desc: 'Få beskjed når favorittlagene dine spiller på en bar.',
    push_enable: 'Slå på varsler',
    push_fav_teams: 'Favorittlag',
    push_selected: 'valgt',
    push_search_teams: 'Søk etter lag…',
    push_add: 'Legg til',
    push_fav_bars: 'Favorittbarer',
    push_bars_desc: 'Få varsel uansett kamp når disse barene viser sport.',
    push_loading_bars: 'Laster barer…',
    push_saving: 'Lagrer…',
    push_save: 'Lagre innstillinger',
    push_saved: 'Varslingsinnstillinger lagret!',
    push_save_error: 'Kunne ikke lagre innstillinger',

    // Home page
    home_loading_page: 'Laster inn siden...',
    home_could_not_load: 'Kunne ikke laste kamper akkurat nå.',
    home_could_not_load_generic: 'Kunne ikke laste kamper',
    time_at: 'kl.',

    // Toast
    toast_dismiss: 'Trykk for å lukke',

    // Date locale
    date_locale: 'nb-NO',
  },
  en: {
    // Navigation
    nav_home: 'Home',
    nav_matches: 'Matches',
    nav_notifications: 'Notifications',
    nav_home_reset: 'Home/reset',

    // Home header
    home_filtering_match: 'Filtering by match',
    home_showing_bars_for: 'Showing bars that show:',
    home_showing_bars_for_match: 'Showing bars that show the selected match.',
    home_clear_match_filter: 'Clear match filter',
    home_go_to_matches: 'Go to "Matches" to search for teams and leagues',
    home_location: 'Location',
    home_find_nearest_bar: 'Find nearest bar',

    // Map overlays
    map_loading_bars: 'Loading bars…',
    map_error_title: 'Could not load bars from the database.',
    map_error_subtitle: 'Showing demo bars temporarily.',
    map_no_bars_team: 'No bars are showing this team nearby right now.',
    map_no_bars_match: 'No bars are showing this match right now.',
    map_try_other: 'Try another team, another league, or remove filters to see more bars.',
    map_auth_error: 'Google Maps could not be authenticated. Check that the API key is valid and that Maps JavaScript API is enabled.',
    map_load_error: 'Could not load the Google Maps script (network or blocked resource).',
    map_geo_unsupported: 'Geolocation is not supported by your browser',
    map_geo_denied: '📍 Share your location to see nearby bars! Go to Settings → Privacy → Location Services to enable location.',
    map_geo_unavailable: 'Location information is not available',
    map_geo_timeout: 'Location request timed out',
    map_geo_unknown: 'An unknown error occurred',
    map_mailto_greeting: 'Hi Where2Watch,',
    map_mailto_body: 'We own or operate {name} and would like to explore how we can become visible in your app.',
    map_mailto_interest: 'Please send us some information about how to get started and what you need from us.',
    map_mailto_closing: 'Best regards',
    map_could_not_load: 'The map could not be loaded',
    map_tip_reload: 'Tip: Check API key restrictions (HTTP referrers) and try reloading the page.',

    // Nearest bar list
    nearest_bars_title: 'Bars near you',
    nearest_sorted: 'Sorted by distance.',
    nearest_enable_location: 'Enable location to sort by distance.',
    nearest_no_bars: 'No bars to show with the current filter.',
    close: 'Close',

    // Bar details panel
    bar_address_unavailable: 'Address not available',
    bar_distance_away: 'away',
    bar_add_favorite: 'Add to favorites',
    bar_remove_favorite: 'Remove from favorites',
    bar_directions: 'Directions',
    bar_send_message: 'Send message',
    bar_call: 'Call',
    bar_no_phone: 'No phone',

    // Rating
    bar_rating: 'Rating',
    bar_no_ratings: 'No ratings yet',
    bar_remove_rating: 'Remove my rating',
    bar_rating_removed: 'Rating removed',
    bar_rating_removed_desc: 'Your rating has been removed.',
    bar_thanks: 'Thanks!',
    bar_rating_given: 'You gave {name} {rating} stars.',
    bar_your_rating: 'Your rating: {rating}★',
    bar_give_rating: 'Give your rating',

    // Bar matches
    bar_matches_at_bar: 'Matches at this bar',
    bar_today_count: 'Today',
    bar_upcoming_count: 'Upcoming',
    bar_loading_matches: 'Loading matches…',
    bar_no_matches_setup: 'This bar has not set up matches yet.',
    bar_no_matches_now: 'No matches right now (or they have passed the 90-minute cutoff).',
    bar_see_matches_below: 'See matches further down on the page.',
    bar_see_all: 'See all',
    bar_matches_this_week: 'The bar is showing {count} match this week.',
    bar_matches_this_week_plural: 'The bar is showing {count} matches this week.',
    bar_next_match: 'Next match',
    bar_next_matches: 'Next matches',
    bar_starting_soon: 'Starting soon at this bar',
    bar_today: 'Today',
    bar_no_matches_today: 'No matches today.',
    bar_upcoming: 'Upcoming',
    bar_no_upcoming: 'No upcoming matches.',
    bar_retry: 'Try again',

    // About bar
    bar_about: 'About the bar',
    bar_no_description: 'No description added yet.',
    bar_candidate_notice: 'This bar is not yet an active Where2Watch customer. Do you own this bar?',
    bar_candidate_cta: 'Click here to email us about onboarding',

    // Facilities
    bar_facilities: 'Facilities',
    bar_hide: 'Hide',
    bar_show: 'Show',
    bar_screens: 'Screens',
    bar_screens_1_2: '1-2 screens',
    bar_screens_3_5: '3-5 screens',
    bar_screens_6_plus: '6+ screens',
    bar_not_specified: 'Not specified',
    bar_food: 'Food',
    bar_warm_food: 'Hot food',
    bar_snacks: 'Snacks / small bites',
    bar_vegetarian: 'Vegetarian/vegan',
    bar_serves_food: 'Serves food',
    bar_no_food: 'Does not serve food',
    bar_outdoor: 'Outdoor seating',
    bar_wifi: 'WiFi',
    bar_yes: 'Yes',
    bar_no: 'No',
    bar_capacity: 'Capacity',
    bar_outdoor_badge: '🌤️ Outdoor seating',
    bar_wifi_badge: '📶 Free WiFi',
    bar_family_badge: '👨‍👩‍👧 Family friendly before 9 PM',
    bar_reservation_badge: '📅 Match reservation',
    bar_projector_badge: '📽️ Projector',

    // Opening hours
    bar_opening_hours: 'Opening hours',
    day_monday: 'Monday',
    day_tuesday: 'Tuesday',
    day_wednesday: 'Wednesday',
    day_thursday: 'Thursday',
    day_friday: 'Friday',
    day_saturday: 'Saturday',
    day_sunday: 'Sunday',

    // Contact section
    bar_contact: 'Contact',
    bar_phone_label: 'Phone',
    bar_no_phone_registered: 'No phone number registered.',

    // Campaigns
    bar_campaigns: 'Campaigns & offers',
    bar_permanent_offer: 'Permanent offer',
    bar_no_campaigns: 'No campaigns or offers registered yet.',

    // Matches section
    bar_matches: 'Matches',
    bar_matches_based_on: 'Displayed based on what the bar has registered they are showing.',

    // Contact form modal
    contact_title: 'Contact {name}',
    contact_subtitle: 'The message is sent both as email to the bar and to their where2watch inbox. They will reply directly to your email.',
    contact_name: 'Name (optional)',
    contact_email: 'Email',
    contact_phone: 'Phone (optional)',
    contact_category_label: 'What is your inquiry about?',
    contact_booking: 'Table reservation / larger group',
    contact_match_question: 'Question about a specific match',
    contact_other: 'Other',
    contact_category_help: 'This helps the bar understand what you need.',
    contact_message: 'Message',
    contact_placeholder: 'What would you like to know? For example reservation, number of people, or match you want to watch.',
    contact_info: 'The bar receives the message both as email and in their where2watch inbox. Most reply during opening hours.',
    contact_cancel: 'Cancel',
    contact_sending: 'Sending...',
    contact_send: 'Send message',
    contact_fill_required: 'Please fill in email and message.',
    contact_send_error: 'Could not send the message. Please try again later.',
    contact_sent_title: 'Message sent',
    contact_sent_desc: 'Your message has been sent to {name}. The bar receives it both as email and in their where2watch inbox.',
    contact_error_title: 'Error',
    contact_unknown_error: 'Unknown error when sending message.',

    // Kamper page
    kamper_title: 'Matches',
    kamper_subtitle: 'See upcoming matches and filter by league or team.',
    kamper_tap_match: 'Tap a match to see which bars are showing it on the map.',
    kamper_loading: 'Loading upcoming matches…',
    kamper_no_matches: 'No upcoming matches match your filters yet.',
    kamper_change_filter: 'Change league or search, or check again later.',
    kamper_could_not_load: 'Could not load matches right now.',
    kamper_could_not_load_generic: 'Could not load matches',
    kamper_unknown_error: 'Unknown error',
    kamper_unknown_error_test: 'Unknown error on Test API',
    kamper_testing: 'Testing…',
    kamper_test_api: 'Test API',
    kamper_test_failed: 'Test API failed',
    kamper_test_failed_http: 'Test API failed (HTTP {status}): {message}',

    // City filter
    city_title: 'Find your city',
    city_subtitle: 'Choose starting position for the map',
    city_description: 'Choose a city to set where the map should start. We suggest the nearest city if you share your location.',
    city_none: 'None',

    // Favorite teams panel
    fav_title: 'Favorite teams',
    fav_subtitle: 'Choose up to {max} teams to follow closely.',
    fav_your_favorites: 'Your favorites',
    fav_no_favorites: 'You have no favorite teams yet. Search for teams below and add them here.',
    fav_search: 'Search for team',
    fav_search_placeholder: 'E.g. Rosenborg, Liverpool, or Barcelona',
    fav_suggested: 'Suggested teams',
    fav_no_teams: 'We found no teams right now. Try again later, or go to "Matches" to load matches.',
    fav_no_match: 'No teams match your search.',
    fav_remove: 'Remove',
    fav_add: 'Add',
    fav_loading: 'Loading teams from upcoming matches…',
    fav_max_title: 'Maximum favorites reached',
    fav_max_desc: 'You can only have 6 favorite teams. Remove one before adding a new one.',

    // Sport filter panel
    sport_error_loading: 'Could not load matches',
    sport_retry: 'Try again',
    sport_search_label: 'Search for team or league',
    sport_search_placeholder: 'E.g. Rosenborg or Premier League',
    sport_loading: 'Loading matches…',
    sport_no_fixtures: 'No matches loaded yet. Open the search again in a moment, or try again.',
    sport_teams: 'Teams',
    sport_leagues: 'Leagues',
    sport_active: 'Active',
    sport_no_results: 'No results. Try another team or league.',
    sport_reset: 'Reset team',
    sport_no_filter: 'No team filter',

    // Team filter
    team_filter_label: 'Filter by team:',
    team_filter_all: 'All bars',
    team_filter_reset: 'Reset',

    // League filter
    league_football: 'Football',
    league_show_all: 'Show all leagues',

    // Team search input (kamper page)
    search_team: 'Search for team',
    search_placeholder: 'E.g. Rosenborg, AC Milan...',
    search_showing_matches: 'Showing only matches for the selected team.',
    search_recent: 'Recent searches',
    search_no_results: 'No results. Try another team.',

    // Chat
    chat_guest: 'Guest',
    chat_message_sent: 'Message sent',
    chat_message_sent_desc: 'Your message has been sent to {barName}.',
    chat_subtitle: 'Send a message or book a table',
    chat_close: 'Close chat',
    chat_no_messages: 'No messages yet',
    chat_start_conversation: 'Send a message to start the conversation',
    chat_placeholder: 'Write a message...',
    chat_send: 'Send',

    // Varslinger page
    push_title: 'Push notifications',
    push_ios_only: 'Push notifications are only available in the Where2Watch iOS app. Download the app from the App Store to receive match notifications.',
    push_header: '🔔 Notifications',
    push_subtitle: 'Get push notifications when your favorite teams play at a bar near you.',
    push_enabled: 'Push notifications are enabled',
    push_enabled_desc: 'You will receive notifications when your teams play.',
    push_blocked: 'Push notifications are blocked',
    push_blocked_desc: 'Go to Settings → Where2Watch → Notifications to enable.',
    push_activate: 'Enable push notifications',
    push_activate_desc: 'Get notified when your favorite teams play at a bar.',
    push_enable: 'Turn on notifications',
    push_fav_teams: 'Favorite teams',
    push_selected: 'selected',
    push_search_teams: 'Search for teams…',
    push_add: 'Add',
    push_fav_bars: 'Favorite bars',
    push_bars_desc: 'Get notified regardless of match when these bars show sports.',
    push_loading_bars: 'Loading bars…',
    push_saving: 'Saving…',
    push_save: 'Save settings',
    push_saved: 'Notification settings saved!',
    push_save_error: 'Could not save settings',

    // Home page
    home_loading_page: 'Loading page...',
    home_could_not_load: 'Could not load matches right now.',
    home_could_not_load_generic: 'Could not load matches',
    time_at: 'at',

    // Toast
    toast_dismiss: 'Tap to dismiss',

    // Date locale
    date_locale: 'en-US',
  },
} as const;

