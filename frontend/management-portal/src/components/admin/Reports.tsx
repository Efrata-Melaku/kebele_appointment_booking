import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Building2,
  Briefcase,
  Loader2,
  FileSpreadsheet,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiJson } from '@kebele/shared/lib/api';
import type { DatePreset, FullReport } from '@kebele/shared/features/reports/reportTypes';
import { exportReportCsv, exportReportPdf } from '@kebele/shared/features/reports/exportReport';
import { Button } from '@kebele/shared/components/ui/button';
import { Input } from '@kebele/shared/components/ui/input';
import { statusLabel } from '@kebele/shared/lib/staffAppointmentStatus';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

function buildQuery(preset: DatePreset, dateFrom: string, dateTo: string) {
  const params = new URLSearchParams();
  if (preset === 'custom') {
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
  } else if (preset !== 'all') {
    params.set('datePreset', preset);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-500 py-16 text-center">{message}</p>
  );
}

export function Reports() {
  const [preset, setPreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (preset === 'custom' && !dateFrom && !dateTo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<FullReport>(`/api/admin/reports${buildQuery(preset, dateFrom, dateTo)}`);
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [preset, dateFrom, dateTo]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), preset === 'custom' ? 400 : 0);
    return () => window.clearTimeout(t);
  }, [load, preset]);

  const overview = report?.overview;
  const statusChart = useMemo(
    () =>
      (report?.appointmentsByStatus ?? []).filter((r) => r.count > 0).map((r) => ({
        name: statusLabel(r.status),
        value: r.count,
        color: r.color,
      })),
    [report]
  );

  const stats = overview
    ? [
        { label: 'Total appointments', value: String(overview.totalAppointments), icon: Calendar, color: 'bg-blue-500' },
        { label: 'Completed', value: String(overview.completedAppointments), icon: TrendingUp, color: 'bg-green-500' },
        { label: 'Pending', value: String(overview.pendingAppointments), icon: Calendar, color: 'bg-amber-500' },
        { label: 'Completion rate', value: `${overview.completionRate}%`, icon: TrendingUp, color: 'bg-teal-500' },
        { label: 'Residents', value: String(overview.totalResidents), icon: Users, color: 'bg-purple-500' },
        { label: 'Services', value: String(overview.totalServices), icon: Briefcase, color: 'bg-indigo-500' },
        { label: 'Staff', value: String(overview.totalStaff), icon: UserCheck, color: 'bg-orange-500' },
        { label: 'Departments', value: String(overview.totalDepartments), icon: Building2, color: 'bg-slate-500' },
      ]
    : [];

  const statusExtras = overview
    ? [
        { label: 'Rescheduled', value: overview.rescheduledAppointments },
        { label: 'Cancelled', value: overview.cancelledAppointments },
        { label: 'Not served', value: overview.notServedAppointments },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Reports &amp; Analytics</h2>
          <p className="text-gray-600 text-sm">
            Live data from your database
            {report?.filters.label ? ` · ${report.filters.label}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!report || loading}
            className="gap-2"
            onClick={() => report && exportReportCsv(report)}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!report || loading}
            className="gap-2"
            onClick={() => report && exportReportPdf(report)}
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-700">Date range</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                preset === p.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' ? (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button type="button" size="sm" onClick={() => void load()}>
              Apply
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading reports…
        </div>
      ) : !report ? (
        <EmptyChart message="No report data available." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-gray-600 text-xs mb-0.5">{stat.label}</h3>
                  <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {statusExtras.map((s) => (
              <span key={s.label} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                <strong className="text-gray-800">{s.value}</strong> {s.label}
              </span>
            ))}
            <span className="bg-white border border-gray-100 rounded-lg px-3 py-2">
              <strong className="text-gray-800">{report.periodSummaries.allTimeTotal}</strong> all-time appointments
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Appointment status distribution</h3>
              {statusChart.length === 0 ? (
                <EmptyChart message="No appointments in this period." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {statusChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Service usage</h3>
              {report.appointmentsByService.length === 0 ? (
                <EmptyChart message="No service data in this period." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report.appointmentsByService.slice(0, 10)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#888" />
                    <YAxis type="category" dataKey="serviceName" width={100} tick={{ fontSize: 11 }} stroke="#888" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Appointment trends</h3>
              {report.trends.length === 0 ? (
                <EmptyChart message="No trend data for this period." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={report.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" stroke="#888" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#888" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Department statistics</h3>
              {report.appointmentsByDepartment.length === 0 ? (
                <EmptyChart message="No department data in this period." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report.appointmentsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="departmentName" stroke="#888" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#888" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg mb-4 text-gray-800">Peak appointment hours</h3>
            {report.peakHours.length === 0 ? (
              <EmptyChart message="No hourly data in this period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" stroke="#888" />
                  <YAxis stroke="#888" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Most requested services</h3>
              {report.serviceUtilization.mostRequested.length === 0 ? (
                <EmptyChart message="No services in this period." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Service</th>
                      <th className="py-2">Dept</th>
                      <th className="py-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.serviceUtilization.mostRequested.map((r) => (
                      <tr key={r.serviceId} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800">{r.serviceName}</td>
                        <td className="py-2 text-gray-500">{r.departmentName}</td>
                        <td className="py-2 text-right font-medium">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg mb-4 text-gray-800">Least requested services</h3>
              {report.serviceUtilization.leastRequested.length === 0 ? (
                <EmptyChart message="No services in this period." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Service</th>
                      <th className="py-2">Dept</th>
                      <th className="py-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.serviceUtilization.leastRequested.map((r) => (
                      <tr key={r.serviceId} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800">{r.serviceName}</td>
                        <td className="py-2 text-gray-500">{r.departmentName}</td>
                        <td className="py-2 text-right font-medium">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg mb-4 text-gray-800">Staff workload</h3>
            {report.staffWorkload.length === 0 ? (
              <EmptyChart message="No staff status updates in this period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">Staff member</th>
                      <th className="py-2 pr-4 text-right">Completed</th>
                      <th className="py-2 text-right">Status updates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.staffWorkload.map((r) => (
                      <tr key={r.staffId} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800">{r.staffName}</td>
                        <td className="py-2 text-right font-medium">{r.completedCount}</td>
                        <td className="py-2 text-right text-gray-600">{r.totalHandled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ResponsiveContainer width="100%" height={240} className="mt-6">
                  <BarChart data={report.staffWorkload}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="staffName" tick={{ fontSize: 11 }} stroke="#888" />
                    <YAxis stroke="#888" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completedCount" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalHandled" name="All updates" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
