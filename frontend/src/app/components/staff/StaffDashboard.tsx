import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Eye, Loader2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

type Apt = {
  id: number;
  appointmentNumber: string;
  status: string;
  resident?: { fullName: string; phone?: string };
  service?: { name: string };
  timeSlot?: { date: string; startTime: string };
};

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: 'not_served', label: 'Not served' },
] as const;

function statusBadgeClass(status: string) {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'bg-green-100 text-green-800';
  if (s === 'PENDING') return 'bg-amber-100 text-amber-800';
  if (s === 'RESCHEDULED') return 'bg-blue-100 text-blue-800';
  if (s === 'NOT_SERVED') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
}

export function StaffDashboard() {
  const [appointments, setAppointments] = useState<Apt[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]['key']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const { res, body } = await apiFetch('/api/staff/appointments');
      if (!res.ok || !body?.success || !body.data) throw new Error((body?.error as string) || 'Failed');
      setAppointments(body.data as Apt[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const norm = (s: string) => s.toUpperCase();
  const filtered =
    filter === 'all' ? appointments : appointments.filter((a) => norm(a.status) === norm(filter));

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');
  const formatTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Appointments</h2>
        <p className="text-gray-600 text-sm">
          Appointments for services you are assigned to
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === opt.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Appointment #</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Resident</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Phone</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Service</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Date</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Time</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Status</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="py-12 px-6 text-center text-gray-500" colSpan={8}>
                    No appointments found
                  </td>
                </tr>
              ) : (
                filtered.map((apt) => (
                  <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm font-mono text-gray-800">{apt.appointmentNumber}</td>
                    <td className="py-4 px-6 text-sm text-gray-800">{apt.resident?.fullName ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.resident?.phone ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.service?.name ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{formatDate(apt.timeSlot?.date)}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{formatTime(apt.timeSlot?.startTime)}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium uppercase ${statusBadgeClass(apt.status)}`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        to={`/staff/appointments/${apt.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
