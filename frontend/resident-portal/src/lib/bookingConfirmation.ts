/** Passed via React Router location.state only — never persisted. */
export type JustBookedAppointment = {
  appointmentNumber: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
};

export type TrackLocationState = {
  justBooked?: JustBookedAppointment;
};

function formatStatus(status: string) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'Pending';
    case 'COMPLETED':
      return 'Completed';
    case 'RESCHEDULED':
      return 'Rescheduled';
    case 'NOT_SERVED':
      return 'Not Served';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatTime(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const s = String(value);
  return /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : s;
}

/** Build confirmation payload from POST /api/user/appointments response data. */
export function mapJustBookedFromApi(data: unknown): JustBookedAppointment | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const group = row.group as { appointmentNumber?: string } | undefined;
  const appointmentNumber = String(row.appointmentNumber ?? group?.appointmentNumber ?? '').trim();
  if (!appointmentNumber) return null;

  const service = row.service as { name?: string } | undefined;
  const timeSlot = row.timeSlot as { date?: string; startTime?: string } | undefined;
  const status = String(row.status ?? 'PENDING');

  return {
    appointmentNumber,
    serviceName: service?.name ?? 'Service',
    dateLabel: formatDate(timeSlot?.date ?? row.slotDate),
    timeLabel: formatTime(timeSlot?.startTime ?? row.slotStartTime),
    status: formatStatus(status),
  };
}
