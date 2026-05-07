import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Filter, Calendar } from 'lucide-react';

export function StaffDashboard() {
  const [filterStatus, setFilterStatus] = useState('all');

  const appointments = [
    { id: 'APT-001', name: 'Abebe Kebede', service: 'ID Card', time: '09:00 AM', date: '2024-05-03', status: 'Pending' },
    { id: 'APT-002', name: 'Tigist Haile', service: 'Birth Certificate', time: '09:30 AM', date: '2024-05-03', status: 'In Progress' },
    { id: 'APT-003', name: 'Mulugeta Assefa', service: 'Marriage Certificate', time: '10:00 AM', date: '2024-05-03', status: 'Pending' },
    { id: 'APT-004', name: 'Sara Mohammed', service: 'ID Card', time: '10:30 AM', date: '2024-05-03', status: 'Completed' },
    { id: 'APT-005', name: 'Yohannes Desta', service: 'Birth Certificate', time: '11:00 AM', date: '2024-05-03', status: 'Pending' },
    { id: 'APT-006', name: 'Meron Yosef', service: 'ID Card', time: '02:00 PM', date: '2024-05-03', status: 'Pending' },
  ];

  const filteredAppointments = filterStatus === 'all'
    ? appointments
    : appointments.filter(apt => apt.status.toLowerCase() === filterStatus);

  const stats = [
    { label: 'Today', count: 6, color: 'bg-blue-500' },
    { label: 'Pending', count: 4, color: 'bg-yellow-500' },
    { label: 'Completed', count: 1, color: 'bg-green-500' },
    { label: 'In Progress', count: 1, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-800">My Appointments</h2>
        <p className="text-gray-600 text-sm">Manage your assigned appointments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`${stat.color} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl text-gray-800 mb-1">{stat.count}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('in progress')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'in progress' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Appointment ID</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Resident Name</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Service</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Date</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Time</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Status</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No appointments found for this filter
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-800">{apt.id}</td>
                    <td className="py-4 px-6 text-sm text-gray-800">{apt.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.service}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.date}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{apt.time}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'In Progress' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {apt.status !== 'Completed' && (
                          <>
                            <button
                              title="Mark as Completed"
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Reschedule"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              title="Cancel"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {apt.status === 'Completed' && (
                          <span className="text-sm text-gray-500 px-2">No actions</span>
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
