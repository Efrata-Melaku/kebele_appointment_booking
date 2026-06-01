export const STAFF_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'NOT_SERVED', label: 'Not Served' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

/** @deprecated use STAFF_STATUS_OPTIONS */
export const STAFF_NEW_STATUS_OPTIONS = STAFF_STATUS_OPTIONS;

export type StaffStatusTarget = {
  id: number;
  serviceId: number;
  appointmentNumber: string;
  status: string;
  residentName: string;
  serviceName: string;
};

export function statusLabel(status: string) {
  const s = status.toUpperCase().replace(/-/g, '_');
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    RESCHEDULED: 'Rescheduled',
    NOT_SERVED: 'Not Served',
    CANCELLED: 'Cancelled',
  };
  return labels[s] || status;
}

export function statusBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'bg-green-100 text-green-800';
  if (s === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (s === 'RESCHEDULED') return 'bg-blue-100 text-blue-800';
  if (s === 'NOT_SERVED') return 'bg-red-100 text-red-800';
  if (s === 'CANCELLED') return 'bg-gray-200 text-gray-700';
  return 'bg-gray-100 text-gray-700';
}

export function canStaffChangeStatus(_status: string) {
  return true;
}
