/** Hours from now until appointment start (from ISO or Date string). */
export function hoursUntilAppointmentStart(startTime: string | Date | null | undefined): number | null {
  if (startTime == null || startTime === '') return null;
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(start.getTime())) return null;
  return (start.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function canRescheduleOrEdit(startTime: string | Date | null | undefined): boolean {
  const hours = hoursUntilAppointmentStart(startTime);
  if (hours == null) return false;
  return hours > 24;
}

/** HH:mm from stored slot start (ISO string or Date). */
export function slotStartHHmmFromInstant(
  startTime: string | Date | null | undefined
): string {
  if (startTime == null || startTime === '') return '';
  const d = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** YYYY-MM-DD for appointment date fields (local calendar). */
export function appointmentDateYmd(
  slotDate: string | Date | null | undefined,
  startTime?: string | Date | null
): string {
  if (slotDate != null && slotDate !== '') {
    const s = String(slotDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(slotDate);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  if (startTime != null && startTime !== '') {
    const d = startTime instanceof Date ? startTime : new Date(startTime);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}
