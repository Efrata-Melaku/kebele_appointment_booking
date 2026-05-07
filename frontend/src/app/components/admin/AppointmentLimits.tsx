import { Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function AppointmentLimits() {
  const [limits, setLimits] = useState({
    idCard: 30,
    birthCertificate: 20,
    marriageCertificate: 15,
    other: 10,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-800">Appointment Limits</h2>
        <p className="text-gray-600 text-sm">Set daily appointment limits for each service</p>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm text-blue-800 mb-1">About Daily Limits</h4>
          <p className="text-sm text-blue-700">
            These limits control how many appointments can be booked per day for each service type. Once the limit is reached, residents won't be able to book appointments for that service on that day.
          </p>
        </div>
      </div>

      {/* Limits Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg text-gray-800">Service Limits Configuration</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* ID Card */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex-1">
              <h4 className="text-gray-800 mb-1">ID Card Services</h4>
              <p className="text-sm text-gray-600">New ID cards and renewals</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={limits.idCard}
                onChange={(e) => setLimits({ ...limits, idCard: Number(e.target.value) })}
                className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                min="0"
              />
              <span className="text-gray-600 text-sm">appointments/day</span>
            </div>
          </div>

          {/* Birth Certificate */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex-1">
              <h4 className="text-gray-800 mb-1">Birth Certificate</h4>
              <p className="text-sm text-gray-600">Birth certificate applications and corrections</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={limits.birthCertificate}
                onChange={(e) => setLimits({ ...limits, birthCertificate: Number(e.target.value) })}
                className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                min="0"
              />
              <span className="text-gray-600 text-sm">appointments/day</span>
            </div>
          </div>

          {/* Marriage Certificate */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex-1">
              <h4 className="text-gray-800 mb-1">Marriage Certificate</h4>
              <p className="text-sm text-gray-600">Marriage registration and certificate issuance</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={limits.marriageCertificate}
                onChange={(e) => setLimits({ ...limits, marriageCertificate: Number(e.target.value) })}
                className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                min="0"
              />
              <span className="text-gray-600 text-sm">appointments/day</span>
            </div>
          </div>

          {/* Other Services */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-gray-800 mb-1">Other Services</h4>
              <p className="text-sm text-gray-600">General inquiries and other administrative tasks</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={limits.other}
                onChange={(e) => setLimits({ ...limits, other: Number(e.target.value) })}
                className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                min="0"
              />
              <span className="text-gray-600 text-sm">appointments/day</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end gap-3">
          <button className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-green-800">Appointment limits updated successfully!</p>
        </div>
      )}
    </div>
  );
}
