import { useCallback, useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { isAxiosError } from 'axios';
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { http } from '@kebele/shared/lib/http';
import type { ApiEnvelope } from '@kebele/shared/lib/api';
import { Button } from '@kebele/shared/components/ui/button';
import { Input } from '@kebele/shared/components/ui/input';
import { Label } from '@kebele/shared/components/ui/label';
import { Checkbox } from '@kebele/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kebele/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kebele/shared/components/ui/dialog';
import {
  FORM_FIELD_TYPES,
  parseFieldOptions,
  type FormFieldType,
  type ServiceFormFieldDef,
} from '@kebele/shared/features/kebele/formTypes';

type ServiceRow = { id: number; name: string };

const DND_TYPE = 'FORM_FIELD';

type FieldDraft = {
  label: string;
  fieldType: FormFieldType;
  placeholder: string;
  required: boolean;
  optionsText: string;
};

function emptyDraft(): FieldDraft {
  return {
    label: '',
    fieldType: 'text',
    placeholder: '',
    required: false,
    optionsText: '',
  };
}

function DraggableFieldRow({
  field,
  index,
  move,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  field: ServiceFormFieldDef;
  index: number;
  move: (from: number, to: number) => void;
  onEdit: (f: ServiceFormFieldDef) => void;
  onDelete: (f: ServiceFormFieldDef) => void;
  deleteDisabled?: boolean;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPE,
    item: { index },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: DND_TYPE,
    hover: (item: { index: number }) => {
      if (item.index === index) return;
      move(item.index, index);
      item.index = index;
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${isDragging ? 'opacity-50' : ''} ${
        field.isActive === false ? 'border-dashed opacity-60' : 'border-gray-200'
      }`}
    >
      <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800">{field.label}</p>
        <p className="text-xs text-gray-500">
          {field.fieldType}
          {field.required ? ' · required' : ''}
          {field.isActive === false ? ' · inactive' : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          title="Edit field"
          aria-label={`Edit ${field.label}`}
          onClick={() => onEdit(field)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          title="Delete field"
          aria-label={`Delete ${field.label}`}
          disabled={deleteDisabled}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
          onClick={() => onDelete(field)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ServiceFormBuilder() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [fields, setFields] = useState<ServiceFormFieldDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FieldDraft>(emptyDraft());

  const [deleteTarget, setDeleteTarget] = useState<ServiceFormFieldDef | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadServices = useCallback(async () => {
    const r = await http.get<ApiEnvelope<ServiceRow[]>>('/api/admin/services');
    if (r.data.success && r.data.data) setServices(r.data.data);
  }, []);

  const loadFields = useCallback(async (sid: number) => {
    setLoading(true);
    setError('');
    try {
      const r = await http.get<ApiEnvelope<{ service: ServiceRow; fields: ServiceFormFieldDef[] }>>(
        `/api/admin/services/${sid}/form-fields`
      );
      if (!r.data.success || !r.data.data) throw new Error(r.data.error || 'Failed');
      setFields(r.data.data.fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
    const pre = sessionStorage.getItem('formBuilderServiceId');
    if (pre) {
      setServiceId(Number(pre));
      sessionStorage.removeItem('formBuilderServiceId');
    }
  }, [loadServices]);

  useEffect(() => {
    if (serviceId === '') {
      setFields([]);
      return;
    }
    void loadFields(serviceId);
  }, [serviceId, loadFields]);

  const activeFields = fields.filter((f) => f.isActive !== false);

  const moveField = (from: number, to: number) => {
    setFields((prev) => {
      const act = prev.filter((f) => f.isActive !== false);
      const inactive = prev.filter((f) => f.isActive === false);
      const next = [...act];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return [...next, ...inactive];
    });
  };

  async function persistOrder() {
    if (serviceId === '') return;
    const orderedIds = activeFields.map((f) => f.id);
    await http.patch<ApiEnvelope<ServiceFormFieldDef[]>>('/api/admin/form-fields/reorder', {
      serviceId,
      orderedIds,
    });
  }

  async function saveOrder() {
    if (serviceId === '') return;
    setSaving(true);
    setError('');
    try {
      await persistOrder();
      if (serviceId !== '') await loadFields(serviceId);
      setMessage('Field order saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder failed');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setShowEditor(true);
  }

  function openEdit(f: ServiceFormFieldDef) {
    setEditingId(f.id);
    setDraft({
      label: f.label,
      fieldType: f.fieldType as FormFieldType,
      placeholder: f.placeholder ?? '',
      required: f.required,
      optionsText: parseFieldOptions(f.options).join(', '),
    });
    setShowEditor(true);
  }

  async function saveField() {
    if (!draft.label.trim()) {
      setError('Label is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        label: draft.label.trim(),
        fieldType: draft.fieldType,
        placeholder: draft.placeholder || null,
        required: draft.required,
        options:
          draft.fieldType === 'select' || draft.fieldType === 'radio'
            ? draft.optionsText
            : undefined,
      };

      if (editingId != null) {
        await http.put(`/api/admin/form-fields/${editingId}`, body);
        setMessage('Field updated');
      } else if (serviceId !== '') {
        await http.post(`/api/admin/services/${serviceId}/form-fields`, body);
        setMessage('Field created');
      }

      if (serviceId !== '') await loadFields(serviceId);
      if (editingId != null) {
        setShowEditor(false);
      } else {
        setDraft(emptyDraft());
        setEditingId(null);
        setMessage('Field saved. Add another field or click Done when finished.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(field: ServiceFormFieldDef) {
    setDeleteError('');
    setDeleteTarget(field);
  }

  async function confirmDeleteField() {
    if (!deleteTarget) return;
    const fieldId = deleteTarget.id;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const r = await http.delete<ApiEnvelope<ServiceFormFieldDef>>(`/api/admin/form-fields/${fieldId}`);
      if (!r.data.success) {
        throw new Error(r.data.error || 'Failed to delete form field');
      }
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, isActive: false } : f))
      );
      if (editingId === fieldId) {
        setShowEditor(false);
        setEditingId(null);
        setDraft(emptyDraft());
      }
      setDeleteTarget(null);
      toast.success('Form field deleted successfully.');
    } catch (e) {
      const msg = isAxiosError(e)
        ? ((e.response?.data as ApiEnvelope | undefined)?.error ?? e.message)
        : e instanceof Error
          ? e.message
          : 'Failed to delete form field';
      const status = isAxiosError(e) ? e.response?.status : undefined;
      if (status === 404 || /not found/i.test(msg)) {
        setFields((prev) => prev.filter((f) => f.id !== fieldId));
        setDeleteTarget(null);
        toast.error('This form field no longer exists.');
      } else {
        setDeleteError(msg);
        toast.error(msg);
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">Form builder</h2>
        <p className="text-sm text-gray-600">
          Define custom fields per service. Residents see them when booking; answers are stored per field.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{message}</div>
      ) : null}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <Label>Service</Label>
        <Select
          value={serviceId === '' ? '' : String(serviceId)}
          onValueChange={(v) => {
            setServiceId(v ? Number(v) : '');
            setMessage('');
          }}
        >
          <SelectTrigger className="mt-1 max-w-md">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {serviceId !== '' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-medium text-gray-800">Fields ({activeFields.length} active)</h3>
            <div className="flex gap-2">
              {activeFields.length > 1 ? (
                <Button type="button" variant="outline" disabled={saving} onClick={() => void saveOrder()}>
                  Save order
                </Button>
              ) : null}
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Add field
              </Button>
            </div>
          </div>

          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-2">
                {activeFields.map((f, i) => (
                  <DraggableFieldRow
                    key={f.id}
                    field={f}
                    index={i}
                    move={moveField}
                    onEdit={openEdit}
                    onDelete={openDeleteConfirm}
                    deleteDisabled={deleteBusy}
                  />
                ))}
              </div>
            </DndProvider>
          )}

          {!loading && activeFields.length === 0 ? (
            <p className="text-sm text-gray-500">No active fields. Add fields residents must complete when booking.</p>
          ) : null}

          {fields.some((f) => f.isActive === false) ? (
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-600">Inactive fields (hidden from new bookings)</h4>
              <ul className="space-y-1 text-sm text-gray-500">
                {fields
                  .filter((f) => f.isActive === false)
                  .map((f) => (
                    <li key={f.id}>
                      {f.label} ({f.fieldType})
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!deleteBusy && !open) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Form Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form field? This action cannot be undone.
              {deleteTarget ? (
                <span className="mt-2 block font-medium text-gray-800">{deleteTarget.label}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-red-600" role="alert">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDeleteField()}
            >
              {deleteBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditor}
        onOpenChange={(open) => {
          if (!saving) setShowEditor(open);
        }}
      >
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editingId != null ? 'Edit form field' : 'Add form field'}</DialogTitle>
            <DialogDescription>
              {editingId != null
                ? 'Update this field. Existing appointment answers are preserved.'
                : 'Configure a field for the booking form. Save to add more fields without closing.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-2 max-h-[min(60vh,520px)] overflow-y-auto">
            <div>
              <Label>Label</Label>
              <Input
                className="mt-1"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Full name"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={draft.fieldType}
                onValueChange={(v) => setDraft((d) => ({ ...d, fieldType: v as FormFieldType }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  {FORM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Placeholder (optional)</Label>
              <Input
                className="mt-1"
                value={draft.placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.required}
                onCheckedChange={(c) => setDraft((d) => ({ ...d, required: Boolean(c) }))}
              />
              Required
            </label>
            {(draft.fieldType === 'select' || draft.fieldType === 'radio') && (
              <div>
                <Label>Options (comma-separated)</Label>
                <Input
                  className="mt-1"
                  value={draft.optionsText}
                  onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
                  placeholder="Male, Female"
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50/80 flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setShowEditor(false)}>
              {editingId != null ? 'Cancel' : 'Done'}
            </Button>
            <div className="flex flex-wrap gap-2 justify-end">
              {editingId == null ? (
                <Button type="button" variant="outline" disabled={saving} onClick={() => void saveField()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add another field'}
                </Button>
              ) : null}
              <Button type="button" disabled={saving} onClick={() => void saveField()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId != null ? (
                  'Save changes'
                ) : (
                  'Save field'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
