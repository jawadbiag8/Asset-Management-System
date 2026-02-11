/**
 * App-wide date formatting: MM/DD/YYYY and MM/DD/YYYY, hh:mm AM/PM.
 * Use for all date and datetime display.
 */
export function formatDateOnly(value: string | Date | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return 'N/A';
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${mm}/${dd}/${yyyy}, ${time}`;
  } catch {
    return 'N/A';
  }
}

/** If value is a valid date string, return MM/DD/YYYY, time; otherwise return value as-is (e.g. "5 mins ago"). */
export function formatDateOrPassThrough(value: string | null | undefined): string {
  if (value == null || value === '') return value ?? 'N/A';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${mm}/${dd}/${yyyy}, ${time}`;
  } catch {
    return value;
  }
}
