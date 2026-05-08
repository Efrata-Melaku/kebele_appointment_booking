import { Star, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Row = {
  id: number;
  rating?: number | null;
  comment?: string | null;
  createdAt: string;
  appointment?: {
    appointmentNumber?: string;
    resident?: { fullName?: string };
    service?: { name?: string };
  };
};

export function Feedback() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { res, body } = await apiFetch('/api/admin/feedback');
        if (!res.ok || !body?.success || !Array.isArray(body.data)) {
          throw new Error((body as { error?: string })?.error || 'Failed');
        }
        setRows(body.data as Row[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avg = useMemo(() => {
    const rated = rows.filter((r) => r.rating != null && r.rating > 0);
    if (!rated.length) return 0;
    return rated.reduce((a, r) => a + (r.rating || 0), 0) / rated.length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Feedback &amp; reviews</h2>
        <p className="text-gray-600 text-sm">From GET /api/admin/feedback</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="text-4xl text-gray-800">{avg.toFixed(1)}</div>
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-1">{rows.length} responses</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-600">Resident</th>
                <th className="text-left py-3 px-4 text-gray-600">Appointment</th>
                <th className="text-left py-3 px-4 text-gray-600">Service</th>
                <th className="text-left py-3 px-4 text-gray-600">Rating</th>
                <th className="text-left py-3 px-4 text-gray-600">Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No feedback yet
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">{r.appointment?.resident?.fullName ?? '—'}</td>
                    <td className="py-3 px-4">{r.appointment?.appointmentNumber ?? '—'}</td>
                    <td className="py-3 px-4">{r.appointment?.service?.name ?? '—'}</td>
                    <td className="py-3 px-4">{r.rating ?? '—'}</td>
                    <td className="py-3 px-4 max-w-xs truncate">{r.comment || '—'}</td>
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
