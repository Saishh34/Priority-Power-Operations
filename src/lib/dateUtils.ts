/**
 * Consistently formats a date/time string to Asia/Kolkata timezone.
 */

export function formatKolkataDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function formatKolkataDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
    });
  } catch {
    return dateStr;
  }
}
