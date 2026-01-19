import { Bar } from '../models';
import { dummyMatches } from './matches';

export const dummyBars: Bar[] = [
  {
    id: '1',
    name: 'Oslo Mekaniske Verksted',
    position: {
      lat: 59.9127,
      lng: 10.7461,
    },
    address: 'Schweigaards gate 34, 0191 Oslo',
    description: 'Populær bar med god stemning og stort utvalg av øl',
    rating: 4.5,
    matches: [dummyMatches[0], dummyMatches[1], dummyMatches[10]], // Premier League + Champions League
    phone: '+47 22 17 09 15',
    facilities: {
      screens: 8,
      hasFood: true,
      hasOutdoorSeating: true,
      hasWifi: true,
      capacity: 200,
    },
    openingHours: {
      monday: '15:00 - 01:00',
      tuesday: '15:00 - 01:00',
      wednesday: '15:00 - 01:00',
      thursday: '15:00 - 02:00',
      friday: '15:00 - 03:00',
      saturday: '12:00 - 03:00',
      sunday: '12:00 - 01:00',
    },
  },
  {
    id: '2',
    name: 'Crowbar',
    position: {
      lat: 59.9165,
      lng: 10.7503,
    },
    address: 'Torggata 32, 0183 Oslo',
    description: 'Rock-bar med live musikk og hyggelig atmosfære',
    rating: 4.3,
    matches: [dummyMatches[2], dummyMatches[5]], // Premier League + La Liga
    phone: '+47 22 20 33 22',
    facilities: {
      screens: 3,
      hasFood: false,
      hasOutdoorSeating: false,
      hasWifi: true,
      capacity: 80,
    },
    openingHours: {
      monday: 'Stengt',
      tuesday: '18:00 - 01:00',
      wednesday: '18:00 - 01:00',
      thursday: '18:00 - 02:00',
      friday: '18:00 - 03:00',
      saturday: '18:00 - 03:00',
      sunday: '18:00 - 01:00',
    },
  },
  {
    id: '3',
    name: 'Himkok',
    position: {
      lat: 59.9118,
      lng: 10.7528,
    },
    address: 'Storgata 27, 0184 Oslo',
    description: 'Cocktailbar med kreative drinker og lokal brennevin',
    rating: 4.7,
    matches: [dummyMatches[4], dummyMatches[12]], // Premier League + Champions League
    phone: '+47 22 42 99 80',
    facilities: {
      screens: 2,
      hasFood: true,
      hasOutdoorSeating: false,
      hasWifi: true,
      capacity: 60,
    },
    openingHours: {
      monday: '16:00 - 01:00',
      tuesday: '16:00 - 01:00',
      wednesday: '16:00 - 01:00',
      thursday: '16:00 - 01:00',
      friday: '16:00 - 02:00',
      saturday: '14:00 - 02:00',
      sunday: '14:00 - 00:00',
    },
  },
  {
    id: '4',
    name: 'Café Sør',
    position: {
      lat: 59.9155,
      lng: 10.7585,
    },
    address: 'Torggata 11, 0181 Oslo',
    description: 'Avslappet bar med god mat og drikke',
    rating: 4.2,
    matches: [dummyMatches[1], dummyMatches[3], dummyMatches[11]], // Premier League + Champions League
    phone: '+47 22 99 68 80',
    facilities: {
      screens: 4,
      hasFood: true,
      hasOutdoorSeating: true,
      hasWifi: true,
      capacity: 120,
    },
    openingHours: {
      monday: '11:00 - 01:00',
      tuesday: '11:00 - 01:00',
      wednesday: '11:00 - 01:00',
      thursday: '11:00 - 02:00',
      friday: '11:00 - 03:00',
      saturday: '11:00 - 03:00',
      sunday: '11:00 - 01:00',
    },
  },
  {
    id: '5',
    name: 'Territoriet',
    position: {
      lat: 59.9142,
      lng: 10.7389,
    },
    address: 'Markveien 58, 0554 Oslo',
    description: 'Sportsbar med storskjerm og god stemning under kamper',
    rating: 4.4,
    matches: [dummyMatches[0], dummyMatches[2], dummyMatches[3], dummyMatches[8]], // Premier League + Bundesliga
    phone: '+47 22 04 60 60',
    facilities: {
      screens: 12,
      hasFood: true,
      hasOutdoorSeating: true,
      hasWifi: true,
      capacity: 250,
    },
    openingHours: {
      monday: '14:00 - 01:00',
      tuesday: '14:00 - 01:00',
      wednesday: '14:00 - 01:00',
      thursday: '14:00 - 02:00',
      friday: '12:00 - 03:00',
      saturday: '12:00 - 03:00',
      sunday: '12:00 - 01:00',
    },
  },
  {
    id: '6',
    name: 'Grünerløkka Brygghus',
    position: {
      lat: 59.9223,
      lng: 10.7567,
    },
    address: 'Thorvald Meyers gate 30, 0555 Oslo',
    description: 'Mikrobryggeri med eget øl og god mat',
    rating: 4.6,
    matches: [dummyMatches[0], dummyMatches[4], dummyMatches[6]], // Premier League + La Liga
    phone: '+47 22 37 00 70',
    facilities: {
      screens: 5,
      hasFood: true,
      hasOutdoorSeating: true,
      hasWifi: true,
      capacity: 150,
    },
    openingHours: {
      monday: '15:00 - 00:00',
      tuesday: '15:00 - 00:00',
      wednesday: '15:00 - 00:00',
      thursday: '15:00 - 01:00',
      friday: '12:00 - 02:00',
      saturday: '12:00 - 02:00',
      sunday: '12:00 - 00:00',
    },
  },
  {
    id: '7',
    name: 'Dattera til Hagen',
    position: {
      lat: 59.9205,
      lng: 10.7542,
    },
    address: 'Grønland 10, 0188 Oslo',
    description: 'Koselig uteservering og hyggelig atmosfære',
    rating: 4.1,
    matches: [dummyMatches[1], dummyMatches[7]], // Premier League + La Liga
  },
  {
    id: '8',
    name: 'Torggata Botaniske',
    position: {
      lat: 59.9178,
      lng: 10.7521,
    },
    address: 'Torggata 16, 0181 Oslo',
    description: 'Cocktailbar med botanisk tema og kreative drinker',
    rating: 4.5,
    matches: [dummyMatches[2], dummyMatches[4], dummyMatches[9]], // Premier League + Bundesliga
  },
  {
    id: '9',
    name: 'Internasjonalen',
    position: {
      lat: 59.9132,
      lng: 10.7498,
    },
    address: 'Brenneriveien 9, 0182 Oslo',
    description: 'Livlig bar med DJ og dansegulv',
    rating: 4.0,
    matches: [dummyMatches[13], dummyMatches[14]], // Eliteserien
  },
  {
    id: '10',
    name: 'Smelteverket',
    position: {
      lat: 59.9095,
      lng: 10.7612,
    },
    address: 'Vulkan 100, 0178 Oslo',
    description: 'Moderne bar ved Akerselva med uteservering',
    rating: 4.3,
    matches: [dummyMatches[3], dummyMatches[17]], // Premier League + Serie A
  },
  {
    id: '11',
    name: 'Peloton',
    position: {
      lat: 59.9168,
      lng: 10.7445,
    },
    address: 'Maridalsveien 3, 0178 Oslo',
    description: 'Sykkel-tema bar med god stemning',
    rating: 4.2,
    matches: [dummyMatches[0], dummyMatches[15]], // Premier League + Eliteserien
  },
  {
    id: '12',
    name: 'Olympen',
    position: {
      lat: 59.9145,
      lng: 10.7623,
    },
    address: 'Grønlandsleiret 15, 0190 Oslo',
    description: 'Historisk bar med konsertscene og restaurant',
    rating: 4.4,
    matches: [dummyMatches[1], dummyMatches[2], dummyMatches[18]], // Premier League + Serie A
  },
];

