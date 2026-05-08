import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

type Apt = {
  id: number;
  appointmentNumber: string;
  status: string;
  resident?: { fullName: string };
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

export function StaffDashboard() {
  const [appointments, setAppointments] = useState<Apt[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]['key']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

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

  async function patchStatus(id: number, status: string) {
    setBusyId(id);
    try {
      const { res, body } = await apiFetch(`/api/staff/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Update failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

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
        <p className="text-gray-600 text-sm">Live data from backend</p>
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
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Number</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Resident</th>
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
                  <td className="py-12 px-6 text-center text-gray-500" colSpan={7}>
                    No rows
                  </td>
                </tr>
              ) : (
                filtered.map((apt) => (
                  <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-800">{apt.appointmentNumber}</td>
                    <td className="py-4 px-6 text-sm text-gray-800">{apt.resident?.fullName ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.service?.name ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{formatDate(apt.timeSlot?.date)}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{formatTime(apt.timeSlot?.startTime)}</td>
                    <td className="py-4 px-6 text-xs uppercase text-gray-700">{apt.status}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {busyId === apt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <button
                              title="Completed"
                              type="button"
                              disabled={norm(apt.status) === 'COMPLETED'}
                              onClick={() => patchStatus(apt.id, 'completed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Rescheduled"
                              type="button"
                              onClick={() => patchStatus(apt.id, 'rescheduled')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              title="Not served"
                              type="button"
                              onClick={() => patchStatus(apt.id, 'not_served')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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
