import { Link, Outlet, useLocation } from 'react-router';
import { Calendar, Home, MessageSquare, Search, Briefcase } from 'lucide-react';
import { KebeleLogo } from '@kebele/shared/components/KebeleLogo';
import { residentRoutes } from '@/lib/routes';

const navLinks = [
  { to: residentRoutes.home, alt: residentRoutes.homeAlt, label: 'Home', icon: Home },
  { to: residentRoutes.book, label: 'Book', icon: Calendar },
  { to: residentRoutes.services, label: 'Services', icon: Briefcase },
  { to: residentRoutes.track, label: 'Track', icon: Search },
  { to: residentRoutes.feedback, label: 'Feedback', icon: MessageSquare },
];

function isHomePath(pathname: string) {
  return pathname === residentRoutes.home || pathname === residentRoutes.homeAlt;
}

export function ResidentLayout() {
  const location = useLocation();

  return (
    <div className="bento-shell flex flex-col">
      <header className="bento-topbar">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link to={residentRoutes.home} className="hover:opacity-90 transition-opacity">
            <KebeleLogo title="Kebele appointments" subtitle="Resident portal" size="sm" />
          </Link>
          <nav className="flex flex-wrap gap-2">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors border ${
                    active
                      ? 'bg-blue-50/90 text-blue-700 border-blue-200'
                      : 'text-gray-600 hover:bg-white/80 border-transparent hover:border-slate-200'
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

      <main className="bento-main flex-1 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500">
          <KebeleLogo size="xs" showText={false} />
          <p>Kebele Appointment Management System — Resident portal</p>
        </div>
      </footer>
    </div>
  );
}

