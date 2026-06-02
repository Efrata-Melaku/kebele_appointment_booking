import { Calendar, CheckCircle, Clock, Users, TrendingUp, UserPlus, Settings, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { managementRoutes } from '@/lib/routes';
import { apiJson } from '@kebele/shared/lib/api';

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

const statusStyles: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
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
    return () => { cancelled = true; };
  }, []);

  const stats = overview
    ? [
        { label: 'Total Appointments', value: overview.totalAppointments, icon: Calendar,     accent: '#3b82f6', bg: 'from-blue-50 to-blue-100/60' },
        { label: "Today's",            value: overview.todayAppointments,  icon: Clock,        accent: '#10b981', bg: 'from-emerald-50 to-emerald-100/60' },
        { label: 'Completed',          value: overview.completedAppointments, icon: CheckCircle, accent: '#8b5cf6', bg: 'from-violet-50 to-violet-100/60' },
        { label: 'Total Staff',        value: overview.totalStaff,         icon: Users,        accent: '#f59e0b', bg: 'from-amber-50 to-amber-100/60' },
      ]
    : [];

  const chartData = deptStats.map((d) => ({
    name: d.department.slice(0, 12),
    appointments: d.appointments,
  }));

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = [
    { label: 'Add Staff',          icon: UserPlus,  color: '#3b82f6', onClick: () => navigate(managementRoutes.admin.staff) },
    { label: 'Bulk slot sync',     icon: Calendar,  color: '#10b981', onClick: () => navigate(managementRoutes.admin.limits) },
    { label: 'Schedule overrides', icon: Settings,  color: '#0d9488', onClick: () => navigate(managementRoutes.admin.schedule) },
    { label: 'Manage services',    icon: FileText,  color: '#8b5cf6', onClick: () => navigate(managementRoutes.admin.services) },
  ];

  return (
    <div
      className="space-y-6"
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .bento-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .bento-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);
        }
        .stat-card {
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          opacity: 0.5;
        }
        .quick-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.05);
          background: #fafafa;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
          text-align: left;
        }
        .quick-btn:hover {
          background: #f3f4f6;
          border-color: rgba(0,0,0,0.08);
          transform: translateX(2px);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-transform: capitalize;
        }
        .dept-bar-track {
          height: 6px;
          background: #f0f1f5;
          border-radius: 999px;
          overflow: hidden;
        }
        .dept-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 16px;
        }
        tr:last-child td { border-bottom: none !important; }
      `}</style>

      {/* Page header */}
      <div className="mb-8">
        <p className="section-label" style={{ marginBottom: 4 }}>Overview</p>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>
          Admin Dashboard
        </h1>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">

        {/* ── Stat cards (row 1, cols 1-4) ── */}
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bento-card stat-card"
              style={{ padding: '24px 24px 20px' }}
            >
              {/* Decorative circle */}
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 90, height: 90, borderRadius: '50%',
                background: stat.accent, opacity: 0.07,
              }} />
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: stat.accent + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Icon size={18} color={stat.accent} strokeWidth={2} />
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontSize: 32, fontWeight: 600, color: '#111827', letterSpacing: '-0.03em', fontFamily: "'DM Mono', monospace" }}>
                {stat.value}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <TrendingUp size={12} color={stat.accent} />
                <span style={{ fontSize: 11, color: stat.accent, fontWeight: 500 }}>—</span>
              </div>
            </div>
          );
        })}

        {/* ── Bar chart (row 2, cols 1-2) ── */}
        <div className="bento-card lg:col-span-2 2xl:col-span-2" style={{ padding: '28px' }}>
          <p className="section-label">Appointments by Department</p>
          {chartData.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 13 }}>
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12, fontFamily: 'DM Sans' }}
                />
                <Bar dataKey="appointments" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Department breakdown (row 2, cols 3-4) ── */}
        <div className="bento-card lg:col-span-2 2xl:col-span-2" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <p className="section-label">Department Breakdown</p>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {deptStats.length === 0 ? (
              <p style={{ fontSize: 13, color: '#d1d5db' }}>No departments yet.</p>
            ) : (
              deptStats.map((item) => {
                const max = Math.max(...deptStats.map((x) => x.appointments), 1);
                const pct = Math.round((item.appointments / max) * 100);
                return (
                  <div key={item.department}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{item.department}</span>
                      <span style={{ fontSize: 12, color: '#6b7280', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{item.appointments}</span>
                    </div>
                    <div className="dept-bar-track">
                      <div className="dept-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Recent appointments (row 3, cols 1-3) ── */}
        <div className="bento-card lg:col-span-2 2xl:col-span-3" style={{ padding: '28px' }}>
          <p className="section-label">Recent Appointments</p>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Resident', 'Service', 'Time', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0 12px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 12px', fontSize: 13, color: '#d1d5db', textAlign: 'center' }}>No appointments yet.</td>
                  </tr>
                ) : (
                  recent.map((apt) => {
                    const statusKey = apt.status?.toLowerCase() ?? '';
                    const badgeClass = statusStyles[statusKey] ?? 'bg-gray-100 text-gray-600';
                    return (
                      <tr key={apt.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '13px 12px', fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#374151', whiteSpace: 'nowrap' }}>{apt.appointmentNumber}</td>
                        <td style={{ padding: '13px 12px', fontSize: 13, color: '#111827', fontWeight: 500, whiteSpace: 'nowrap' }}>{apt.resident?.fullName ?? '—'}</td>
                        <td style={{ padding: '13px 12px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{apt.service?.name ?? '—'}</td>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#6b7280', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>{formatTime(apt.timeSlot?.startTime)}</td>
                        <td style={{ padding: '13px 12px' }}>
                          <span className={`status-badge ${badgeClass}`}>{apt.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quick actions (row 3, col 4) ── */}
        <div className="bento-card lg:col-span-2 2xl:col-span-1" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <p className="section-label">Quick Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" onClick={action.onClick} className="quick-btn">
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: action.color + '14',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={action.color} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}