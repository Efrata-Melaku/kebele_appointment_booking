import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, Loader2 } from 'lucide-react';
import { http } from '../../../lib/http';
import { Button } from '../ui/button';
import { BookingFormInner } from '../../../features/kebele/BookingFormInner';
import type { FormFieldRow } from '../../../features/kebele/bookingSchema';

type Dept = { id: number; name: string };
type Svc = { id: number; name: string; departmentId: number };
import type { ResidentSlot } from '../../../features/kebele/slotDisplay';

type Slot = ResidentSlot;

export function BookAppointment() {
  const nav = useNavigate();
  const [done, setDone] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);
  const [topErr, setTopErr] = useState('');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [fields, setFields] = useState<FormFieldRow[]>([]);
  const [fldLoad, setFldLoad] = useState(false);
  const [boot, setBoot] = useState(true);

  const [depId, setDepId] = useState(0);
  const [svcId, setSvcId] = useState(0);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    http
      .get<{ success: boolean; data: Dept[] }>('/api/user/departments')
      .then((r) => r.data.success && setDepts(r.data.data))
      .catch(() => setTopErr('Could not load departments'))
      .finally(() => setBoot(false));
  }, []);

  useEffect(() => {
    if (!depId) {
      setSvcs([]);
      setSvcId(0);
      setFields([]);
      return;
    }
    http
      .get<{ success: boolean; data: Svc[] }>(`/api/user/services/${depId}`)
      .then((r) => {
        if (r.data.success) {
          setSvcs(r.data.data);
          setSvcId(0);
          setFields([]);
        }
      })
      .catch(() => setSvcs([]));
  }, [depId]);

  useEffect(() => {
    if (!svcId) {
      setFields([]);
      return;
    }
    setFldLoad(true);
    http
      .get<{ success: boolean; data: { service: Svc; fields: FormFieldRow[] } }>(
        `/api/user/services/${svcId}/form-fields`
      )
      .then((r) => {
        if (r.data.success) setFields(r.data.data.fields);
      })
      .catch(() => setFields([]))
      .finally(() => setFldLoad(false));
  }, [svcId]);

  useEffect(() => {
    if (!svcId || !dateStr) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    http
      .get<{ success: boolean; data: Slot[] }>(
        `/api/user/appointments/available-slots?serviceId=${svcId}&date=${encodeURIComponent(dateStr)}`
      )
      .then((r) => r.data.success && setSlots(r.data.data))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [svcId, dateStr]);

  const selectedService = useMemo(() => svcs.find((s) => s.id === svcId), [svcs, svcId]);

  const initialPersonal = useMemo(
    () =>
      svcId > 0
        ? {
            fullName: '',
            phone: '',
            email: '',
            gender: 'MALE' as const,
            serviceId: svcId,
            dateStr,
          }
        : null,
    [svcId, dateStr]
  );

  async function onSubmitBooking(fd: FormData) {
    setTopErr('');
    try {
      const res = await http.post('/api/user/appointments', fd);
      const b = res.data as {
        success?: boolean;
        data?: { appointmentNumber?: string };
        error?: string;
        details?: unknown;
      };
      if (!b.success) {
        if (Array.isArray(b.details)) {
          setTopErr((b.details as { message: string }[]).map((d) => d.message).join(' · '));
        } else setTopErr(b.error || 'Failed');
        return;
      }
      setRefNo(b.data?.appointmentNumber ?? null);
      setDone(true);
      setTimeout(() => nav('/user/appointments'), 2200);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string; details?: { message: string }[] } } };
      const d = ax.response?.data?.details;
      if (Array.isArray(d)) setTopErr(d.map((x) => x.message).join(' · '));
      else setTopErr(ax.response?.data?.error || 'Booking failed');
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md p-4">
        <div className="space-y-3 rounded-xl border bg-white p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="text-xl font-semibold">Booked</h2>
          {refNo && <p className="text-sm">{refNo}</p>}
          <Button onClick={() => nav('/user/appointments')}>My appointments</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-2">
      <h2 className="text-2xl">Book appointment</h2>
      {topErr && (
        <p className="rounded border border-red-100 bg-red-50 p-2 text-sm text-red-600">{topErr}</p>
      )}
      {boot ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <>
          <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={depId || ''}
                onChange={(e) => setDepId(Number(e.target.value) || 0)}
              >
                <option value="">Select</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={svcId || ''}
                disabled={!depId}
                onChange={(e) => setSvcId(Number(e.target.value) || 0)}
              >
                <option value="">Select</option>
                {svcs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {svcId > 0 && initialPersonal && selectedService ? (
            <BookingFormInner
              key={`form-${svcId}-${fields.map((f) => f.id).join('-')}`}
              serviceId={svcId}
              serviceName={selectedService.name}
              fields={fields}
              slots={slots}
              slotsLoading={slotsLoading}
              fldLoad={fldLoad}
              onCancel={() => nav('/user')}
              onSubmitBooking={onSubmitBooking}
              initialPersonal={initialPersonal}
              onDateChange={setDateStr}
            />
          ) : (
            <p className="text-sm text-gray-500">Select a department and service to continue.</p>
          )}
        </>
      )}
    </div>
  );
}
