import type { StaffStatusTarget } from '../../../lib/staffAppointmentStatus';

type AptLike = {
  id: number;
  serviceId?: number;
  appointmentNumber: string;
  status: string;
  residentName?: string;
  phone?: string;
  serviceName?: string;
  resident?: { fullName: string; phone?: string };
  service?: { id?: number; name: string };
};

export function toStaffStatusTarget(apt: AptLike): StaffStatusTarget | null {
  const serviceId = apt.serviceId ?? apt.service?.id;
  if (!serviceId) return null;
  return {
    id: apt.id,
    serviceId,
    appointmentNumber: apt.appointmentNumber,
    status: apt.status,
    residentName: apt.residentName || apt.resident?.fullName || '—',
    serviceName: apt.serviceName || apt.service?.name || '—',
  };
}
