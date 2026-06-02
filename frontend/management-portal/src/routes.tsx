import { createBrowserRouter, Navigate } from 'react-router';
import { PortalLayout } from './components/portal/PortalLayout';
import { PortalLoginPage } from './components/portal/PortalLoginPage';
import {
  PortalIndexRedirect,
  PortalLoginGate,
  RequirePortalAuth,
} from './components/portal/PortalGuards';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManageStaff } from './components/admin/ManageStaff';
import { AppointmentLimits } from './components/admin/AppointmentLimits';
import { ScheduleOverrides } from './components/admin/ScheduleOverrides';
import { ServicesManagement } from './components/admin/ServicesManagement';
import { AdminDepartments } from './components/admin/AdminDepartments';
import { ServiceFormBuilder } from './components/admin/ServiceFormBuilder';
import { Feedback } from './components/admin/Feedback';
import { AdminAppointments } from './components/admin/AdminAppointments';
import { AdminAppointmentDetails } from './components/admin/AdminAppointmentDetails';
import { Reports } from './components/admin/Reports';
import { Settings } from './components/admin/Settings';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { StaffAppointmentDetails } from './components/staff/StaffAppointmentDetails';
import { managementRoutes } from './lib/routes';
import { LegacyPortalRedirect } from './components/portal/LegacyRedirects';

function legacyRedirect(to: string) {
  return <Navigate to={to} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, Component: PortalIndexRedirect },
      {
        path: 'login',
        element: (
          <PortalLoginGate>
            <PortalLoginPage />
          </PortalLoginGate>
        ),
      },
      {
        element: <RequirePortalAuth allowedRole="ADMIN" />,
        children: [
          {
            path: 'admin',
            Component: PortalLayout,
            children: [
              { index: true, element: legacyRedirect(managementRoutes.admin.dashboard) },
              { path: 'dashboard', Component: AdminDashboard },
              { path: 'appointments', Component: AdminAppointments },
              { path: 'appointments/:id', Component: AdminAppointmentDetails },
              { path: 'staff', Component: ManageStaff },
              { path: 'services', Component: ServicesManagement },
              { path: 'departments', Component: AdminDepartments },
              { path: 'limits', Component: AppointmentLimits },
              { path: 'schedule', Component: ScheduleOverrides },
              { path: 'form-builder', Component: ServiceFormBuilder },
              { path: 'feedback', Component: Feedback },
              { path: 'reports', Component: Reports },
              { path: 'settings', Component: Settings },
            ],
          },
        ],
      },
      {
        element: <RequirePortalAuth allowedRole="STAFF" />,
        children: [
          {
            path: 'staff',
            Component: PortalLayout,
            children: [
              { index: true, element: legacyRedirect(managementRoutes.staff.dashboard) },
              { path: 'dashboard', Component: StaffDashboard },
              { path: 'appointments', Component: StaffDashboard },
              { path: 'appointments/:id', Component: StaffAppointmentDetails },
              { path: 'calendar', Component: StaffDashboard },
            ],
          },
        ],
      },
    ],
  },
  { path: '/management', element: legacyRedirect('/') },
  { path: '/management/*', element: <LegacyPortalRedirect /> },
  { path: '/portal', element: legacyRedirect('/') },
  { path: '/portal/*', element: <LegacyPortalRedirect /> },
  { path: '/login/admin', element: legacyRedirect(managementRoutes.login) },
  { path: '/login/staff', element: legacyRedirect(managementRoutes.login) },
  { path: '/login/:role', element: legacyRedirect(managementRoutes.login) },
]);
