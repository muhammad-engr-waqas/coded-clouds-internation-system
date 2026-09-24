/**
 * formatDate.ts — single source of truth for all date formatting in the app.
 *
 * Usage:
 *   formatDate('2026-09-24T00:00:00.000Z')          → "24 Sep 2026"
 *   formatDate('2026-09-24', 'short')                → "24 Sep 2026"
 *   formatDate('2026-09-24', 'long')                 → "24 September 2026"
 *   formatDate('2026-09-24', 'monthDay')             → "Sep 24"
 *   formatDate('2026-09-24T09:30:00.000Z', 'time')  → "09:30 AM"
 *   formatDate('2026-09-24T09:30:00.000Z', 'full')  → "24 Sep 2026, 09:30 AM"
 *   formatDate(null)                                 → "—"
 */

type DateFormat = 'short' | 'long' | 'monthDay' | 'time' | 'full' | 'input';

export function formatDate(
  value: string | Date | null | undefined,
  format: DateFormat = 'short'
): string {
  if (!value) return '—';

  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';

  switch (format) {
    case 'short':
      // "24 Sep 2026"
      return d.toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
      });

    case 'long':
      // "24 September 2026"
      return d.toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'long',
        year:  'numeric',
      });

    case 'monthDay':
      // "Sep 24"
      return d.toLocaleDateString('en-GB', {
        day:   'numeric',
        month: 'short',
      });

    case 'time':
      // "09:30 AM"
      return d.toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
      });

    case 'full':
      // "24 Sep 2026, 09:30 AM"
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );

    case 'input':
      // "2026-09-24" — for <input type="date"> value
      return d.toISOString().split('T')[0];

    default:
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
