import { useEffect, useState } from 'react';
import { apiFetch, apiJson } from '@kebele/shared/lib/api';

type Template = {
  id: number;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
};

type OfficeOv = {
  id: number;
  date: string;
  isClosed: boolean;
  workStart?: string | null;
  workEnd?: string | null;
};

type ServiceOv = {
  id: number;
  date: string;
  serviceId: number;
  serviceDisabled: boolean;
  service?: { name: string };
};

type ServiceRow = { id: number; name: string };

function todayYmd() {
  return new Date().toISOString().split('T')[0];
}

function officeDateLabel(date: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  return String(date).slice(0, 10);
}

function officeStatusLabel(o: OfficeOv) {
  if (o.isClosed) return 'Disabled';
  if (o.workStart || o.workEnd) return 'Custom hours';
  return 'Open (custom)';
}

const emptyOfficeForm = () => ({
  date: todayYmd(),
  isClosed: false,
  workStart: '',
  workEnd: '',
});

export function ScheduleOverrides() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [officeList, setOfficeList] = useState<OfficeOv[]>([]);
  const [svcList, setSvcList] = useState<ServiceOv[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [officeSaving, setOfficeSaving] = useState(false);
  const [editingOfficeDate, setEditingOfficeDate] = useState<string | null>(null);

  const [officeForm, setOfficeForm] = useState(emptyOfficeForm);

  const [svcForm, setSvcForm] = useState({
    date: todayYmd(),
    serviceId: '' as number | '',
    serviceDisabled: true,
  });

  async function load() {
    setError('');
    try {
      const [t, o, s, svcs] = await Promise.all([
        apiJson<Template>('/api/admin/schedule/template'),
        apiJson<OfficeOv[]>('/api/admin/schedule/office-overrides'),
        apiJson<ServiceOv[]>('/api/admin/schedule/service-overrides'),
        apiJson<ServiceRow[]>('/api/admin/services'),
      ]);
      setTemplate(t);
      setOfficeList(o);
      setSvcList(s);
      setServices(svcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetOfficeForm() {
    setOfficeForm(emptyOfficeForm());
    setEditingOfficeDate(null);
  }

  function startEditOffice(o: OfficeOv) {
    const date = officeDateLabel(o.date);
    setEditingOfficeDate(date);
    setOfficeForm({
      date,
      isClosed: o.isClosed,
      workStart: o.workStart ?? '',
      workEnd: o.workEnd ?? '',
    });
    setMsg('');
    setError('');
  }

  async function saveOffice(override?: Partial<{ isClosed: boolean }>) {
    const payload = {
      date: officeForm.date,
      isClosed: override?.isClosed ?? officeForm.isClosed,
      workStart: officeForm.workStart || null,
      workEnd: officeForm.workEnd || null,
    };
    if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      setError('Select a valid date (YYYY-MM-DD).');
      return;
    }
    setOfficeSaving(true);
    setMsg('');
    setError('');
    try {
      if (editingOfficeDate && editingOfficeDate !== payload.date) {
        const del = await apiFetch(
          `/api/admin/schedule/office-overrides/${encodeURIComponent(editingOfficeDate)}`,
          { method: 'DELETE' }
        );
        if (!del.res.ok || !del.body?.success) {
          throw new Error((del.body as { error?: string })?.error || 'Failed to update date');
        }
      }
      const { res, body } = await apiFetch('/api/admin/schedule/office-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setMsg(
        payload.isClosed
          ? `Office disabled for ${payload.date}.`
          : `Office override saved for ${payload.date}.`
      );
      resetOfficeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setOfficeSaving(false);
    }
  }

  async function disableOfficeDay(e: React.FormEvent) {
    e.preventDefault();
    await saveOffice({ isClosed: true });
  }

  async function saveOfficeForm(e: React.FormEvent) {
    e.preventDefault();
    await saveOffice();
  }

  async function deleteOffice(date: string) {
    const key = officeDateLabel(date);
    if (!window.confirm(`Remove office override for ${key}?`)) return;
    setError('');
    setMsg('');
    try {
      const { res, body } = await apiFetch(
        `/api/admin/schedule/office-overrides/${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      );
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setMsg(`Override removed for ${key}.`);
      if (editingOfficeDate === key) resetOfficeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setMsg('');
    try {
      const { res, body } = await apiFetch('/api/admin/schedule/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setMsg('Default schedule saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function saveSvcOverride(e: React.FormEvent) {
    e.preventDefault();
    if (svcForm.serviceId === '') return;
    setMsg('');
    try {
      const { res, body } = await apiFetch('/api/admin/schedule/service-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: svcForm.date,
          serviceId: svcForm.serviceId,
          serviceDisabled: svcForm.serviceDisabled,
        }),
      });
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setMsg('Service override saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  function toggleDay(key: keyof Pick<Template, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>) {
    setTemplate((t) => (t ? { ...t, [key]: !t[key] } : t));
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl text-gray-800">Schedule &amp; special days</h2>
        <p className="text-gray-600 text-sm">
          Default Mon–Fri 08:00–17:00 with lunch 12:00–13:00 excluded from slots. Overrides apply to the
          date you pick in the form, not the day you click save.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{msg}</div>
      ) : null}

      {template ? (
        <form onSubmit={saveTemplate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-lg text-gray-800">Recurring weekly template</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['mon', 'Mon'],
                ['tue', 'Tue'],
                ['wed', 'Wed'],
                ['thu', 'Thu'],
                ['fri', 'Fri'],
                ['sat', 'Sat'],
                ['sun', 'Sun'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2">
                <input type="checkbox" checked={template[k]} onChange={() => toggleDay(k)} />
                {label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                ['workStart', 'Work start'],
                ['workEnd', 'Work end'],
                ['lunchStart', 'Lunch start'],
                ['lunchEnd', 'Lunch end'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={template[field as keyof Template] as string}
                  onChange={(e) => setTemplate((t) => (t ? { ...t, [field]: e.target.value } : t))}
                />
              </div>
            ))}
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            Save template
          </button>
        </form>
      ) : null}

      <form onSubmit={saveOfficeForm} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg text-gray-800">Office-wide day override</h3>
          {editingOfficeDate ? (
            <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
              Editing {editingOfficeDate}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={officeForm.date}
              onChange={(e) => setOfficeForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm mt-6 md:mt-8">
            <input
              type="checkbox"
              checked={officeForm.isClosed}
              onChange={(e) => setOfficeForm((f) => ({ ...f, isClosed: e.target.checked }))}
            />
            Closed (no slots)
          </label>
        </div>
        {!officeForm.isClosed ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Custom work start (optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="08:00"
                value={officeForm.workStart}
                onChange={(e) => setOfficeForm((f) => ({ ...f, workStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Custom work end (optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="17:00"
                value={officeForm.workEnd}
                onChange={(e) => setOfficeForm((f) => ({ ...f, workEnd: e.target.value }))}
              />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={officeSaving}
            onClick={disableOfficeDay}
            className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-60"
          >
            Disable day
          </button>
          <button
            type="submit"
            disabled={officeSaving}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-60"
          >
            {officeSaving ? 'Saving…' : editingOfficeDate ? 'Update override' : 'Save office override'}
          </button>
          {editingOfficeDate ? (
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              onClick={resetOfficeForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 p-4 w-full min-w-0">
        <h4 className="font-medium text-gray-800 mb-3">Saved office overrides</h4>
        <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-4 whitespace-nowrap">Date</th>
                <th className="py-2 pr-4 whitespace-nowrap">Status</th>
                <th className="py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {officeList.map((o) => {
                const dateKey = officeDateLabel(o.date);
                return (
                  <tr key={o.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 whitespace-nowrap font-medium text-gray-800">{dateKey}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-600">{officeStatusLabel(o)}</td>
                    <td className="py-2 whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={() => startEditOffice(o)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => void deleteOffice(dateKey)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {officeList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-400">
                    No office overrides yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={saveSvcOverride} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
        <h3 className="text-lg text-gray-800">Disable one service on a date</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={svcForm.date}
              onChange={(e) => setSvcForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Service</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={svcForm.serviceId === '' ? '' : String(svcForm.serviceId)}
              onChange={(e) =>
                setSvcForm((f) => ({ ...f, serviceId: e.target.value ? Number(e.target.value) : '' }))
              }
            >
              <option value="">Select</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={svcForm.serviceDisabled}
              onChange={(e) => setSvcForm((f) => ({ ...f, serviceDisabled: e.target.checked }))}
            />
            Service unavailable this day
          </label>
        </div>
        <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg">
          Save service override
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h4 className="font-medium text-gray-800 mb-2">Saved service overrides</h4>
        <ul className="text-sm text-gray-600 space-y-1 max-h-48 overflow-y-auto">
          {svcList.map((o) => (
            <li key={o.id}>
              {officeDateLabel(o.date)} — {o.service?.name ?? `Service ${o.serviceId}`} —{' '}
              {o.serviceDisabled ? 'off' : 'on'}
            </li>
          ))}
          {svcList.length === 0 ? <li className="text-gray-400">None</li> : null}
        </ul>
      </div>
    </div>
  );
}
