import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, X, Pencil } from 'lucide-react';
import { apiFetch, apiJson } from '../../../lib/api';

type Department = { id: number; name: string };
type ServiceRow = { id: number; name: string; departmentId: number };

type StaffMember = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  departmentId?: number | null;
  isActive?: boolean;
  department?: { id: number; name: string } | null;
  staffServiceAssignments?: { service: { id: number; name: string } }[];
  createdAt?: string;
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  departmentId: '' as number | '',
  serviceIds: [] as number[],
};

export function ManageStaff() {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [{ res, body }, depts, svcs] = await Promise.all([
        apiFetch('/api/admin/staff'),
        apiJson<Department[]>('/api/admin/departments'),
        apiJson<ServiceRow[]>('/api/admin/services'),
      ]);
      setDepartments(depts);
      setServices(svcs);
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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial only
  }, []);

  function toggleService(id: number) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.departmentId === '' || form.serviceIds.length === 0) {
      setError('Department and at least one service are required');
      return;
    }
    try {
      const { res, body } = await apiFetch('/api/admin/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          departmentId: form.departmentId,
          serviceIds: form.serviceIds,
        }),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add staff');
    }
  }

  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (form.departmentId === '' || form.serviceIds.length === 0) {
      setError('Department and at least one service are required');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        departmentId: form.departmentId,
        serviceIds: form.serviceIds,
      };
      if (form.password.trim()) payload.password = form.password;

      const { res, body } = await apiFetch(`/api/admin/staff/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    setError('');
  }

  async function openEdit(member: StaffMember) {
    setError('');
    setEditId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      phone: member.phone ?? '',
      departmentId: member.departmentId ?? '',
      serviceIds: member.staffServiceAssignments?.map((a) => a.service.id) ?? [],
    });
    setShowModal(true);
    try {
      const detail = await apiJson<StaffMember>(`/api/admin/staff/${member.id}`);
      setForm({
        name: detail.name,
        email: detail.email,
        password: '',
        phone: detail.phone ?? '',
        departmentId: detail.departmentId ?? '',
        serviceIds: detail.staffServiceAssignments?.map((a) => a.service.id) ?? [],
      });
    } catch {
      /* keep list data */
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

  const filteredServices =
    form.departmentId === '' ? services : services.filter((s) => s.departmentId === form.departmentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Manage staff</h2>
          <p className="text-gray-600 text-sm">
            Each staff member has full name, email, phone, password, department, and one or more assigned services.
            Slot capacity follows these assignments automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditId(null);
            setForm(emptyForm);
            setShowModal(true);
          }}
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
                <th className="text-left py-4 px-6 text-sm text-gray-600">Department</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Services</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    {loading ? '' : 'No staff'}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-800">{member.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.email}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.phone || '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{member.department?.name ?? '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 max-w-xs">
                      {member.staffServiceAssignments?.length
                        ? member.staffServiceAssignments.map((a) => a.service.name).join(', ')
                        : '—'}
                    </td>
                    <td className="py-4 px-6 flex gap-1">
                      <button
                        type="button"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                        onClick={() => void openEdit(member)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-800">{editId ? 'Edit staff' : 'Add staff member'}</h3>
              <button type="button" onClick={closeModal}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={editId ? submitUpdate : submitCreate}>
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
                required={!editId}
                type="password"
                minLength={6}
                placeholder={editId ? 'New password (leave blank to keep)' : 'Password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                required
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <div>
                <label className="block text-sm text-gray-700 mb-1">Department *</label>
                <select
                  required
                  value={form.departmentId === '' ? '' : String(form.departmentId)}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : '';
                    setForm((f) => ({ ...f, departmentId: v, serviceIds: [] }));
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Assigned services *</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {filteredServices.length === 0 ? (
                    <p className="text-sm text-gray-500">Select a department first.</p>
                  ) : (
                    filteredServices.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.serviceIds.includes(s.id)}
                          onChange={() => toggleService(s.id)}
                        />
                        {s.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg">
                  {editId ? 'Save changes' : 'Register'}
                </button>
                <button type="button" className="flex-1 py-2 border rounded-lg" onClick={closeModal}>
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
