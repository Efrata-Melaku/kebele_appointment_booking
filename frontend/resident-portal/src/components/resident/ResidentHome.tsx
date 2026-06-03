import { Link } from 'react-router';
import { Calendar, Search, MessageSquare, Briefcase, ArrowRight } from 'lucide-react';
import { KebeleLogo } from '@kebele/shared/components/KebeleLogo';
import { residentRoutes } from '@/lib/routes';

const actions = [
  {
    to: residentRoutes.book,
    title: 'Book appointment',
    description: 'Choose a service and schedule a new visit',
    icon: Calendar,
    color: 'bg-blue-500',
  },
  {
    to: residentRoutes.track,
    title: 'Track appointment',
    description: 'Look up status, edit, cancel, or leave feedback',
    icon: Search,
    color: 'bg-indigo-500',
  },
  {
    to: residentRoutes.feedback,
    title: 'Feedback',
    description: 'Rate completed services',
    icon: MessageSquare,
    color: 'bg-purple-500',
  },
  {
    to: residentRoutes.services,
    title: 'Services information',
    description: 'Browse available kebele services',
    icon: Briefcase,
    color: 'bg-orange-500',
  },
];

export function ResidentHome() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-blue-300/40 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 text-white shadow-[0_20px_50px_rgba(37,99,235,0.35)]">
        <KebeleLogo
          size="lg"
          showText={false}
          className="mb-6"
          imageClassName="ring-2 ring-white/30"
        />
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">Welcome to Kebele appointments</h1>
        <p className="text-blue-100 max-w-2xl mb-8">
          Book and track your appointments online. No account required — use the phone number you
          provide when booking.
        </p>
        <Link
          to={residentRoutes.book}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          Book an appointment
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">What would you like to do?</h2>
        <div className="bento-grid">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="bento-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
              >
                <div
                  className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
