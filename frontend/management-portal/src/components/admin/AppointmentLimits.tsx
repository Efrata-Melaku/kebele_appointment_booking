import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { managementRoutes } from '@/lib/routes';
import { apiJson } from '@kebele/shared/lib/api';

type ServiceRow = { id: number; name: string; departmentId: number };
type SlotPreview = {
  start: string;
  end: string;
  available: boolean;
  remainingCapacity: number;
  bookedCount: number;
  maxCapacity: number;
};

/** Slots are computed dynamically from staff count, service duration, and schedule templates. */
export function AppointmentLimits() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<SlotPreview[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const svcs = await apiJson<ServiceRow[]>('/api/admin/services');
        setServices(svcs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      }
    })();
  }, []);

  async function loadPreview(e: React.FormEvent) {
    e.preventDefault();
    if (serviceId === '') {
      setError('Select a service');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const slots = await apiJson<SlotPreview[]>(
        `/api/admin/timeslots/preview?serviceId=${serviceId}&date=${encodeURIComponent(date)}`
      );
      setPreview(slots);
    } catch (err) {
      setPreview([]);
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Automatic scheduling</h2>
        <p className="text-gray-600 text-sm">
          Slots are generated in memory when residents book. Only appointments and schedule templates are stored in the
          database.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 mb-1">How capacity works</p>
          <p className="text-sm text-blue-700">
            Each time window allows up to the number of staff assigned to the service. Lunch break and working days come
            from the default weekly template. Per-day exceptions are configured under{' '}
            <button type="button" className="underline font-medium" onClick={() => navigate(managementRoutes.admin.schedule)}>
              Schedule &amp; special days
            </button>
            .
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={loadPreview} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="text-lg text-gray-800">Preview slots for a day</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Service</label>
            <select
              required
              value={serviceId === '' ? '' : String(serviceId)}
              onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border rounded-lg"
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
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Preview'}
        </button>
      </form>

      {preview.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
            <table className="w-full min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 whitespace-nowrap">Start</th>
                  <th className="px-4 py-2 whitespace-nowrap">End</th>
                  <th className="px-4 py-2 whitespace-nowrap">Booked</th>
                  <th className="px-4 py-2 whitespace-nowrap">Capacity</th>
                  <th className="px-4 py-2 whitespace-nowrap">Remaining</th>
                  <th className="px-4 py-2 whitespace-nowrap">Available</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((s) => (
                  <tr key={s.start} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{s.start}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.end}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.bookedCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.maxCapacity}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.remainingCapacity}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.available ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
