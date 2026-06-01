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
  ClipboardList
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { clearAuthSession, getAuthUser } from '../../lib/auth';
import { MOBILE_MENU_BACKDROP_CLASS } from './ui/modalStyles';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = location.pathname.split('/')[1];

  useEffect(() => {
    if (role !== 'admin' && role !== 'staff') return;
    const u = getAuthUser();
    const need = role === 'admin' ? 'ADMIN' : 'STAFF';
    if (!u || u.role !== need) {
      navigate(`/login/${role}`, { replace: true });
    }
  }, [role, navigate, location.pathname]);

  const menuItems = {
    admin: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/appointments', label: 'Appointments', icon: Calendar },
      { path: '/admin/staff', label: 'Manage Staff', icon: Users },
      { path: '/admin/limits', label: 'Slots sync', icon: Calendar },
      { path: '/admin/schedule', label: 'Schedule overrides', icon: Calendar },
      { path: '/admin/services', label: 'Services', icon: FileText },
      { path: '/admin/form-builder', label: 'Form builder', icon: ClipboardList },
      { path: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
      { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    ],
    staff: [
      { path: '/staff', label: 'My Appointments', icon: Calendar },
    ],
    user: [
      { path: '/user', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/user/book', label: 'Book Appointment', icon: Calendar },
      { path: '/user/appointments', label: 'My Appointments', icon: ClipboardList },
    ],
  };

  const currentMenu = menuItems[role as keyof typeof menuItems] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl text-gray-800">
                {role === 'admin' ? 'Admin Panel' : role === 'staff' ? 'Staff Panel' : 'Resident Portal'}
              </h2>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
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
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
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

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                clearAuthSession();
                navigate('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Switch Role</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl text-gray-800">Kebele Appointment System</h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {role.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className={MOBILE_MENU_BACKDROP_CLASS}
        />
      )}
    </div>
  );
}
