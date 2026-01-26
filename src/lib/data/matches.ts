import { Match } from '../models';

/**
 * Tidligere brukte vi `dummyMatches` som mock/demo-data.
 * Appen er nå ment å vise ekte fixtures via /api/fixtures,
 * så denne listen er bevisst tom og kan brukes som fallback/demo
 * hvis vi senere ønsker å mocke kamper igjen.
 */
export const dummyMatches: Match[] = [];

