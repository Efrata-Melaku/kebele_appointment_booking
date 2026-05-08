import { Calendar, CheckCircle, Clock, Users, TrendingUp, UserPlus, Settings, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { apiJson } from '../../../lib/api';

type Overview = {
  totalDepartments: number;
  totalServices: number;
  totalStaff: number;
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  todayAppointments: number;
};

type DeptStat = {
  department: string;
  services: number;
  appointments: number;
};

type RecentApt = {
  id: number;
  appointmentNumber: string;
  status: string;
  resident?: { fullName: string };
  service?: { name: string; department?: { name: string } };
  timeSlot?: { date: string; startTime: string };
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<RecentApt[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{
          overview: Overview;
          recentAppointments: RecentApt[];
          departmentStats: DeptStat[];
        }>('/api/admin/dashboard');
        if (cancelled) return;
        setOverview(data.overview);
        setRecent(data.recentAppointments ?? []);
        setDeptStats(data.departmentStats ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = overview
    ? [
        {
          label: 'Total Appointments',
          value: String(overview.totalAppointments),
          change: '+',
          icon: Calendar,
          color: 'bg-blue-500',
        },
        {
          label: "Today's Appointments",
          value: String(overview.todayAppointments),
          change: '+',
          icon: Clock,
          color: 'bg-green-500',
        },
        {
          label: 'Completed',
          value: String(overview.completedAppointments),
          change: '+',
          icon: CheckCircle,
          color: 'bg-purple-500',
        },
        {
          label: 'Total Staff',
          value: String(overview.totalStaff),
          change: '+',
          icon: Users,
          color: 'bg-orange-500',
        },
      ]
    : [];

  const chartData = deptStats.map((d) => ({
    name: d.department.slice(0, 12),
    appointments: d.appointments,
  }));

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickActions = [
    {
      label: 'Add Staff',
      icon: UserPlus,
      color: 'bg-blue-500',
      onClick: () => navigate('/admin/staff'),
    },
    {
      label: 'Generate slots',
      icon: Settings,
      color: 'bg-green-500',
      onClick: () => navigate('/admin/limits'),
    },
    {
      label: 'Manage services',
      icon: FileText,
      color: 'bg-purple-500',
      onClick: () => navigate('/admin/services'),
    },
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  —
                </span>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
              <p className="text-3xl text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Appointments by department</h3>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Bar dataKey="appointments" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Department breakdown</h3>
          <div className="space-y-4 max-h-[280px] overflow-y-auto">
            {deptStats.length === 0 ? (
              <p className="text-sm text-gray-500">No departments yet.</p>
            ) : (
              deptStats.map((item) => {
                const max = Math.max(...deptStats.map((x) => x.appointments), 1);
                const pct = Math.round((item.appointments / max) * 100);
                return (
                  <div key={item.department}>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-700 truncate pr-2">{item.department}</span>
                      <span className="text-gray-600 shrink-0">{item.appointments}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Recent appointments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Service</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td className="py-8 px-4 text-sm text-gray-500" colSpan={5}>
                      No appointments yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((apt) => (
                    <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{apt.appointmentNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">{apt.resident?.fullName ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{apt.service?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatTime(apt.timeSlot?.startTime)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Quick actions</h3>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                >
                  <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-800">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
