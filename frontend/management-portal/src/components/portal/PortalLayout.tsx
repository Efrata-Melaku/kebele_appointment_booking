import { Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings as SettingsIcon,
  MessageSquare,
  BarChart3,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Building2,
  Briefcase,
} from 'lucide-react';
import { useState } from 'react';
import { clearAuthSession, getAuthUser } from '@kebele/shared/lib/auth';
import {
  MANAGEMENT_ADMIN_PREFIX,
  MANAGEMENT_STAFF_PREFIX,
  managementRoutes,
} from '@/lib/routes';
import { KebeleLogo } from '@kebele/shared/components/KebeleLogo';
import { MOBILE_MENU_BACKDROP_CLASS } from '@kebele/shared/components/ui/modalStyles';

type MenuItem = { path: string; label: string; icon: React.ComponentType<{ className?: string }> };

const adminMenu: MenuItem[] = [
  { path: managementRoutes.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { path: managementRoutes.admin.appointments, label: 'Appointments', icon: Calendar },
  { path: managementRoutes.admin.services, label: 'Services', icon: Briefcase },
  { path: managementRoutes.admin.departments, label: 'Departments', icon: Building2 },
  { path: managementRoutes.admin.staff, label: 'Staff', icon: Users },
  { path: managementRoutes.admin.reports, label: 'Reports', icon: BarChart3 },
  { path: managementRoutes.admin.formBuilder, label: 'Form builder', icon: ClipboardList },
  { path: managementRoutes.admin.feedback, label: 'Feedback', icon: MessageSquare },
  { path: managementRoutes.admin.limits, label: 'Slots sync', icon: Calendar },
  { path: managementRoutes.admin.schedule, label: 'Schedule overrides', icon: Calendar },
  { path: managementRoutes.admin.settings, label: 'Settings', icon: SettingsIcon },
];

const staffMenu: MenuItem[] = [
  { path: managementRoutes.staff.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { path: managementRoutes.staff.appointments, label: 'Appointments', icon: Calendar },
  { path: managementRoutes.staff.calendar, label: 'Calendar', icon: FileText },
];

export function PortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getAuthUser();

  const portalRole = location.pathname.startsWith(MANAGEMENT_ADMIN_PREFIX)
    ? 'admin'
    : location.pathname.startsWith(MANAGEMENT_STAFF_PREFIX)
      ? 'staff'
      : null;

  const currentMenu = portalRole === 'admin' ? adminMenu : portalRole === 'staff' ? staffMenu : [];
  const panelTitle = portalRole === 'admin' ? 'Admin portal' : 'Staff portal';

  function handleLogout() {
    clearAuthSession();
    navigate(managementRoutes.login, { replace: true });
  }

  return (
    <div className="bento-shell flex min-h-screen">
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bento-sidebar fixed left-0 top-0 h-screen w-64 z-50 md:translate-x-0 transition-transform duration-300`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200/80">
            <div className="flex items-start justify-between gap-2">
              <KebeleLogo title="KEBELE" subtitle={panelTitle} size="sm" />
              <button type="button" onClick={() => setSidebarOpen(false)} className="md:hidden shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>
            {user ? <p className="text-xs text-gray-500 mt-3 truncate">{user.name}</p> : null}
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {currentMenu.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'text-gray-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-slate-200/80">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-gray-700 hover:bg-slate-50 hover:border-slate-200 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-64">
        <header className="bento-topbar">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden">
                <Menu className="w-6 h-6" />
              </button>
              <KebeleLogo
                size="sm"
                showText={false}
                className="md:hidden"
              />
              <h1 className="text-xl text-gray-800 hidden md:block">Kebele management portal</h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div
                className="hidden sm:flex flex-col items-end text-right"
                title={user?.email}
              >
                <span className="text-sm font-medium text-gray-800">{user?.name ?? 'User'}</span>
                <span className="text-xs text-gray-500">{user?.role}</span>
              </div>
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            </div>
          </div>
        </header>

        <main className="bento-main flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <div onClick={() => setSidebarOpen(false)} className={MOBILE_MENU_BACKDROP_CLASS} />
      ) : null}
    </div>
  );
}

