import { Navigate, Outlet, useLocation } from 'react-router';
import { getAuthUser } from '@kebele/shared/lib/auth';
import { managementHomeForRole, managementRoutes } from '@/lib/routes';

type PortalRole = 'ADMIN' | 'STAFF';

export function PortalIndexRedirect() {
  const user = getAuthUser();
  if (!user) return <Navigate to={managementRoutes.login} replace />;
  return <Navigate to={managementHomeForRole(user.role)} replace />;
}

export function RequirePortalAuth({ allowedRole }: { allowedRole?: PortalRole }) {
  const location = useLocation();
  const user = getAuthUser();

  if (!user) {
    return <Navigate to={managementRoutes.login} replace state={{ from: location.pathname }} />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={managementHomeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function PortalLoginGate({ children }: { children: React.ReactNode }) {
  const user = getAuthUser();
  if (user) {
    return <Navigate to={managementHomeForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
