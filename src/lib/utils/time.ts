import { asRecord } from '@/lib/utils/unknown';

/**
 * Convert a JSON-serialized timestamp-ish value into epoch milliseconds.
 * Supports: number(ms), ISO string, Firestore Timestamp-like objects.
 */
export function tsToMs(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  }

  const rec = asRecord(v);
  const fn = rec?.toMillis;
  if (typeof fn === 'function') {
    try {
      const ms = (fn as (this: unknown) => number).call(v);
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    } catch {
      // ignore
    }
  }

  // Firestore Timestamp from server often serializes like { _seconds, _nanoseconds }
  const sec =
    typeof rec?._seconds === 'number' ? rec._seconds : typeof rec?.seconds === 'number' ? rec.seconds : null;
  const nanos =
    typeof rec?._nanoseconds === 'number'
      ? rec._nanoseconds
      : typeof rec?.nanoseconds === 'number'
        ? rec.nanoseconds
        : 0;
  if (typeof sec === 'number') return sec * 1000 + Math.floor(nanos / 1_000_000);
  return null;
}

export function daysRemaining(endMs: number, nowMs: number = Date.now()): number {
  const diff = endMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
