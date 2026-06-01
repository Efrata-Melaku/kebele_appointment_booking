import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { DEFAULT_PAGE_LIMIT, parsePaginatedBody, type PaginationMeta } from '../../../lib/pagination';
import { PaginationBar } from '../ui/PaginationBar';
import { TableSkeleton } from '../ui/ListSkeleton';

type ResidentRow = {
  id: number;
  name: string;
  idNumber?: string | null;
  phone: string;
  email?: string;
  address?: string | null;
  registered: string;
  appointments: number;
};

export function HouseownerRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(DEFAULT_PAGE_LIMIT));
    if (debouncedSearch) q.set('search', debouncedSearch);
    return q.toString();
  }, [page, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/admin/residents?${queryString}`);
      if (!res.ok || !body?.success) {
        throw new Error((body as { error?: string })?.error || 'Failed to load residents');
      }
      const { items, pagination: meta } = parsePaginatedBody<ResidentRow>(
        body as { success?: boolean; data?: ResidentRow[]; pagination?: PaginationMeta }
      );
      setResidents(items);
      setPagination(meta);
      setPage(meta.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Houseowner Records</h2>
        <p className="text-gray-600 text-sm">Registered residents who have booked appointments</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Name</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Kebele ID</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Phone</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Email</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">House #</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Registered</th>
                  <th className="text-left py-4 px-6 text-sm text-gray-600">Appointments</th>
                </tr>
              </thead>
              <tbody>
                {residents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No residents found
                    </td>
                  </tr>
                ) : (
                  residents.map((resident) => (
                    <tr key={resident.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm text-gray-800">{resident.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{resident.idNumber || '—'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{resident.phone}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{resident.email || '—'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{resident.address || '—'}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(resident.registered).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{resident.appointments}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>
    </div>
  );
}
