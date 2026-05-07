import { useState } from 'react';
import { Edit, Trash2, MessageSquare, X, Star } from 'lucide-react';

export function MyAppointments() {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [rating, setRating] = useState(0);

  const appointments = [
    { id: 'APT-001', service: 'ID Card', date: '2024-05-05', time: '10:00 AM', status: 'Confirmed', canFeedback: false },
    { id: 'APT-002', service: 'Birth Certificate', date: '2024-05-08', time: '02:00 PM', status: 'Pending', canFeedback: false },
    { id: 'APT-003', service: 'Marriage Certificate', date: '2024-04-25', time: '11:00 AM', status: 'Completed', canFeedback: true },
    { id: 'APT-004', service: 'ID Card', date: '2024-04-20', time: '09:30 AM', status: 'Completed', canFeedback: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-800">My Appointments</h2>
        <p className="text-gray-600 text-sm">View and manage your appointments</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">All</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Upcoming</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Completed</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Cancelled</button>
        </div>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {appointments.map((apt) => (
          <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg text-gray-800 mb-1">{apt.service}</h3>
                  <p className="text-sm text-gray-500">ID: {apt.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  apt.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                  apt.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {apt.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>📅</span>
                  <span>{apt.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🕐</span>
                  <span>{apt.time}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApt(apt);
                        setShowCancelModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
                {apt.canFeedback && (
                  <button
                    onClick={() => {
                      setSelectedApt(apt);
                      setShowFeedbackModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Feedback
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-gray-800">Cancel Appointment</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700"><strong>Service:</strong> {selectedApt?.service}</p>
              <p className="text-sm text-gray-700"><strong>Date:</strong> {selectedApt?.date}</p>
              <p className="text-sm text-gray-700"><strong>Time:</strong> {selectedApt?.time}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-gray-800">Leave Feedback</h3>
              <button onClick={() => {
                setShowFeedbackModal(false);
                setRating(0);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-3">How was your experience?</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2">Comments</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Share your experience with us..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setRating(0);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setRating(0);
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
