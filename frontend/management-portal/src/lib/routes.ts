/** Management portal paths (standalone app — no /management prefix) */
export const managementRoutes = {
  root: '/',
  login: '/login',
  admin: {
    dashboard: '/admin/dashboard',
    appointments: '/admin/appointments',
    appointment: (id: number | string) => `/admin/appointments/${id}`,
    staff: '/admin/staff',
    services: '/admin/services',
    departments: '/admin/departments',
    limits: '/admin/limits',
    schedule: '/admin/schedule',
    formBuilder: '/admin/form-builder',
    feedback: '/admin/feedback',
    reports: '/admin/reports',
    settings: '/admin/settings',
  },
  staff: {
    dashboard: '/staff/dashboard',
    appointments: '/staff/appointments',
    appointment: (id: number | string) => `/staff/appointments/${id}`,
    calendar: '/staff/calendar',
  },
} as const;

/** @deprecated Use managementRoutes */
export const portalRoutes = managementRoutes;

export function managementHomeForRole(role: 'ADMIN' | 'STAFF') {
  return role === 'ADMIN' ? managementRoutes.admin.dashboard : managementRoutes.staff.dashboard;
}

/** @deprecated Use managementHomeForRole */
export const portalHomeForRole = managementHomeForRole;

export const MANAGEMENT_ADMIN_PREFIX = '/admin';
export const MANAGEMENT_STAFF_PREFIX = '/staff';
