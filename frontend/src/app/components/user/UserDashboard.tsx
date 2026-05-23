import { useNavigate } from 'react-router';
import { Calendar, Clock, CheckCircle, Bell, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { getResidentPhone } from '../../../lib/auth';

type Apt = {
  id: number;
  appointmentNumber: string;
  status: string;
  service?: { name: string };
  timeSlot?: { date?: string; startTime?: string };
};

export function UserDashboard() {
  const navigate = useNavigate();
  const [list, setList] = useState<Apt[]>([]);

  useEffect(() => {
    const ph = getResidentPhone()?.trim();
    if (!ph) return;
    void (async () => {
      const { res, body } = await apiFetch(
        `/api/resident/my-appointments?phone=${encodeURIComponent(ph)}`,
        { skipAuth: true }
      );
      if (res.ok && body?.success && Array.isArray(body.data)) {
        setList(body.data as Apt[]);
      }
    })();
  }, []);

  const upcomingAppointments = list
    .filter((a) => (a.status || '').toUpperCase() === 'PENDING')
    .slice(0, 6)
    .map((apt) => ({
      id: String(apt.id),
      title: apt.service?.name ?? 'Service',
      ref: apt.appointmentNumber,
      date: apt.timeSlot?.date ? new Date(apt.timeSlot.date).toLocaleDateString() : '—',
      time: apt.timeSlot?.startTime
        ? new Date(apt.timeSlot.startTime).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    }));

  const pendingCount = list.filter((a) => (a.status || '').toUpperCase() === 'PENDING').length;
  const completedCount = list.filter((a) => (a.status || '').toUpperCase() === 'COMPLETED').length;

  const notifications = [
    {
      id: 1,
      message:
        'Resident bookings use /api/user/*. Save your phone in My appointments to load summaries here.',
      time: '',
      read: false,
    },
    {
      id: 2,
      message: 'Staff/admins authenticate with JWT via /login/admin or /login/staff.',
      time: '',
      read: true,
    },
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
          <p className="text-3xl text-gray-800 mb-1">{pendingCount}</p>
          <p className="text-sm text-gray-600">Upcoming Appointments</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl text-gray-800 mb-1">{completedCount}</p>
          <p className="text-sm text-gray-600">Completed Appointments</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-3xl text-gray-800 mb-1">{pendingCount}</p>
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
                      <h4 className="text-gray-800 mb-1">{apt.title}</h4>
                      <p className="text-sm text-gray-500">Ref: {apt.ref}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                      Pending
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
