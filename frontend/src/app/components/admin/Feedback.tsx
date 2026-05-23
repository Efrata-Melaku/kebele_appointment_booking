import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

type Row = {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

type Stats = {
  totalCount: number;
  averageRating: number;
  starCounts: Record<string, number>;
};

type Report = {
  highestRatedServices: { serviceName: string; averageRating: number; total: number }[];
  lowestRatedServices: { serviceName: string; averageRating: number; total: number }[];
};

export function Feedback() {
  const [items, setItems] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);

  const [rating, setRating] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', '20');
    if (rating) q.set('rating', rating);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    return q.toString();
  }, [page, rating, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes, reportRes] = await Promise.all([
        apiFetch(`/api/admin/feedback?${queryString}`),
        apiFetch(`/api/admin/feedback/stats?${queryString}`),
        apiFetch('/api/admin/feedback/reporting'),
      ]);
      if (!listRes.res.ok || !listRes.body?.success) {
        throw new Error((listRes.body as { error?: string })?.error || 'Failed to load');
      }
      const data = listRes.body.data as { items: Row[]; totalPages: number; page: number };
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? 1);
      if (statsRes.body?.success) setStats(statsRes.body.data as Stats);
      if (reportRes.body?.success) setReport(reportRes.body.data as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Anonymous feedback</h2>
        <p className="text-sm text-gray-600">
          Only ratings and comments are stored. Resident identity is not shown or saved with feedback.
        </p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500">Average rating</p>
            <p className="text-3xl font-semibold flex items-center gap-1 mt-1">
              {stats.averageRating.toFixed(1)}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalCount} responses</p>
          </div>
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">{n} stars</p>
              <p className="text-2xl font-semibold mt-1">{stats.starCounts[n] ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
        className="bg-white rounded-xl border p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} stars
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white rounded-lg text-sm py-2">
          Apply filters
        </button>
      </form>

      {report && report.highestRatedServices.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-gray-800 mb-2">Highest rated services</h3>
            <ul className="text-sm space-y-1">
              {report.highestRatedServices.map((s) => (
                <li key={s.serviceName} className="flex justify-between">
                  <span>{s.serviceName}</span>
                  <span className="text-gray-600">
                    {s.averageRating} ★ ({s.total})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium text-gray-800 mb-2">Lowest rated services</h3>
            <ul className="text-sm space-y-1">
              {report.lowestRatedServices.map((s) => (
                <li key={s.serviceName} className="flex justify-between">
                  <span>{s.serviceName}</span>
                  <span className="text-gray-600">
                    {s.averageRating} ★ ({s.total})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4">Rating</th>
                <th className="text-left py-3 px-4">Comment</th>
                <th className="text-left py-3 px-4">Submitted</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No feedback yet
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{r.rating}/5</td>
                    <td className="py-3 px-4 max-w-lg">{r.comment || '—'}</td>
                    <td className="py-3 px-4">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => setSelected(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1 border rounded disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 border rounded disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">Feedback</h3>
            <p className="text-sm text-gray-600 mb-4">Anonymous — no resident details</p>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-gray-500">Rating</dt>
                <dd className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${s <= selected.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Comment</dt>
                <dd className="whitespace-pre-wrap mt-1">{selected.comment || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="mt-6 w-full py-2 border rounded-lg"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
