import { Navigate, useLocation } from 'react-router';
import { managementRoutes } from '@/lib/routes';

/** Maps old /management/... and /portal/... URLs to current paths */
export function LegacyPortalRedirect() {
  const { pathname } = useLocation();
  let suffix = pathname.replace(/^\/management\/?/, '').replace(/^\/portal\/?/, '');
  if (!suffix) {
    return <Navigate to={managementRoutes.root} replace />;
  }
  if (suffix === 'login') {
    return <Navigate to={managementRoutes.login} replace />;
  }
  if (suffix.startsWith('admin/') || suffix.startsWith('staff/')) {
    return <Navigate to={`/${suffix}`} replace />;
  }
  return <Navigate to={managementRoutes.login} replace />;
}
