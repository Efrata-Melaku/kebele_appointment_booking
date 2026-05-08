import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch, apiJson } from '../../../lib/api';

type Department = { id: number; name: string };
type ServiceRow = { id: number; name: string; departmentId: number };

/** Generate booking slots — maps to POST /api/admin/timeslots/generate */
export function AppointmentLimits() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [depts, svcs] = await Promise.all([
          apiJson<Department[]>('/api/admin/departments'),
          apiJson<ServiceRow[]>('/api/admin/services'),
        ]);
        setDepartments(depts);
        setServices(svcs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      }
    })();
  }, []);

  const filteredServices = services.filter((s) =>
    departmentId === '' ? true : s.departmentId === departmentId
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (departmentId === '' || serviceId === '') {
      setError('Select department and service');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { res, body } = await apiFetch('/api/admin/timeslots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          serviceId,
          date,
          startTime,
          endTime,
        }),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      const slots = body.data as unknown[];
      setMessage(`${slots?.length ?? 0} slots created or deduplicated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Generate appointment slots</h2>
        <p className="text-gray-600 text-sm">Uses backend timeslot generator (daily capacity follows service staff count)</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 mb-1">How this works</p>
          <p className="text-sm text-blue-700">
            Choose department, service, date, and working hours (24h HH:MM). The API creates contiguous slots sized
            by the service duration. Max concurrent bookings per slot equal the service&apos;s staff count.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{message}</div>
      ) : null}

      <form onSubmit={handleGenerate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Department</label>
            <select
              required
              value={departmentId === '' ? '' : String(departmentId)}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : '';
                setDepartmentId(v);
                setServiceId('');
              }}
              className="w-full px-4 py-2 border rounded-lg"
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
            <label className="block text-sm text-gray-700 mb-1">Service</label>
            <select
              required
              value={serviceId === '' ? '' : String(serviceId)}
              onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border rounded-lg"
              disabled={departmentId === ''}
            >
              <option value="">Select</option>
              {filteredServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start (HH:MM)</label>
              <input
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">End (HH:MM)</label>
              <input
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate slots'}
        </button>
      </form>
    </div>
  );
}
