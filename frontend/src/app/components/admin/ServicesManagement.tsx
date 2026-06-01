import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Plus, X, Loader2, ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import { http } from '../../../lib/http';
import type { ApiEnvelope } from '../../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

type Department = { id: number; name: string };
type ServiceRow = {
  id: number;
  name: string;
  description?: string | null;
  durationInMinutes: number;
  staffCount: number;
  department?: { id: number; name: string };
};

const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
] as const;

type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

type BuilderRow = {
  key: string;
  label: string;
  fieldType: FormFieldType;
  placeholder: string;
  required: boolean;
  optionsText: string;
};

const deptSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100, 'Max 100 characters'),
});

const serviceStep1Schema = z.object({
  departmentId: z.coerce.number().int().positive('Select a department'),
  name: z.string().min(2, 'At least 2 characters').max(100, 'Max 100 characters'),
  description: z.string().max(500).optional().or(z.literal('')),
  durationInMinutes: z.coerce.number().int().min(1).max(480),
  requiredDocuments: z.string().max(500).optional().or(z.literal('')),
});

type DeptForm = z.infer<typeof deptSchema>;
type ServiceStep1 = z.infer<typeof serviceStep1Schema>;

function newBuilderRow(): BuilderRow {
  return {
    key: crypto.randomUUID(),
    label: '',
    fieldType: 'text',
    placeholder: '',
    required: false,
    optionsText: '',
  };
}

function errMsg(e: unknown): string {
  if (isAxiosError(e)) {
    const d = e.response?.data as ApiEnvelope | undefined;
    if (d && typeof d.error === 'string') return d.error;
    return e.message;
  }
  return e instanceof Error ? e.message : 'Request failed';
}

export function ServicesManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [deptSuccess, setDeptSuccess] = useState('');
  const [svcSuccess, setSvcSuccess] = useState('');
  const [serviceWizardStep, setServiceWizardStep] = useState<1 | 2>(1);
  const [createdServiceId, setCreatedServiceId] = useState<number | null>(null);
  const [createdServiceName, setCreatedServiceName] = useState('');
  const [builderRows, setBuilderRows] = useState<BuilderRow[]>([newBuilderRow()]);
  const [fieldsSubmitting, setFieldsSubmitting] = useState(false);
  const [fieldsFormError, setFieldsFormError] = useState('');

  const deptDupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svcDupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deptDupMsg, setDeptDupMsg] = useState('');
  const [svcDupMsg, setSvcDupMsg] = useState('');

  const deptForm = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '' },
  });

  const svcForm = useForm<ServiceStep1>({
    resolver: zodResolver(serviceStep1Schema),
    defaultValues: {
      departmentId: 0,
      name: '',
      description: '',
      durationInMinutes: 30,
      requiredDocuments: '',
    },
  });

  const deptName = deptForm.watch('name');
  const svcDeptId = svcForm.watch('departmentId');
  const svcName = svcForm.watch('name');

  const load = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        http.get<ApiEnvelope<Department[]>>('/api/admin/departments'),
        http.get<ApiEnvelope<ServiceRow[]>>('/api/admin/services'),
      ]);
      if (!dRes.data.success || dRes.data.data == null) throw new Error(dRes.data.error || 'Departments failed');
      if (!sRes.data.success || sRes.data.data == null) throw new Error(sRes.data.error || 'Services failed');
      setDepartments(dRes.data.data);
      setServices(sRes.data.data);
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showDeptModal) return;
    const n = deptName.trim();
    setDeptDupMsg('');
    if (n.length < 2) return;
    if (deptDupTimer.current) clearTimeout(deptDupTimer.current);
    deptDupTimer.current = setTimeout(async () => {
      try {
        const r = await http.get<ApiEnvelope<{ exists: boolean }>>('/api/admin/departments/duplicate-check', {
          params: { name: n },
        });
        if (!r.data.success || !r.data.data) return;
        if (r.data.data.exists) {
          setDeptDupMsg('Department already exists');
        } else {
          setDeptDupMsg('');
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      if (deptDupTimer.current) clearTimeout(deptDupTimer.current);
    };
  }, [deptName, showDeptModal]);

  useEffect(() => {
    if (!showServiceModal || serviceWizardStep !== 1) return;
    const n = svcName.trim();
    const depId = svcDeptId;
    setSvcDupMsg('');
    if (!depId || n.length < 2) return;
    if (svcDupTimer.current) clearTimeout(svcDupTimer.current);
    svcDupTimer.current = setTimeout(async () => {
      try {
        const r = await http.get<ApiEnvelope<{ exists: boolean }>>('/api/admin/services/duplicate-check', {
          params: { departmentId: depId, name: n },
        });
        if (!r.data.success || !r.data.data) return;
        if (r.data.data.exists) {
          setSvcDupMsg('A service with this name already exists in the selected department');
        } else {
          setSvcDupMsg('');
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      if (svcDupTimer.current) clearTimeout(svcDupTimer.current);
    };
  }, [svcName, svcDeptId, showServiceModal, serviceWizardStep]);

  function resetDeptModal() {
    deptForm.reset({ name: '' });
    setDeptSuccess('');
    setDeptDupMsg('');
    setShowDeptModal(false);
  }

  function resetServiceModal() {
    svcForm.reset({
      departmentId: 0,
      name: '',
      description: '',
      durationInMinutes: 30,
      requiredDocuments: '',
    });
    setSvcSuccess('');
    setServiceWizardStep(1);
    setCreatedServiceId(null);
    setCreatedServiceName('');
    setBuilderRows([newBuilderRow()]);
    setFieldsFormError('');
    setSvcDupMsg('');
    setShowServiceModal(false);
  }

  async function onDeptSubmit(values: DeptForm) {
    if (deptDupMsg) {
      deptForm.setError('name', { type: 'manual', message: deptDupMsg });
      return;
    }
    setDeptSuccess('');
    try {
      const r = await http.post<ApiEnvelope<Department>>('/api/admin/departments', {
        name: values.name.trim(),
      });
      if (!r.data.success) throw new Error(r.data.error || 'Failed');
      setDeptSuccess('Department created successfully.');
      await load();
      deptForm.reset({ name: '' });
    } catch (e) {
      const m = errMsg(e);
      if (m.toLowerCase().includes('already exists')) {
        setDeptDupMsg('Department already exists');
      } else {
        deptForm.setError('root', { type: 'server', message: m });
      }
    }
  }

  async function onServiceStep1(values: ServiceStep1) {
    if (svcDupMsg) {
      svcForm.setError('name', { type: 'manual', message: svcDupMsg });
      return;
    }
    setSvcSuccess('');
    try {
      const r = await http.post<ApiEnvelope<ServiceRow>>('/api/admin/services', {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        durationInMinutes: values.durationInMinutes,
        requiredDocuments: values.requiredDocuments?.trim() || undefined,
        departmentId: values.departmentId,
      });
      if (!r.data.success || !r.data.data) throw new Error(r.data.error || 'Failed');
      const created = r.data.data;
      setCreatedServiceId(created.id);
      setCreatedServiceName(created.name);
      setServiceWizardStep(2);
      setBuilderRows([newBuilderRow()]);
      setSvcSuccess('Service created. Configure the appointment form below (optional).');
      await load();
    } catch (e) {
      const m = errMsg(e);
      if (m.toLowerCase().includes('already exists')) {
        setSvcDupMsg('A service with this name already exists in the selected department');
      } else {
        svcForm.setError('root', { type: 'server', message: m });
      }
    }
  }

  async function submitFormFields() {
    if (!createdServiceId) return;
    setFieldsFormError('');
    const trimmed = builderRows
      .map((row, idx) => ({
        ...row,
        idx,
        label: row.label.trim(),
        placeholder: row.placeholder.trim(),
      }))
      .filter((row) => row.label.length > 0);

    for (let i = 0; i < trimmed.length; i += 1) {
      const row = trimmed[i];
      if (row.fieldType === 'select' || row.fieldType === 'radio') {
        const opts = row.optionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (opts.length < 2) {
          setFieldsFormError(`Row ${i + 1} (“${row.label}”): select and radio need at least two options (comma-separated).`);
          return;
        }
      }
    }

    const payload = {
      fields: trimmed.map((row, order) => {
        const base = {
          label: row.label,
          fieldType: row.fieldType,
          placeholder: row.placeholder || undefined,
          required: row.required,
          order,
        };
        if (row.fieldType === 'select' || row.fieldType === 'radio') {
          return {
            ...base,
            options: row.optionsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          };
        }
        return base;
      }),
    };

    setFieldsSubmitting(true);
    try {
      const r = await http.post<ApiEnvelope<unknown>>(
        `/api/admin/services/${createdServiceId}/fields`,
        payload
      );
      if (!r.data.success) throw new Error(r.data.error || 'Failed to save fields');
      setSvcSuccess('Appointment form fields saved.');
      await load();
      resetServiceModal();
    } catch (e) {
      setFieldsFormError(errMsg(e));
    } finally {
      setFieldsSubmitting(false);
    }
  }

  function skipFieldsAndClose() {
    resetServiceModal();
  }

  const deptSubmitting = deptForm.formState.isSubmitting;
  const svcSubmitting = svcForm.formState.isSubmitting;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl text-gray-800">Services management</h2>
          <p className="text-gray-600 text-sm">Departments, services, and per-service appointment forms</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-gray-200"
            onClick={() => {
              setDeptSuccess('');
              deptForm.reset({ name: '' });
              setDeptDupMsg('');
              setShowDeptModal(true);
            }}
          >
            Add department
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => {
              resetServiceModal();
              setShowServiceModal(true);
            }}
          >
            <Plus className="size-5" />
            Add service
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{loadError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-1 text-lg text-gray-800">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
              <span>{service.department?.name ?? '—'}</span>
              <span>
                {service.durationInMinutes} min · staff capacity {service.staffCount}
              </span>
            </div>
            <Link
              to={`/admin/form-builder`}
              state={{ serviceId: service.id }}
              className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              onClick={() => sessionStorage.setItem('formBuilderServiceId', String(service.id))}
            >
              <ClipboardList className="h-4 w-4" />
              Manage booking form
            </Link>
          </div>
        ))}
      </div>

      {!loading && services.length === 0 ? (
        <p className="text-sm text-gray-500">No services yet. Create a department, then add a service.</p>
      ) : null}

      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.25)] backdrop-blur-[12px] p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl text-gray-800">New department</h3>
              <button type="button" className="rounded p-1 hover:bg-gray-100" onClick={resetDeptModal} aria-label="Close">
                <X className="size-6 text-gray-400" />
              </button>
            </div>
            <Form {...deptForm}>
              <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">
                <FormField
                  control={deptForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="off"
                          className="w-full"
                          disabled={deptSubmitting}
                          aria-invalid={!!deptForm.formState.errors.name}
                        />
                      </FormControl>
                      <FormMessage />
                      {deptDupMsg ? <p className="text-destructive text-sm">{deptDupMsg}</p> : null}
                    </FormItem>
                  )}
                />
                {deptForm.formState.errors.root ? (
                  <p className="text-sm text-destructive">{deptForm.formState.errors.root.message}</p>
                ) : null}
                {deptSuccess ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {deptSuccess}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={deptSubmitting || !!deptDupMsg}
                >
                  {deptSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create department'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.25)] backdrop-blur-[12px] p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl text-gray-800">
                {serviceWizardStep === 1 ? 'New service' : `Form fields: ${createdServiceName}`}
              </h3>
              <button
                type="button"
                className="rounded p-1 hover:bg-gray-100"
                onClick={resetServiceModal}
                aria-label="Close"
              >
                <X className="size-6 text-gray-400" />
              </button>
            </div>

            {serviceWizardStep === 1 ? (
              <Form {...svcForm}>
                <form onSubmit={svcForm.handleSubmit(onServiceStep1)} className="space-y-4">
                  <FormField
                    control={svcForm.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select
                          disabled={svcSubmitting}
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={field.value ? String(field.value) : ''}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={svcSubmitting} className="w-full" />
                        </FormControl>
                        <FormMessage />
                        {svcDupMsg ? <p className="text-destructive text-sm">{svcDupMsg}</p> : null}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} disabled={svcSubmitting} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="durationInMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={1} max={480} disabled={svcSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={svcForm.control}
                    name="requiredDocuments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required documents note (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} disabled={svcSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {svcForm.formState.errors.root ? (
                    <p className="text-sm text-destructive">{svcForm.formState.errors.root.message}</p>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={svcSubmitting || !!svcDupMsg}
                  >
                    {svcSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating service…
                      </>
                    ) : (
                      'Create service'
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                {svcSuccess ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {svcSuccess}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Add the fields residents will see when booking this service. Options for select and radio: comma-separated
                  values (e.g. Male, Female).
                </p>
                <div className="space-y-3">
                  {builderRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2 lg:grid-cols-12"
                    >
                      <div className="lg:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Label</label>
                        <Input
                          value={row.label}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBuilderRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, label: v } : r)));
                          }}
                          disabled={fieldsSubmitting}
                          placeholder="e.g. Resident full name"
                        />
                      </div>
                      <div className="lg:col-span-3">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Field type</label>
                        <Select
                          value={row.fieldType}
                          onValueChange={(v) => {
                            setBuilderRows((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, fieldType: v as FormFieldType } : r))
                            );
                          }}
                          disabled={fieldsSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORM_FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="lg:col-span-2 flex items-end">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={row.required}
                            onCheckedChange={(c) =>
                              setBuilderRows((prev) =>
                                prev.map((r) => (r.key === row.key ? { ...r, required: Boolean(c) } : r))
                              )
                            }
                            disabled={fieldsSubmitting}
                          />
                          Required
                        </label>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3 flex items-end justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={fieldsSubmitting || builderRows.length <= 1}
                          onClick={() => setBuilderRows((prev) => prev.filter((r) => r.key !== row.key))}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-6">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Placeholder (optional)</label>
                        <Input
                          value={row.placeholder}
                          onChange={(e) =>
                            setBuilderRows((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, placeholder: e.target.value } : r))
                            )
                          }
                          disabled={fieldsSubmitting}
                        />
                      </div>
                      {(row.fieldType === 'select' || row.fieldType === 'radio') && (
                        <div className="sm:col-span-2 lg:col-span-6">
                          <label className="mb-1 block text-xs font-medium text-gray-600">Options (comma-separated)</label>
                          <Input
                            value={row.optionsText}
                            onChange={(e) =>
                              setBuilderRows((prev) =>
                                prev.map((r) => (r.key === row.key ? { ...r, optionsText: e.target.value } : r))
                              )
                            }
                            disabled={fieldsSubmitting}
                            placeholder="Male, Female"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={fieldsSubmitting}
                  onClick={() => setBuilderRows((prev) => [...prev, newBuilderRow()])}
                >
                  Add field
                </Button>
                {fieldsFormError ? <p className="text-sm text-destructive">{fieldsFormError}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" disabled={fieldsSubmitting} onClick={skipFieldsAndClose}>
                    Skip &amp; close
                  </Button>
                  <Button type="button" disabled={fieldsSubmitting} onClick={submitFormFields}>
                    {fieldsSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving fields…
                      </>
                    ) : (
                      'Save form fields'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
