import { Link } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { Button } from '@kebele/shared/components/ui/button';
import { residentRoutes } from '@/lib/routes';
import type { JustBookedAppointment } from '@/lib/bookingConfirmation';

type Props = {
  appointment: JustBookedAppointment;
  onTrackLater: () => void;
};

export function BookingConfirmationCard({ appointment, onTrackLater }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-green-50/50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle className="mt-0.5 h-10 w-10 shrink-0 text-green-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Appointment booked</h2>
          <p className="mt-1 text-sm text-gray-600">
            Save your appointment number. This summary is only shown until you leave or refresh this
            page.
          </p>
        </div>
      </div>

      <dl className="grid gap-3 rounded-lg border border-green-100 bg-white p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Appointment number
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-gray-900">
            {appointment.appointmentNumber}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">{appointment.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Service</dt>
          <dd className="mt-1 text-sm text-gray-900">{appointment.serviceName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Date</dt>
          <dd className="mt-1 text-sm text-gray-900">{appointment.dateLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Time</dt>
          <dd className="mt-1 text-sm text-gray-900">{appointment.timeLabel}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onTrackLater}>
          Look up appointments later
        </Button>
        <Button type="button" asChild>
          <Link to={residentRoutes.book}>Book another</Link>
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link to={residentRoutes.home}>Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
