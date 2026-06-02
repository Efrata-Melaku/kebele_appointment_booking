import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { http } from '@kebele/shared/lib/http';
import type { ApiEnvelope } from '@kebele/shared/lib/api';
import { Button } from '@kebele/shared/components/ui/button';

type DepartmentRow = {
  id: number;
  name: string;
  createdAt: string;
};

function apiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function AdminDepartments() {
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState<DepartmentRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);

  const nameRequiredError = useMemo(() => {
    return editOpen && editName.trim().length === 0 ? 'Department name is required.' : '';
  }, [editOpen, editName]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await http.get<ApiEnvelope<DepartmentRow[]>>('/api/departments');
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to load departments');
      }
      setRows(res.data.data);
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load departments'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  function openEdit(row: DepartmentRow) {
    setEditTarget(row);
    setEditName(row.name);
    setEditError('');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Department name is required.');
      return;
    }
    setEditBusy(true);
    setEditError('');
    try {
      const res = await http.put<ApiEnvelope<DepartmentRow>>(`/api/departments/${editTarget.id}`, {
        name: trimmed,
      });
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to update department');
      }
      setEditOpen(false);
      setEditTarget(null);
      toast.success('Department updated successfully.');
      await loadDepartments();
    } catch (err) {
      const msg = apiErrorMessage(err, 'Failed to update department');
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditBusy(false);
    }
  }

  function openDelete(row: DepartmentRow) {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const res = await http.delete<ApiEnvelope>(`/api/departments/${deleteTarget.id}`);
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to delete department');
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast.success('Department deleted successfully.');
      await loadDepartments();
    } catch (err) {
      const raw = apiErrorMessage(err, 'Failed to delete department');
      const msg = raw.includes('related records')
        ? 'Cannot delete department because it contains services or assigned staff.'
        : raw;
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Department Management</h2>
        <p className="text-sm text-gray-600">Manage departments only.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading departments...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[680px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm text-gray-600 whitespace-nowrap">Department ID</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600 whitespace-nowrap">Department Name</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600 whitespace-nowrap">Created Date</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-sm text-gray-500">
                    No departments found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="py-3 px-4 text-sm whitespace-nowrap">{row.id}</td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">{row.name}</td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                      {new Date(row.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(row)}
                          disabled={editBusy || deleteBusy}
                          className="gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => openDelete(row)}
                          disabled={editBusy || deleteBusy}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl text-gray-800">Edit Department</h3>
              <button
                type="button"
                className="rounded p-1 hover:bg-gray-100"
                onClick={() => {
                  if (!editBusy) setEditOpen(false);
                }}
                disabled={editBusy}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={editBusy}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            {nameRequiredError ? <p className="mt-2 text-sm text-red-600">{nameRequiredError}</p> : null}
            {editError ? <p className="mt-2 text-sm text-red-600">{editError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editBusy}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveEdit()} disabled={editBusy || !!nameRequiredError}>
                {editBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900">Delete Department?</h3>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete this department?
            </p>
            {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy}
              >
                {deleteBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
