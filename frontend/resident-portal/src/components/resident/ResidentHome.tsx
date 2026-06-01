import { Link } from 'react-router';
import {
  Calendar,
  Search,
  Pencil,
  XCircle,
  MessageSquare,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
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
    description: 'Look up status with your phone or reference number',
    icon: Search,
    color: 'bg-indigo-500',
  },
  {
    to: residentRoutes.edit,
    title: 'Edit appointment',
    description: 'Update form responses or reschedule a pending booking',
    icon: Pencil,
    color: 'bg-teal-500',
  },
  {
    to: residentRoutes.cancel,
    title: 'Cancel appointment',
    description: 'Cancel a pending appointment',
    icon: XCircle,
    color: 'bg-red-500',
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
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">Welcome to Kebele appointments</h1>
        <p className="text-blue-100 max-w-2xl mb-8">
          Book, track, edit, or cancel your appointments online. No account required — use the phone
          number you provide when booking.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group"
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
