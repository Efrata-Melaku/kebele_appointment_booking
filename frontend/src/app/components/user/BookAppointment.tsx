import { useEffect, useState } from 'react';
import { Calendar, User, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { apiFetch, apiJson } from '../../../lib/api';

type Department = { id: number; name: string };
type Service = { id: number; name: string; departmentId: number };
type Slot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
};

export function BookAppointment() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [lastNumber, setLastNumber] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [timeSlotId, setTimeSlotId] = useState<number | ''>('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const dept = await apiJson<Department[]>('/api/user/departments', { skipAuth: true });
        setDepartments(dept);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load departments');
      }
    })();
  }, []);

  useEffect(() => {
    if (departmentId === '') return;
    (async () => {
      try {
        const list = await apiJson<Service[]>(`/api/user/services/${departmentId}`, { skipAuth: true });
        setServices(list);
        setServiceId('');
        setTimeSlotId('');
        setSlots([]);
      } catch {
        setServices([]);
      }
    })();
  }, [departmentId]);

  useEffect(() => {
    if (serviceId === '' || !dateStr) {
      setSlots([]);
      setTimeSlotId('');
      return;
    }
    (async () => {
      try {
        const list = await apiJson<Slot[]>(`/api/user/timeslots/${serviceId}/${dateStr}`, {
          skipAuth: true,
        });
        setSlots(list);
        setTimeSlotId('');
      } catch {
        setSlots([]);
      }
    })();
  }, [serviceId, dateStr]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (serviceId === '' || timeSlotId === '') {
      setError('Select service and time slot');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('fullName', fullName.trim());
      fd.append('phone', phone.trim());
      fd.append('gender', gender);
      fd.append('serviceId', String(serviceId));
      fd.append('timeSlotId', String(timeSlotId));
      if (file) fd.append('document', file);

      const { res, body } = await apiFetch('/api/user/appointments', {
        method: 'POST',
        skipAuth: true,
        body: fd,
      });
      if (!res.ok || !body?.success) {
        throw new Error((body as { error?: string })?.error || 'Booking failed');
      }
      const data = body.data as { appointmentNumber?: string };
      setLastNumber(data?.appointmentNumber ?? null);
      setSubmitted(true);
      setTimeout(() => navigate('/user/appointments'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl text-gray-800 mb-2">Appointment booked</h2>
          {lastNumber ? (
            <p className="text-gray-800 font-medium mb-2">Reference: {lastNumber}</p>
          ) : null}
          <p className="text-gray-600 mb-6">Redirecting to your appointments…</p>
          <button
            type="button"
            onClick={() => navigate('/user/appointments')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            View my appointments
          </button>
        </div>
      </div>
    );
  }

  const formatRange = (s: Slot) =>
    `${new Date(s.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${new Date(
      s.endTime
    ).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Book an appointment</h2>
        <p className="text-gray-600 text-sm">Connected to the Kebele API</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg text-gray-800">Personal information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Full name *</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Phone *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Gender *</label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg text-gray-800">Service & slot</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Department *</label>
                <select
                  required
                  value={departmentId === '' ? '' : String(departmentId)}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Service *</label>
                <select
                  required
                  value={serviceId === '' ? '' : String(serviceId)}
                  onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  disabled={departmentId === ''}
                >
                  <option value="">Select</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Appointment date *</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Time slot *</label>
                <select
                  required
                  value={timeSlotId === '' ? '' : String(timeSlotId)}
                  onChange={(e) => setTimeSlotId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  disabled={slots.length === 0}
                >
                  <option value="">{slots.length ? 'Choose slot' : 'No slots (generate as admin)'}</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatRange(s)} — {s.bookedCount}/{s.maxCapacity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Supporting document</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm text-blue-800 mb-1">Required documents</h4>
              <p className="text-sm text-blue-700">
                Attach what your service lists in the admin portal. Accepted: PDF/images/DOC/DOCX.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="flex-1 px-6 py-2 border border-gray-200 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Book appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
