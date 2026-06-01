import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, Eye, Search } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { http } from '../../../lib/http';
import { appendDateFilters, type DatePreset } from '../../../lib/dateFilters';
import { DEFAULT_PAGE_LIMIT, parsePaginatedBody, type PaginationMeta } from '../../../lib/pagination';
import { PaginationBar } from '../ui/PaginationBar';
import { TableSkeleton } from '../ui/ListSkeleton';

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

type Dept = { id: number; name: string };
type Svc = { id: number; name: string; departmentId: number };

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

  const [departments, setDepartments] = useState<Dept[]>([]);
  const [services, setServices] = useState<Svc[]>([]);

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [status, setStatus] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [slotDate, setSlotDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [residentName, setResidentName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentNumber, setAppointmentNumber] = useState('');

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(DEFAULT_PAGE_LIMIT));
    if (search.trim()) q.set('search', search.trim());
    if (departmentId) q.set('departmentId', departmentId);
    if (serviceId) q.set('serviceId', serviceId);
    if (status) q.set('status', status);
    appendDateFilters(q, {
      datePreset,
      slotDate: datePreset === '' && slotDate ? slotDate : undefined,
      dateFrom: datePreset === '' && !slotDate ? dateFrom : undefined,
      dateTo: datePreset === '' && !slotDate ? dateTo : undefined,
    });
    if (residentName.trim()) q.set('residentName', residentName.trim());
    if (phone.trim()) q.set('phone', phone.trim());
    if (appointmentNumber.trim()) q.set('appointmentNumber', appointmentNumber.trim());
    return q.toString();
  }, [
    page,
    search,
    departmentId,
    serviceId,
    status,
    datePreset,
    slotDate,
    dateFrom,
    dateTo,
    residentName,
    phone,
    appointmentNumber,
  ]);

  const loadMeta = useCallback(async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        http.get<{ success: boolean; data: Dept[] }>('/api/admin/departments'),
        http.get<{ success: boolean; data: Svc[] }>('/api/admin/services'),
      ]);
      if (dRes.data.success && dRes.data.data) setDepartments(dRes.data.data);
      if (sRes.data.success && sRes.data.data) setServices(sRes.data.data);
    } catch {
      /* optional */
    }
  }, []);

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
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const filteredServices = departmentId
    ? services.filter((s) => String(s.departmentId) === departmentId)
    : services;

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
        <p className="text-sm text-gray-600">Full system visibility — not restricted by department</p>
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

      <form
        onSubmit={applyFilters}
        className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Search appointment #, name, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setServiceId('');
          }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">All services</option>
          {filteredServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_SERVED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={datePreset}
          onChange={(e) => {
            const v = e.target.value as DatePreset;
            setDatePreset(v);
            if (v) {
              setSlotDate('');
              setDateFrom('');
              setDateTo('');
            }
          }}
        >
          <option value="">Custom date range</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <input
          type="date"
          title="Single appointment date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          value={slotDate}
          disabled={!!datePreset}
          onChange={(e) => {
            setSlotDate(e.target.value);
            setDateFrom('');
            setDateTo('');
          }}
        />
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          value={dateFrom}
          disabled={!!datePreset || !!slotDate}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          value={dateTo}
          disabled={!!datePreset || !!slotDate}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Resident name"
          value={residentName}
          onChange={(e) => setResidentName(e.target.value)}
        />
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Appointment #"
          value={appointmentNumber}
          onChange={(e) => setAppointmentNumber(e.target.value)}
        />
      </form>

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
                          to={`/admin/appointments/${row.id}`}
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
        <PaginationBar
          pagination={pagination}
          loading={loading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
