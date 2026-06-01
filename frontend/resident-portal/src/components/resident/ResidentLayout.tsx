import { Link, Outlet, useLocation } from 'react-router';
import { Calendar, Home, MessageSquare, Search, Pencil, XCircle, Briefcase } from 'lucide-react';
import { residentRoutes } from '@/lib/routes';

const navLinks = [
  { to: residentRoutes.home, alt: residentRoutes.homeAlt, label: 'Home', icon: Home },
  { to: residentRoutes.book, label: 'Book', icon: Calendar },
  { to: residentRoutes.services, label: 'Services', icon: Briefcase },
  { to: residentRoutes.track, label: 'Track', icon: Search },
  { to: residentRoutes.edit, label: 'Edit', icon: Pencil },
  { to: residentRoutes.cancel, label: 'Cancel', icon: XCircle },
  { to: residentRoutes.feedback, label: 'Feedback', icon: MessageSquare },
];

function isHomePath(pathname: string) {
  return pathname === residentRoutes.home || pathname === residentRoutes.homeAlt;
}

export function ResidentLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link to={residentRoutes.home} className="text-xl font-semibold text-gray-800">
            Kebele appointments
          </Link>
          <nav className="flex flex-wrap gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active =
                ('alt' in item && item.alt && isHomePath(location.pathname)) ||
                location.pathname === item.to ||
                (item.to !== residentRoutes.home && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        <p>Kebele Appointment Management System — Resident portal</p>
      </footer>
    </div>
  );
}
