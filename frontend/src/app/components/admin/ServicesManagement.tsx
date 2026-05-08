import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch, apiJson } from '../../../lib/api';

type Department = { id: number; name: string };
type ServiceRow = {
  id: number;
  name: string;
  description?: string | null;
  durationInMinutes: number;
  staffCount: number;
  department?: { id: number; name: string };
};

export function ServicesManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [serviceForm, setServiceForm] = useState({
    departmentId: '' as number | '',
    name: '',
    description: '',
    durationInMinutes: '30',
    staffCount: '3',
    hasTeyazeRequirement: false,
    requiredDocuments: '',
  });

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [depts, svcs] = await Promise.all([
        apiJson<Department[]>('/api/admin/departments'),
        apiJson<ServiceRow[]>('/api/admin/services'),
      ]);
      setDepartments(depts);
      setServices(svcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  async function submitDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await apiFetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName.trim() }),
      }).then(async ({ res, body }) => {
        if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      });
      setNewDeptName('');
      setShowDeptModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department');
    }
  }

  async function submitService(e: React.FormEvent) {
    e.preventDefault();
    if (serviceForm.departmentId === '') return;
    try {
      const payload = {
        name: serviceForm.name.trim(),
        description: serviceForm.description || undefined,
        durationInMinutes: Number(serviceForm.durationInMinutes),
        staffCount: Number(serviceForm.staffCount),
        hasTeyazeRequirement: serviceForm.hasTeyazeRequirement,
        requiredDocuments: serviceForm.requiredDocuments || undefined,
        departmentId: serviceForm.departmentId,
      };
      await apiFetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async ({ res, body }) => {
        if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      });
      setShowServiceModal(false);
      setServiceForm({
        departmentId: '',
        name: '',
        description: '',
        durationInMinutes: '30',
        staffCount: '3',
        hasTeyazeRequirement: false,
        requiredDocuments: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create service');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Services management</h2>
          <p className="text-gray-600 text-sm">Loaded from backend (departments &amp; services)</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDeptModal(true)}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Add department
          </button>
          <button
            type="button"
            onClick={() => setShowServiceModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add service
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg text-gray-800 mb-1">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm text-gray-600">
              <span>{service.department?.name ?? '—'}</span>
              <span>
                {service.durationInMinutes} min · staff capacity {service.staffCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!loading && services.length === 0 ? (
        <p className="text-sm text-gray-500">
          No services yet. Create a department, then add services.
        </p>
      ) : null}

      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-800">New department</h3>
              <button type="button" onClick={() => setShowDeptModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={submitDepartment} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg">
                Create
              </button>
            </form>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-800">New service</h3>
              <button type="button" onClick={() => setShowServiceModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={submitService} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Department</label>
                <select
                  required
                  value={serviceForm.departmentId === '' ? '' : String(serviceForm.departmentId)}
                  onChange={(e) =>
                    setServiceForm((s) => ({ ...s, departmentId: e.target.value ? Number(e.target.value) : '' }))
                  }
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
                <label className="block text-sm text-gray-700 mb-1">Service name</label>
                <input
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((s) => ({ ...s, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Duration (min)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={serviceForm.durationInMinutes}
                    onChange={(e) => setServiceForm((s) => ({ ...s, durationInMinutes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Staff slots</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={serviceForm.staffCount}
                    onChange={(e) => setServiceForm((s) => ({ ...s, staffCount: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={serviceForm.hasTeyazeRequirement}
                  onChange={(e) => setServiceForm((s) => ({ ...s, hasTeyazeRequirement: e.target.checked }))}
                />
                Teyazo required
              </label>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Required documents note (optional)</label>
                <input
                  value={serviceForm.requiredDocuments}
                  onChange={(e) => setServiceForm((s) => ({ ...s, requiredDocuments: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg">
                Create service
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
