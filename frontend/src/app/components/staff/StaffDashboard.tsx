import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Search } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { statusBadgeClass, statusLabel, type StaffStatusTarget } from '../../../lib/staffAppointmentStatus';
import { DEFAULT_PAGE_LIMIT, parsePaginatedBody, type PaginationMeta } from '../../../lib/pagination';
import { PaginationBar } from '../ui/PaginationBar';
import { TableSkeleton } from '../ui/ListSkeleton';
import { StaffAppointmentViewModal } from './StaffAppointmentViewModal';
import { StaffStatusUpdateModal } from './StaffStatusUpdateModal';
import { toStaffStatusTarget } from './staffStatusTarget';

type Apt = {
  id: number;
  serviceId?: number;
  appointmentNumber: string;
  status: string;
  residentName?: string;
  phone?: string;
  serviceName?: string;
  departmentName?: string;
  resident?: { fullName: string; phone?: string };
  service?: { name: string; department?: { name: string } };
  timeSlot?: { date: string; startTime: string };
};

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: 'not_served', label: 'Not served' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

export function StaffDashboard() {
  const [appointments, setAppointments] = useState<Apt[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StaffStatusTarget | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(DEFAULT_PAGE_LIMIT));
    if (filter !== 'all') q.set('status', filter);
    if (debouncedSearch) q.set('search', debouncedSearch);
    return q.toString();
  }, [page, filter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/staff/appointments?${queryString}`);
      if (!res.ok || !body?.success) {
        const msg = (body as { error?: string })?.error;
        if (res.status === 401 || res.status === 403) {
          throw new Error(msg || 'You are not authorized to view appointments');
        }
        throw new Error(msg || 'Unable to load appointments');
      }
      const { items, pagination: meta } = parsePaginatedBody<Apt>(
        body as { success?: boolean; data?: Apt[]; pagination?: PaginationMeta }
      );
      setAppointments(items);
      setPagination(meta);
      setPage(meta.page);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to load appointments. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');
  const formatTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  function residentName(apt: Apt) {
    return apt.residentName || apt.resident?.fullName || '—';
  }

  function residentPhone(apt: Apt) {
    return apt.phone || apt.resident?.phone || '—';
  }

  function serviceLabel(apt: Apt) {
    return apt.serviceName || apt.service?.name || '—';
  }

  function departmentLabel(apt: Apt) {
    return apt.departmentName || apt.service?.department?.name || '—';
  }

  function openDetails(id: number) {
    setDetailId(id);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Appointments</h2>
        <p className="text-gray-600 text-sm">Appointments for services you are assigned to</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Appointment #, resident name, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

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

      {loading && appointments.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">Loading appointments…</div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error.includes('load') ? error : 'Unable to load appointments. Please try again.'}
          <button type="button" className="ml-3 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Appointment #</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Resident</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Phone</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Service</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Department</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Date</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Time</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm font-mono">{apt.appointmentNumber}</td>
                      <td className="py-4 px-6 text-sm">{residentName(apt)}</td>
                      <td className="py-4 px-6 text-sm">{residentPhone(apt)}</td>
                      <td className="py-4 px-6 text-sm">{serviceLabel(apt)}</td>
                      <td className="py-4 px-6 text-sm">{departmentLabel(apt)}</td>
                      <td className="py-4 px-6 text-sm">{formatDate(apt.timeSlot?.date)}</td>
                      <td className="py-4 px-6 text-sm">{formatTime(apt.timeSlot?.startTime)}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(apt.status)}`}
                        >
                          {statusLabel(apt.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="View details"
                            aria-label="View details"
                            onClick={() => openDetails(apt.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Change status"
                            aria-label="Change status"
                            disabled={!toStaffStatusTarget(apt)}
                            onClick={() => {
                              const t = toStaffStatusTarget(apt);
                              if (t) setStatusTarget(t);
                            }}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
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

      <StaffAppointmentViewModal
        appointmentId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusUpdated={() => void load()}
      />

      <StaffStatusUpdateModal
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        target={statusTarget}
        onUpdated={() => void load()}
      />
    </div>
  );
}
