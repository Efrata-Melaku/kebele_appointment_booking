import { apiJson } from './api';
import type { ServiceWithDepartment } from './staffDepartment';

export type ServicePickerOption = {
  id: number;
  name: string;
  departmentId: number;
  departmentName: string;
};

export function toServiceWithDepartment(row: ServicePickerOption): ServiceWithDepartment {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    department: row.departmentName
      ? { id: row.departmentId, name: row.departmentName }
      : null,
  };
}

/** Load all services for staff assignment (client-side search). */
export async function fetchServicePickerOptions(): Promise<ServiceWithDepartment[]> {
  const rows = await apiJson<ServicePickerOption[]>('/api/admin/services/picker');
  return (rows ?? []).map(toServiceWithDepartment);
}

export function filterServicesByName(
  services: ServiceWithDepartment[],
  query: string
): ServiceWithDepartment[] {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter((s) => s.name.toLowerCase().includes(q));
}
