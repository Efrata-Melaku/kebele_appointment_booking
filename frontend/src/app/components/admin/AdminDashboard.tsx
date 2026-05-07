import { Calendar, CheckCircle, Clock, Users, TrendingUp, UserPlus, Settings, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AdminDashboard() {
  const stats = [
    { label: 'Total Appointments', value: '1,234', change: '+12%', icon: Calendar, color: 'bg-blue-500' },
    { label: "Today's Appointments", value: '47', change: '+5%', icon: Clock, color: 'bg-green-500' },
    { label: 'Completed', value: '892', change: '+8%', icon: CheckCircle, color: 'bg-purple-500' },
    { label: 'Total Staff', value: '24', change: '+2', icon: Users, color: 'bg-orange-500' },
  ];

  const chartData = [
    { name: 'Mon', appointments: 45 },
    { name: 'Tue', appointments: 52 },
    { name: 'Wed', appointments: 48 },
    { name: 'Thu', appointments: 61 },
    { name: 'Fri', appointments: 55 },
    { name: 'Sat', appointments: 38 },
    { name: 'Sun', appointments: 25 },
  ];

  const serviceData = [
    { service: 'ID Card', count: 145, percentage: 35 },
    { service: 'Birth Certificate', count: 98, percentage: 24 },
    { service: 'Marriage Certificate', count: 76, percentage: 18 },
    { service: 'Other', count: 95, percentage: 23 },
  ];

  const recentAppointments = [
    { id: 'APT-001', name: 'Abebe Kebede', service: 'ID Card', time: '09:00 AM', status: 'Completed' },
    { id: 'APT-002', name: 'Tigist Haile', service: 'Birth Certificate', time: '10:30 AM', status: 'Pending' },
    { id: 'APT-003', name: 'Mulugeta Assefa', service: 'Marriage Certificate', time: '11:00 AM', status: 'In Progress' },
    { id: 'APT-004', name: 'Sara Mohammed', service: 'ID Card', time: '02:00 PM', status: 'Pending' },
  ];

  const quickActions = [
    { label: 'Add Staff', icon: UserPlus, color: 'bg-blue-500' },
    { label: 'Set Limits', icon: Settings, color: 'bg-green-500' },
    { label: 'Generate Report', icon: FileText, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
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
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
              <p className="text-3xl text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Appointments Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Weekly Appointments</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Bar dataKey="appointments" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Service Distribution</h3>
          <div className="space-y-4">
            {serviceData.map((item) => (
              <div key={item.service}>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-700">{item.service}</span>
                  <span className="text-gray-600">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Recent Appointments</h3>
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
                {recentAppointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-800">{apt.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{apt.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.service}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{apt.time}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
