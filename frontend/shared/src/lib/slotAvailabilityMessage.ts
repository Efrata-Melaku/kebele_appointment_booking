/** Map API slot errors to resident-facing copy. */
export function residentSlotEmptyMessage(apiError?: string): string {
  if (!apiError) return 'No appointment slots are available for this date.';
  if (apiError.includes('Office is closed on this date')) {
    return 'Office is closed on this date.';
  }
  if (apiError.includes('This service is unavailable on the selected date')) {
    return 'This service is unavailable on the selected date.';
  }
  if (apiError.includes('No appointment slots are available')) {
    return 'No appointment slots are available for this date.';
  }
  return 'No appointment slots are available for this date.';
}
