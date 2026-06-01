import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { http } from '../../../lib/http';
import { BookingFormInner } from '../../../features/kebele/BookingFormInner';
import type { FormFieldRow } from '../../../features/kebele/bookingSchema';
import { getServiceIcon } from '../../../features/kebele/serviceIcons';
import { setResidentPhone } from '../../../lib/auth';
import { normalizeEthiopianPhone } from '../../../lib/ethiopianPhone';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';

import type { ResidentSlot } from '../../../features/kebele/slotDisplay';

type ServiceDetail = {
  id: number;
  name: string;
  description: string | null;
  durationInMinutes: number;
  bookable: boolean;
  fields: FormFieldRow[];
};

type Slot = ResidentSlot;

export function ServiceBooking() {
  const { serviceId: serviceIdParam } = useParams<{ serviceId: string }>();
  const serviceId = Number(serviceIdParam);
  const nav = useNavigate();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [boot, setBoot] = useState(true);
  const [bootErr, setBootErr] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [done, setDone] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);
  const [topErr, setTopErr] = useState('');

  useEffect(() => {
    if (!serviceId || Number.isNaN(serviceId)) {
      setBootErr('Invalid service');
      setBoot(false);
      return;
    }
    setBoot(true);
    http
      .get<{ success: boolean; data: ServiceDetail }>(`/api/user/booking/services/${serviceId}`)
      .then((r) => {
        if (r.data.success) setService(r.data.data);
        else setBootErr('Service not found');
      })
      .catch(() => setBootErr('Could not load service'))
      .finally(() => setBoot(false));
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !dateStr || !service?.bookable) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    http
      .get<{ success: boolean; data: Slot[] }>(
        `/api/user/appointments/available-slots?serviceId=${serviceId}&date=${encodeURIComponent(dateStr)}`
      )
      .then((r) => r.data.success && setSlots(r.data.data))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [serviceId, dateStr, service?.bookable]);

  const initialPersonal = useMemo(
    () =>
      service
        ? {
            fullName: '',
            phone: '',
            email: '',
            gender: 'MALE' as const,
            serviceId: service.id,
            dateStr,
          }
        : null,
    [service?.id, dateStr]
  );

  async function onSubmitBooking(fd: FormData) {
    setTopErr('');
    try {
      const rawPhone = fd.get('phone');
      if (typeof rawPhone === 'string') {
        const normalized = normalizeEthiopianPhone(rawPhone);
        if (normalized) {
          fd.set('phone', normalized);
          setResidentPhone(normalized);
        }
      }
      const res = await http.post('/api/user/appointments', fd);
      const b = res.data as {
        success?: boolean;
        data?: { appointmentNumber?: string };
        error?: string;
        details?: unknown;
      };
      if (!b.success) {
        if (Array.isArray(b.details)) {
          const err = new Error('Form validation failed') as Error & {
            details?: { fieldId: number; label?: string; message: string }[];
          };
          err.details = b.details as { fieldId: number; label?: string; message: string }[];
          throw err;
        }
        throw new Error(b.error || 'Failed');
      }
      setRefNo(b.data?.appointmentNumber ?? null);
      setDone(true);
      setTimeout(() => nav('/user/appointments'), 2200);
    } catch (e: unknown) {
      const withDetails = e as Error & {
        details?: { fieldId: number; message: string }[];
        response?: { data?: { error?: string; details?: { fieldId: number; message: string }[] } };
      };
      if (withDetails.details?.length) throw e;
      const d = withDetails.response?.data?.details;
      if (Array.isArray(d) && d.length) {
        throw Object.assign(new Error('Form validation failed'), { details: d });
      }
      setTopErr(
        withDetails.response?.data?.error ||
          (e instanceof Error ? e.message : 'Booking failed')
      );
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md p-4">
        <div className="space-y-3 rounded-xl border bg-white p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="text-xl font-semibold">Appointment booked</h2>
          {refNo && <p className="text-sm text-gray-600">Reference: {refNo}</p>}
          <Button onClick={() => nav('/user/appointments')}>My appointments</Button>
        </div>
      </div>
    );
  }

  const Icon = service ? getServiceIcon(service.name) : Clock;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-2 py-2">
      <button
        type="button"
        onClick={() => nav('/user/book')}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All services
      </button>

      {boot ? (
        <div className="space-y-4 rounded-xl border bg-white p-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : bootErr || !service ? (
        <p className="text-sm text-red-600">{bootErr || 'Service not found'}</p>
      ) : (
        <>
          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{service.name}</h1>
                <p className="mt-0.5 text-sm text-gray-600">
                  {service.description || 'Complete the form and choose an available slot.'}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Duration: {service.durationInMinutes} minutes
                  {!service.bookable && ' · Currently not bookable (no staff assigned)'}
                </p>
              </div>
            </div>
          </div>

          {topErr && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{topErr}</p>
          )}

          {service.bookable && initialPersonal ? (
            <BookingFormInner
              key={`booking-${service.id}-${service.fields.map((f) => f.id).join('-')}`}
              serviceId={service.id}
              serviceName={service.name}
              fields={service.fields}
              slots={slots}
              slotsLoading={slotsLoading}
              fldLoad={false}
              onCancel={() => nav('/user/book')}
              onSubmitBooking={onSubmitBooking}
              initialPersonal={initialPersonal}
              onDateChange={setDateStr}
            />
          ) : (
            <p className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This service cannot accept bookings until staff are assigned.
            </p>
          )}
        </>
      )}
    </div>
  );
}
