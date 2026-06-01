import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { managementRoutes } from '@/lib/routes';
import { Calendar, Eye, Search } from 'lucide-react';
import { apiFetch } from '@kebele/shared/lib/api';
import { DEFAULT_PAGE_LIMIT, parsePaginatedBody, type PaginationMeta } from '@kebele/shared/lib/pagination';
import { PaginationBar } from '@kebele/shared/components/ui/PaginationBar';
import { TableSkeleton } from '@kebele/shared/components/ui/ListSkeleton';

type Stats = {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  rescheduledAppointments: number;
  todayAppointments: number;
  thisMonthAppointments: number;
};

type Row = {
  id: number;
  appointmentNumber: string;
  residentName: string;
  phone: string;
  serviceName: string;
  departmentName: string;
  status: string;
  timeSlot?: { date?: string; startTime?: string; endTime?: string };
  createdAt: string;
};

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

function fmtTime(iso?: string) {
  return iso
    ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function AdminAppointments() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, slotDate, status]);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(DEFAULT_PAGE_LIMIT));
    if (debouncedSearch) q.set('search', debouncedSearch);
    if (slotDate) q.set('slotDate', slotDate);
    if (status) q.set('status', status);
    return q.toString();
  }, [page, debouncedSearch, slotDate, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, listRes] = await Promise.all([
        apiFetch('/api/admin/appointments/stats'),
        apiFetch(`/api/admin/appointments?${queryString}`),
      ]);
      if (statsRes.body?.success && statsRes.body.data) {
        setStats(statsRes.body.data as Stats);
      }
      if (!listRes.res.ok || !listRes.body?.success) {
        throw new Error((listRes.body as { error?: string })?.error || 'Failed to load appointments');
      }
      const { items: rows, pagination: meta } = parsePaginatedBody<Row>(
        listRes.body as { success?: boolean; data?: Row[]; pagination?: PaginationMeta }
      );
      setItems(rows);
      setPagination(meta);
      setPage(meta.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const statCards = stats
    ? [
        { label: 'Total', value: stats.totalAppointments },
        { label: 'Pending', value: stats.pendingAppointments },
        { label: 'Completed', value: stats.completedAppointments },
        { label: 'Cancelled', value: stats.cancelledAppointments },
        { label: 'Rescheduled', value: stats.rescheduledAppointments },
        { label: 'Today', value: stats.todayAppointments },
        { label: 'This month', value: stats.thisMonthAppointments },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800 flex items-center gap-2">
          <Calendar className="h-6 w-6" /> All appointments
        </h2>
      </div>

      {statCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search appointment</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Appointment #, name, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by date</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={slotDate}
            onChange={(e) => setSlotDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {['PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_SERVED'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-600">Appointment #</th>
                  <th className="text-left py-3 px-4 text-gray-600">Resident</th>
                  <th className="text-left py-3 px-4 text-gray-600">Phone</th>
                  <th className="text-left py-3 px-4 text-gray-600">Service</th>
                  <th className="text-left py-3 px-4 text-gray-600">Department</th>
                  <th className="text-left py-3 px-4 text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600">Created</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{row.appointmentNumber}</td>
                      <td className="py-3 px-4">{row.residentName}</td>
                      <td className="py-3 px-4">{row.phone}</td>
                      <td className="py-3 px-4">{row.serviceName}</td>
                      <td className="py-3 px-4">{row.departmentName}</td>
                      <td className="py-3 px-4">{fmtDate(row.timeSlot?.date)}</td>
                      <td className="py-3 px-4">{fmtTime(row.timeSlot?.startTime)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{row.status}</span>
                      </td>
                      <td className="py-3 px-4">{fmtDate(row.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={managementRoutes.admin.appointment(row.id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Eye className="h-4 w-4" /> View
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
