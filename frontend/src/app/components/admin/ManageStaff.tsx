import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Search, X, Pencil } from 'lucide-react';
import { apiFetch, apiJson } from '../../../lib/api';
import { getApiErrorMessage } from '../../../lib/apiError';
import { fetchServicePickerOptions } from '../../../lib/servicePicker';
import {
  DEFAULT_PAGE_LIMIT,
  parsePaginatedBody,
  type PaginationMeta,
} from '../../../lib/pagination';
import {
  ETHIOPIAN_PHONE_MESSAGE,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from '../../../lib/ethiopianPhone';
import { PaginationBar } from '../ui/PaginationBar';
import { TableSkeleton } from '../ui/ListSkeleton';
import { ServiceCheckboxPicker } from '../ui/ServiceCheckboxPicker';
import { MODAL_BACKDROP_CLASS } from '../ui/modalStyles';
import type { ServiceWithDepartment } from '../../../lib/staffDepartment';

type Department = { id: number; name: string };
type ServiceRow = ServiceWithDepartment;

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 1,
  });

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

  const servicesForDepartment = useMemo(() => {
    if (form.departmentId === '') return [];
    const deptId = Number(form.departmentId);
    return services.filter((s) => s.departmentId === deptId);
  }, [services, form.departmentId]);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const svcs = await fetchServicePickerOptions();
      setServices(svcs);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const depts = await apiJson<Department[]>('/api/admin/departments');
      setDepartments(depts ?? []);
    } catch {
      setDepartments([]);
    }
  }, []);

  const load = useCallback(async () => {
    setListError('');
    setLoading(true);
    try {
      const listRes = await apiFetch(`/api/admin/staff?${queryString}`);
      if (!listRes.res.ok || !listRes.body?.success) {
        throw new Error(getApiErrorMessage(listRes.body, 'Failed to load staff'));
      }
      const { items, pagination: meta } = parsePaginatedBody<StaffMember>(
        listRes.body as { success?: boolean; data?: StaffMember[]; pagination?: PaginationMeta }
      );
      setStaffList(items);
      setPagination(meta);
      setPage(meta.page);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
    void loadServices();
    void loadDepartments();
  }, [load, loadServices, loadDepartments]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  function validateForm(): boolean {
    setFormError('');
    if (form.departmentId === '') {
      setFormError('Please select a department');
      return false;
    }
    if (form.serviceIds.length === 0) {
      setFormError('Select at least one service');
      return false;
    }
    if (!validatePhone()) return false;
    return true;
  }

  function validatePhone(): boolean {
    if (!isValidEthiopianPhone(form.phone)) {
      setPhoneError(ETHIOPIAN_PHONE_MESSAGE);
      return false;
    }
    setPhoneError('');
    return true;
  }

  function handleDepartmentChange(deptId: number | '') {
    setFormError('');
    setForm((f) => {
      const nextDept = deptId;
      const kept =
        nextDept === ''
          ? []
          : f.serviceIds.filter((sid) => {
              const svc = services.find((s) => s.id === sid);
              return svc?.departmentId === Number(nextDept);
            });
      return { ...f, departmentId: nextDept, serviceIds: kept };
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setFormError('');
    try {
      const { res, body } = await apiFetch('/api/admin/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: normalizeEthiopianPhone(form.phone),
          departmentId: Number(form.departmentId),
          serviceIds: form.serviceIds,
        }),
      });
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, 'Could not add staff'));
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add staff');
    }
  }

  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !validateForm()) return;
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: normalizeEthiopianPhone(form.phone),
        departmentId: Number(form.departmentId),
        serviceIds: form.serviceIds,
      };
      if (form.password.trim()) payload.password = form.password;

      const { res, body } = await apiFetch(`/api/admin/staff/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, 'Update failed'));
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setPhoneError('');
  }

  function openAddModal() {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setPhoneError('');
    setShowModal(true);
    void loadServices();
    void loadDepartments();
  }

  async function openEdit(member: StaffMember) {
    setFormError('');
    setPhoneError('');
    setEditId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      phone: member.phone ?? '',
      departmentId: member.departmentId ?? member.department?.id ?? '',
      serviceIds: member.staffServiceAssignments?.map((a) => a.service.id) ?? [],
    });
    setShowModal(true);
    void loadServices();
    void loadDepartments();
    try {
      const detail = await apiJson<StaffMember>(`/api/admin/staff/${member.id}`);
      setForm({
        name: detail.name,
        email: detail.email,
        password: '',
        phone: detail.phone ?? '',
        departmentId: detail.departmentId ?? detail.department?.id ?? '',
        serviceIds: detail.staffServiceAssignments?.map((a) => a.service.id) ?? [],
      });
    } catch {
      /* keep list data */
    }
  }

  async function deleteStaff(id: number) {
    if (!confirm('Remove this staff user?')) return;
    setListError('');
    try {
      const { res, body } = await apiFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, 'Delete failed'));
      }
      await load();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-gray-800">Manage staff</h2>
          <p className="text-gray-600 text-sm">
            Choose a department, assign services, and register staff for appointment handling.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
          Add staff
        </button>
      </div>

      {listError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {listError}
        </div>
      ) : null}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : (
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
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No staff found
                    </td>
                  </tr>
                ) : (
                  staffList.map((member) => (
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
        )}
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className={MODAL_BACKDROP_CLASS}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200 sm:max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-800">{editId ? 'Edit staff' : 'Add staff member'}</h3>
              <button type="button" onClick={closeModal} aria-label="Close">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={editId ? submitUpdate : submitCreate}>
              {formError ? (
                <div
                  className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => {
                  setFormError('');
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => {
                  setFormError('');
                  setForm((f) => ({ ...f, email: e.target.value }));
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <input
                required={!editId}
                type="password"
                minLength={6}
                placeholder={editId ? 'New password (leave blank to keep)' : 'Password'}
                value={form.password}
                onChange={(e) => {
                  setFormError('');
                  setForm((f) => ({ ...f, password: e.target.value }));
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
              <div>
                <input
                  required
                  type="tel"
                  placeholder="0912345678 or +251912345678"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }));
                    setPhoneError('');
                    setFormError('');
                  }}
                  onBlur={validatePhone}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
                {phoneError ? <p className="mt-1 text-xs text-red-600">{phoneError}</p> : null}
              </div>

              <div>
                <label htmlFor="staff-department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="staff-department"
                  required
                  value={form.departmentId === '' ? '' : String(form.departmentId)}
                  onChange={(e) => handleDepartmentChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <ServiceCheckboxPicker
                services={servicesForDepartment}
                value={form.serviceIds}
                loading={servicesLoading}
                disabled={form.departmentId === ''}
                onChange={(serviceIds) => {
                  setFormError('');
                  setForm((f) => ({ ...f, serviceIds }));
                }}
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
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
