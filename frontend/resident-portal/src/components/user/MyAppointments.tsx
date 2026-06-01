import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, MessageSquare, X, Loader2, FileEdit, Mail } from 'lucide-react';
import { http } from '@kebele/shared/lib/http';
import { apiFetch, apiJson } from '@kebele/shared/lib/api';
import { getResidentPhone, setResidentPhone } from '@kebele/shared/lib/auth';
import {
  ETHIOPIAN_PHONE_MESSAGE,
  normalizeEthiopianPhone,
} from '@kebele/shared/lib/ethiopianPhone';
import { EditResponsesForm } from '@kebele/shared/features/kebele/EditResponsesForm';
import { ResidentFeedbackModal } from '@kebele/shared/features/kebele/ResidentFeedbackModal';
import type { FormResponseRow, ServiceFormFieldDef } from '@kebele/shared/features/kebele/formTypes';

type Apt = {
  id: number;
  appointmentNumber: string;
  status: string;
  serviceId?: number;
  service?: { name: string };
  timeSlot?: { date: string; startTime: string; endTime?: string };
  formResponses?: FormResponseRow[];
  feedback?: { id: number; rating: number; comment?: string | null } | null;
};

type MyAppointmentsProps = {
  pageTitle?: string;
  pageDescription?: string;
  highlight?: 'track' | 'manage';
};

export function MyAppointments({
  pageTitle = 'My appointments',
  pageDescription = 'Enter the phone you used when booking',
  highlight,
}: MyAppointmentsProps = {}) {
  const [phone, setPhoneInput] = useState(() => getResidentPhone() || '');
  const [savedPhone, setSavedPhone] = useState(() => getResidentPhone());
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<Apt[]>([]);
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'create' | 'view' | 'edit'>('create');
  const [showReschedule, setShowReschedule] = useState(false);
  const [selected, setSelected] = useState<Apt | null>(null);

  const [resSlots, setResSlots] = useState<
    { id: number; startTime: string; endTime: string; start?: string; end?: string }[]
  >([]);
  const [resDate, setResDate] = useState('');
  const [resSlotStart, setResSlotStart] = useState('');
  const [lookupRef, setLookupRef] = useState('');
  const [lookupResult, setLookupResult] = useState<unknown>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [resBusy, setResBusy] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editFields, setEditFields] = useState<ServiceFormFieldDef[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [resendBusyId, setResendBusyId] = useState<number | null>(null);
  const [resendSuccess, setResendSuccess] = useState('');

  const load = useCallback(async (explicitPhone?: string) => {
    const p = (explicitPhone ?? savedPhone)?.trim();
    if (!p) return;
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(
        `/api/resident/my-appointments?phone=${encodeURIComponent(p)}`,
        { skipAuth: true }
      );
      if (!res.ok || !body?.success || body.data === undefined)
        throw new Error((body as { error?: string })?.error || 'Failed');
      setList((body.data as Apt[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [savedPhone]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const u = tab === 'ALL' ? list : list.filter((a) => (a.status || '').toUpperCase() === tab);
    return u;
  }, [list, tab]);

  function persistPhoneAndLoad() {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) {
      setPhoneError(ETHIOPIAN_PHONE_MESSAGE);
      setError('');
      return;
    }
    setPhoneError('');
    setPhoneInput(normalized);
    setResidentPhone(normalized);
    setSavedPhone(normalized);
    setError('');
    void load(normalized);
  }

  async function runLookup() {
    const ref = lookupRef.trim();
    if (!ref) return;
    const normalized = normalizeEthiopianPhone(savedPhone || phone);
    if (!normalized) {
      setPhoneError(ETHIOPIAN_PHONE_MESSAGE);
      return;
    }
    setPhoneError('');
    setLookupBusy(true);
    setError('');
    setLookupResult(null);
    try {
      const q = new URLSearchParams({
        phone: normalized,
        appointmentNumber: ref,
      });
      const data = await apiJson<unknown>(
        `/api/resident/my-appointments?${q.toString()}`,
        { skipAuth: true }
      );
      setLookupResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLookupBusy(false);
    }
  }

  async function confirmCancel() {
    if (!selected || !savedPhone || !selected.appointmentNumber) return;
    try {
      const q = new URLSearchParams({
        phone: savedPhone.trim(),
        appointmentItemId: String(selected.id),
      });
      const { res, body } = await apiFetch(
        `/api/user/appointments/${encodeURIComponent(selected.appointmentNumber)}?${q.toString()}`,
        { method: 'DELETE', skipAuth: true }
      );
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setShowCancelModal(false);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    }
  }

  async function reloadSlots(serviceId: number, dateISO: string) {
    setResBusy(true);
    try {
      const slots = await apiJson<
        { id: number; startTime: string; endTime: string; start?: string; end?: string }[]
      >(
        `/api/user/appointments/available-slots?serviceId=${serviceId}&date=${encodeURIComponent(dateISO)}`,
        { skipAuth: true }
      );
      setResSlots(slots);
      setResSlotStart('');
    } catch {
      setResSlots([]);
    } finally {
      setResBusy(false);
    }
  }

  async function openReschedule(apt: Apt) {
    if (!apt.appointmentNumber) {
      setError('Cannot reschedule: missing appointment reference');
      return;
    }
    if (typeof apt.serviceId !== 'number') {
      setError('Cannot reschedule: missing service id');
      return;
    }
    setError('');
    setSelected(apt);
    const d = apt.timeSlot?.date
      ? new Date(apt.timeSlot.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setResDate(d);
    setResSlotStart('');
    setShowReschedule(true);
    await reloadSlots(apt.serviceId, d);
  }

  async function openEditForm(apt: Apt) {
    if (!apt.appointmentNumber || typeof apt.serviceId !== 'number') return;
    setSelected(apt);
    setShowEditForm(true);
    setEditLoading(true);
    setError('');
    try {
      const r = await http.get<{
        success: boolean;
        data: { fields: ServiceFormFieldDef[] };
      }>(`/api/user/services/${apt.serviceId}/form-fields`);
      const fields = r.data.success ? r.data.data.fields : [];
      setEditFields(fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load form');
      setEditFields([]);
    } finally {
      setEditLoading(false);
    }
  }

  async function submitEditForm(fd: FormData) {
    if (!selected?.appointmentNumber || !savedPhone?.trim()) return;
    setEditSubmitting(true);
    setError('');
    fd.append('phone', savedPhone.trim());
    fd.append('appointmentItemId', String(selected.id));
    try {
      const res = await http.put(
        `/api/user/appointments/${encodeURIComponent(selected.appointmentNumber)}/form-responses`,
        fd
      );
      if (!res.data.success) throw new Error((res.data as { error?: string }).error || 'Failed');
      setShowEditForm(false);
      setSelected(null);
      await load();
    } catch (e) {
      const ax = e as { response?: { data?: { error?: string; details?: { message: string }[] } } };
      const d = ax.response?.data?.details;
      if (Array.isArray(d)) setError(d.map((x) => x.message).join(' · '));
      else setError(ax.response?.data?.error || 'Update failed');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function applyReschedule() {
    if (!selected || !selected.appointmentNumber || savedPhone?.trim() === '' || !resSlotStart) return;
    setResBusy(true);
    try {
      const { res, body } = await apiFetch(
        `/api/user/appointments/${encodeURIComponent(selected.appointmentNumber)}`,
        {
          method: 'PUT',
          skipAuth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: savedPhone.trim(),
            slotDate: resDate,
            slotStart: resSlotStart,
            appointmentItemId: selected.id,
          }),
        }
      );
      if (!res.ok || !body?.success) throw new Error((body as { error?: string })?.error || 'Failed');
      setShowReschedule(false);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reschedule failed');
    } finally {
      setResBusy(false);
    }
  }

  function statusLabel(status: string) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  async function resendConfirmation(apt: Apt) {
    const normalized = normalizeEthiopianPhone(savedPhone || phone);
    if (!normalized || !apt.appointmentNumber) {
      setPhoneError(ETHIOPIAN_PHONE_MESSAGE);
      return;
    }
    setResendBusyId(apt.id);
    setResendSuccess('');
    setError('');
    try {
      const { res, body } = await apiFetch(
        `/api/user/appointments/${encodeURIComponent(apt.appointmentNumber)}/resend-confirmation`,
        {
          method: 'POST',
          skipAuth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: normalized,
            appointmentItemId: apt.id,
          }),
        }
      );
      if (!res.ok || !body?.success) {
        throw new Error((body as { error?: string })?.error || 'Could not send email');
      }
      setResendSuccess(`Confirmation email sent for ${apt.appointmentNumber}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend email');
    } finally {
      setResendBusyId(null);
    }
  }

  function formatDt(apt: Apt) {
    const ds = apt.timeSlot?.startTime ? new Date(apt.timeSlot.startTime) : null;
    return {
      d: apt.timeSlot?.date ? new Date(apt.timeSlot.date).toLocaleDateString() : ds?.toLocaleDateString() ?? '—',
      t: ds
        ? ds.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : '—',
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-800">{pageTitle}</h2>
        <p className="text-gray-600 text-sm">{pageDescription}</p>
      </div>

      <div
        id="track-lookup"
        className={`bg-white rounded-xl p-4 shadow-sm border space-y-2 ${
          highlight === 'track' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
        }`}
      >
        <p className="text-sm text-gray-700 font-medium">Lookup by appointment number</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. APP-20260510-4821"
            value={lookupRef}
            onChange={(e) => setLookupRef(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
          />
          <button
            type="button"
            onClick={() => void runLookup()}
            disabled={lookupBusy}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {lookupBusy ? 'Loading…' : 'Retrieve'}
          </button>
        </div>
        {lookupResult ? (
          <pre className="text-xs bg-gray-50 border rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(lookupResult, null, 2)}
          </pre>
        ) : null}
      </div>

      <div
        className={`bg-white rounded-xl p-4 shadow-sm border flex flex-col sm:flex-row gap-2 ${
          highlight === 'manage' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
        }`}
      >
        <div className="flex-1">
          <input
            type="tel"
            placeholder="09XXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              if (phoneError) setPhoneError('');
            }}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
            aria-invalid={!!phoneError}
          />
          {phoneError ? (
            <p className="mt-1 text-sm text-red-600">{phoneError}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={persistPhoneAndLoad}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load appointments'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : null}
      {resendSuccess ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {resendSuccess}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg ${tab === t ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!savedPhone?.trim() ? (
        <p className="text-sm text-gray-500">Enter your phone above to fetch appointments.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((apt) => {
            const { d, t } = formatDt(apt);
            const st = apt.status?.toUpperCase() || '';
            const canModify = st === 'PENDING';
            const canFeedback = st === 'COMPLETED';
            return (
              <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between mb-3">
                  <div>
                    <h3 className="text-lg text-gray-800">{apt.service?.name ?? 'Service'}</h3>
                    <p className="text-sm text-gray-500">{apt.appointmentNumber}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      st === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : st === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {statusLabel(apt.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  <div>📅 {d}</div>
                  <div>🕐 {t}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={resendBusyId === apt.id || !savedPhone?.trim()}
                    onClick={() => void resendConfirmation(apt)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {resendBusyId === apt.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Resend confirmation email
                  </button>
                  {canModify ? (
                    <>
                      {(apt.formResponses?.length ?? 0) > 0 || apt.serviceId ? (
                        <button
                          type="button"
                          onClick={() => void openEditForm(apt)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm"
                        >
                          <FileEdit className="w-4 h-4" /> Edit form
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openReschedule(apt)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm"
                      >
                        <Edit className="w-4 h-4" /> Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(apt);
                          setShowCancelModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm"
                      >
                        <Trash2 className="w-4 h-4" /> Cancel
                      </button>
                    </>
                  ) : null}
                  {canFeedback ? (
                    apt.feedback ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(apt);
                            setFeedbackMode('view');
                            setShowFeedbackModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm"
                        >
                          <MessageSquare className="w-4 h-4" /> View feedback
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(apt);
                            setFeedbackMode('edit');
                            setShowFeedbackModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm"
                        >
                          Edit feedback
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(apt);
                          setFeedbackMode('create');
                          setShowFeedbackModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm"
                      >
                        <MessageSquare className="w-4 h-4" /> Leave feedback
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && savedPhone?.trim() && !loading ? (
        <p className="text-sm text-gray-500">No appointments for this filter.</p>
      ) : null}

      {showCancelModal && selected ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl text-gray-800">Cancel appointment</h3>
              <button type="button" onClick={() => setShowCancelModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Confirm cancellation for {selected.appointmentNumber}?</p>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 border rounded-lg" onClick={() => setShowCancelModal(false)}>
                Keep
              </button>
              <button type="button" className="flex-1 py-2 bg-red-500 text-white rounded-lg" onClick={confirmCancel}>
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFeedbackModal && selected && savedPhone ? (
        <ResidentFeedbackModal
          open={showFeedbackModal}
          appointmentId={selected.id}
          phone={savedPhone}
          mode={feedbackMode}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelected(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}

      {showEditForm && selected ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between">
              <h3 className="text-xl text-gray-800">Edit form answers</h3>
              <button type="button" onClick={() => setShowEditForm(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            {editLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <EditResponsesForm
                fields={editFields}
                existing={selected.formResponses}
                onSubmit={submitEditForm}
                submitting={editSubmitting}
              />
            )}
          </div>
        </div>
      ) : null}

      {showReschedule && selected ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3">
            <div className="flex justify-between">
              <h3 className="text-xl text-gray-800">Reschedule</h3>
              <button type="button" onClick={() => setShowReschedule(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <label className="block text-sm">Date</label>
            <input
              type="date"
              value={resDate}
              onChange={(e) => {
                const v = e.target.value;
                setResDate(v);
                if (selected?.serviceId != null) {
                  void reloadSlots(selected.serviceId, v);
                }
              }}
              className="w-full border rounded-lg px-3 py-2"
            />
            <label className="block text-sm">New slot</label>
            {resBusy ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <select
                value={resSlotStart}
                onChange={(e) => setResSlotStart(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select</option>
                {resSlots.map((s) => {
                  const start = s.startTime ?? s.start ?? '';
                  const end = s.endTime ?? s.end ?? '';
                  return (
                    <option key={start} value={start}>
                      {start} – {end}
                    </option>
                  );
                })}
              </select>
            )}
            <button type="button" className="w-full py-2 bg-blue-500 text-white rounded-lg" onClick={applyReschedule}>
              Confirm reschedule
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
