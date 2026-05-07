import { Download, Calendar, TrendingUp, Users, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Reports() {
  const monthlyData = [
    { month: 'Jan', appointments: 234, completed: 198, cancelled: 36 },
    { month: 'Feb', appointments: 267, completed: 231, cancelled: 36 },
    { month: 'Mar', appointments: 289, completed: 256, cancelled: 33 },
    { month: 'Apr', appointments: 312, completed: 278, cancelled: 34 },
    { month: 'May', appointments: 295, completed: 267, cancelled: 28 },
  ];

  const serviceDistribution = [
    { name: 'ID Card', value: 345, color: '#3b82f6' },
    { name: 'Birth Certificate', value: 234, color: '#10b981' },
    { name: 'Marriage Certificate', value: 189, color: '#f59e0b' },
    { name: 'Other', value: 129, color: '#8b5cf6' },
  ];

  const peakHours = [
    { hour: '8 AM', count: 12 },
    { hour: '9 AM', count: 28 },
    { hour: '10 AM', count: 45 },
    { hour: '11 AM', count: 52 },
    { hour: '12 PM', count: 38 },
    { hour: '1 PM', count: 24 },
    { hour: '2 PM', count: 41 },
    { hour: '3 PM', count: 36 },
    { hour: '4 PM', count: 29 },
    { hour: '5 PM', count: 18 },
  ];

  const stats = [
    { label: 'Total This Month', value: '295', icon: Calendar, color: 'bg-blue-500' },
    { label: 'Completion Rate', value: '90.5%', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Active Residents', value: '1,234', icon: Users, color: 'bg-purple-500' },
    { label: 'Avg. Wait Time', value: '18 min', icon: Clock, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Reports & Analytics</h2>
          <p className="text-gray-600 text-sm">View appointment statistics and trends</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
              <p className="text-3xl text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Monthly Appointment Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg mb-4 text-gray-800">Service Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg mb-4 text-gray-800">Peak Appointment Hours</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={peakHours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
