import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../../lib/api';
import {
  formatSlotTimeRange,
  normalizeResidentSlot,
  type ResidentSlot,
} from '../../../features/kebele/slotDisplay';
import {
  STAFF_STATUS_OPTIONS,
  statusBadgeClass,
  statusLabel,
  type StaffStatusTarget,
} from '../../../lib/staffAppointmentStatus';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: StaffStatusTarget | null;
  onUpdated: () => void;
};

function parseApiError(body: unknown, fallback: string) {
  const b = body as { error?: string; details?: { message: string }[] };
  if (Array.isArray(b?.details) && b.details.length > 0) {
    return b.details.map((d) => d.message).join(' · ');
  }
  return b?.error || fallback;
}

export function StaffStatusUpdateModal({ open, onOpenChange, target, onUpdated }: Props) {
  const [newStatus, setNewStatus] = useState('PENDING');
  const [note, setNote] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slots, setSlots] = useState<ResidentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && target) {
      setNewStatus(target.status.toUpperCase().replace(/-/g, '_'));
      setNote('');
      setSlotDate('');
      setSlotStart('');
      setSlots([]);
      setSlotsError('');
      setError('');
    }
  }, [open, target]);

  const loadSlots = useCallback(async () => {
    if (!target?.serviceId || !slotDate) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const q = new URLSearchParams({
        serviceId: String(target.serviceId),
        date: slotDate,
      });
      const { res, body } = await apiFetch(
        `/api/staff/appointments/available-slots?${q.toString()}`
      );
      if (!res.ok || !body?.success) {
        setSlots([]);
        setSlotsError(parseApiError(body, 'Could not load time slots'));
        return;
      }
      const raw = Array.isArray(body.data) ? body.data : [];
      const bookable = raw
        .filter((row) => (row as { available?: boolean }).available !== false)
        .map((row) => normalizeResidentSlot(row as Parameters<typeof normalizeResidentSlot>[0]))
        .filter((s) => s.startTime);
      setSlots(bookable);
      if (bookable.length === 0) {
        setSlotsError('No available time slots on this date. Try another date.');
      }
    } catch {
      setSlots([]);
      setSlotsError('Could not load time slots');
    } finally {
      setSlotsLoading(false);
    }
  }, [target?.serviceId, slotDate]);

  useEffect(() => {
    if (open && newStatus === 'RESCHEDULED' && slotDate) {
      void loadSlots();
    }
    if (newStatus !== 'RESCHEDULED') {
      setSlots([]);
      setSlotsError('');
    }
  }, [open, newStatus, slotDate, loadSlots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;

    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, string> = { status: newStatus };
      if (note.trim()) payload.note = note.trim();

      if (newStatus === 'RESCHEDULED') {
        if (!slotDate || !slotStart) {
          throw new Error('Please select a new date and time for the rescheduled appointment');
        }
        payload.slotDate = slotDate;
        payload.slotStart = slotStart;
      }

      const { res, body } = await apiFetch(`/api/staff/appointments/${target.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !body?.success) {
        throw new Error(parseApiError(body, 'Failed to update status'));
      }

      toast.success('Appointment status updated successfully');
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Update appointment status</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Appointment number
              </p>
              <p className="font-mono font-medium text-gray-900 mt-0.5">{target.appointmentNumber}</p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(target.status)}`}
            >
              {statusLabel(target.status)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Resident</p>
              <p className="font-medium text-gray-900">{target.residentName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Service</p>
              <p className="font-medium text-gray-900">{target.serviceName || '—'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              disabled={submitting}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {STAFF_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {newStatus === 'RESCHEDULED' ? (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs text-blue-800">
                Select a new date and time for this appointment.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  disabled={submitting}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSlotDate(e.target.value);
                    setSlotStart('');
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New time slot <span className="text-red-500">*</span>
                </label>
                {!slotDate ? (
                  <p className="text-sm text-gray-500">Pick a date first to load available times.</p>
                ) : slotsLoading ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading slots…
                  </p>
                ) : (
                  <select
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    disabled={submitting || slots.length === 0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
                  >
                    <option value="">Select time</option>
                    {slots.map((s) => (
                      <option key={`${s.id}-${s.startTime}`} value={s.startTime}>
                        {formatSlotTimeRange(s.startTime, s.endTime)}
                      </option>
                    ))}
                  </select>
                )}
                {slotsError ? <p className="text-xs text-amber-700 mt-1">{slotsError}</p> : null}
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
              placeholder="e.g. Resident served successfully"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
