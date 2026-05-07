import { useNavigate } from 'react-router';
import { Calendar, Clock, CheckCircle, Bell, Plus } from 'lucide-react';

export function UserDashboard() {
  const navigate = useNavigate();

  const upcomingAppointments = [
    { id: 'APT-001', service: 'ID Card', date: '2024-05-05', time: '10:00 AM', status: 'Confirmed' },
    { id: 'APT-002', service: 'Birth Certificate', date: '2024-05-08', time: '02:00 PM', status: 'Pending' },
  ];

  const notifications = [
    { id: 1, message: 'Your ID Card appointment is confirmed for May 5, 2024 at 10:00 AM', time: '2 hours ago', read: false },
    { id: 2, message: 'Please bring required documents for your Birth Certificate appointment', time: '1 day ago', read: false },
    { id: 3, message: 'Your feedback has been received. Thank you!', time: '3 days ago', read: true },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-white">
        <h2 className="text-2xl mb-2">Welcome back!</h2>
        <p className="text-blue-100 mb-6">Manage your appointments and services easily</p>
        <button
          onClick={() => navigate('/user/book')}
          className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Book New Appointment
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-3xl text-gray-800 mb-1">2</p>
          <p className="text-sm text-gray-600">Upcoming Appointments</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl text-gray-800 mb-1">5</p>
          <p className="text-sm text-gray-600">Completed Appointments</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-3xl text-gray-800 mb-1">1</p>
          <p className="text-sm text-gray-600">Pending Approval</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg text-gray-800">Upcoming Appointments</h3>
            <button
              onClick={() => navigate('/user/appointments')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="p-6 space-y-4">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming appointments</p>
                <button
                  onClick={() => navigate('/user/book')}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Book your first appointment
                </button>
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div key={apt.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-gray-800 mb-1">{apt.service}</h4>
                      <p className="text-sm text-gray-500">Appointment ID: {apt.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {apt.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {apt.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg text-gray-800">Notifications</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 mb-1">{notif.message}</p>
                    <p className="text-xs text-gray-500">{notif.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button className="w-full text-sm text-blue-600 hover:text-blue-700">
              View All Notifications
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/user/book')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-gray-800 mb-1">Book Appointment</h3>
          <p className="text-sm text-gray-600">Schedule a new appointment</p>
        </button>

        <button
          onClick={() => navigate('/user/appointments')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-gray-800 mb-1">My Appointments</h3>
          <p className="text-sm text-gray-600">View and manage appointments</p>
        </button>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-gray-800 mb-1">Give Feedback</h3>
          <p className="text-sm text-gray-600">Share your experience</p>
        </div>
      </div>
    </div>
  );
}
