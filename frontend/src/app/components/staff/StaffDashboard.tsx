import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Eye } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { DEFAULT_PAGE_LIMIT, parsePaginatedBody, type PaginationMeta } from '../../../lib/pagination';
import { PaginationBar } from '../ui/PaginationBar';
import { TableSkeleton } from '../ui/ListSkeleton';

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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(DEFAULT_PAGE_LIMIT));
    if (filter !== 'all') q.set('status', filter);
    return q.toString();
  }, [page, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/staff/appointments?${queryString}`);
      if (!res.ok || !body?.success) throw new Error((body?.error as string) || 'Failed');
      const { items, pagination: meta } = parsePaginatedBody<Apt>(
        body as { success?: boolean; data?: Apt[]; pagination?: PaginationMeta }
      );
      setAppointments(items);
      setPagination(meta);
      setPage(meta.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

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
        <p className="text-gray-600 text-sm">Appointments for services you are assigned to</p>
      </div>

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
        {loading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Appointment #</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Resident</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Service</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Date</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Time</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No appointments
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm font-mono">{apt.appointmentNumber}</td>
                      <td className="py-4 px-6 text-sm">{apt.resident?.fullName ?? '—'}</td>
                      <td className="py-4 px-6 text-sm">{apt.service?.name ?? '—'}</td>
                      <td className="py-4 px-6 text-sm">{formatDate(apt.timeSlot?.date)}</td>
                      <td className="py-4 px-6 text-sm">{formatTime(apt.timeSlot?.startTime)}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(apt.status)}`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          to={`/staff/appointments/${apt.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>
    </div>
  );
}
