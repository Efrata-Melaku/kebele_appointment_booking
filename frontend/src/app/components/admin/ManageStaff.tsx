import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

type StaffMember = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  createdAt?: string;
};

export function ManageStaff() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  async function load() {
    setError('');
    setLoading(true);
    try {
      const { res, body } = await apiFetch('/api/admin/staff');
      if (!res.ok || !body?.success || !Array.isArray(body.data))
        throw new Error((body?.error as string) || 'Failed');
      setStaffList(body.data as StaffMember[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial only
  }, []);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { res, body } = await apiFetch('/api/admin/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
        }),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add staff');
    }
  }

  async function deleteStaff(id: number) {
    if (!confirm('Remove this staff user?')) return;
    try {
      const { res, body } = await apiFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const filtered = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Manage staff</h2>
          <p className="text-gray-600 text-sm">Register staff accounts on the backend</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
          Add staff
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Name</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Email</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Phone</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    {loading ? '' : 'No staff'}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-800">{member.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.email}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.phone || '—'}</td>
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => deleteStaff(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-800">Add staff member</h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={submitCreate}>
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg">
                  Register
                </button>
                <button type="button" className="flex-1 py-2 border rounded-lg" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
