import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { managementRoutes } from '@/lib/routes';
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Loader2,
  Paperclip,
  Star,
  User,
} from 'lucide-react';
import { apiFetch } from '@kebele/shared/lib/api';
import { DocumentPreview } from '@kebele/shared/components/DocumentPreview';

type Detail = {
  appointment: {
    id: number;
    appointmentNumber: string;
    status: string;
    timeSlot?: { date?: string; startTime?: string; endTime?: string };
    createdAt: string;
    updatedAt: string;
  };
  resident: {
    fullName: string;
    phone: string;
    email?: string;
    gender: string;
  } | null;
  service: { name: string; department?: { name: string } | null } | null;
  formResponses: { fieldLabel: string; fieldType: string; value?: string; fileUrl?: string; fileName?: string }[];
  uploadedFiles: { fieldLabel: string; fileUrl: string; fileName: string; fileType?: string | null }[];
  emailDelivery?: {
    confirmationEmailSent: boolean;
    confirmationEmailSentAt?: string | null;
  };
  feedback: { rating: number; comment?: string | null; createdAt: string } | null;
  groupHistory: {
    id: number;
    serviceName?: string;
    status: string;
    timeSlot?: { date?: string; startTime?: string };
    createdAt: string;
  }[];
};

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
}

function fmtTime(iso?: string) {
  return iso
    ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function AdminAppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/admin/appointments/${id}`);
      if (!res.ok || !body?.success || !body.data) {
        throw new Error((body as { error?: string })?.error || 'Failed to load');
      }
      setDetail(body.data as Detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12">
        <Loader2 className="w-6 h-6 animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link to={managementRoutes.admin.appointments} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-red-600 text-sm">{error || 'Not found'}</p>
      </div>
    );
  }

  const { appointment, resident, service, formResponses, uploadedFiles, feedback, groupHistory, emailDelivery } =
    detail;
  const textResponses = formResponses.filter((r) => r.fieldType !== 'file');

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <Link
          to={managementRoutes.admin.appointments}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> All appointments
        </Link>
        <h2 className="text-2xl text-gray-800">{appointment.appointmentNumber}</h2>
        <p className="text-sm text-gray-600">
          {service?.name} · {service?.department?.name} ·{' '}
          <span className="font-medium">{appointment.status}</span>
        </p>
      </div>

      <section className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
          <User className="h-5 w-5 text-blue-600" /> Resident
        </h3>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd>{resident?.fullName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd>{resident?.phone}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd>{resident?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Gender</dt>
            <dd>{resident?.gender}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">Email notifications</h3>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Confirmation email</dt>
            <dd>
              {emailDelivery?.confirmationEmailSent ? (
                <span className="text-green-700 font-medium">Sent</span>
              ) : (
                <span className="text-gray-600">Not sent</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last sent</dt>
            <dd>
              {emailDelivery?.confirmationEmailSentAt
                ? new Date(emailDelivery.confirmationEmailSentAt).toLocaleString()
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" /> Appointment
        </h3>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Date</dt>
            <dd>{fmtDate(appointment.timeSlot?.date)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Time</dt>
            <dd>{fmtTime(appointment.timeSlot?.startTime)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd>{fmtDate(appointment.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last updated</dt>
            <dd>{fmtDate(appointment.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      {feedback ? (
        <section className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
            <Star className="h-5 w-5 text-yellow-500" /> Anonymous feedback
          </h3>
          <p className="text-xs text-gray-500 mb-2">Rating and comment only — no resident data stored</p>
          <p className="text-sm">
            Rating: {feedback.rating}/5 · {fmtDate(feedback.createdAt)}
          </p>
          {feedback.comment ? <p className="mt-2 text-sm text-gray-700">{feedback.comment}</p> : null}
        </section>
      ) : null}

      {textResponses.length > 0 ? (
        <section className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
            <ClipboardList className="h-5 w-5 text-blue-600" /> Form responses
          </h3>
          <ul className="space-y-3 text-sm">
            {textResponses.map((r, i) => (
              <li key={i}>
                <span className="font-medium text-gray-700">{r.fieldLabel}:</span>{' '}
                {String(r.value ?? '—')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {uploadedFiles.length > 0 ? (
        <section className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-4">
            <Paperclip className="h-5 w-5 text-blue-600" /> Documents
          </h3>
          <div className="space-y-6">
            {uploadedFiles.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {f.fieldLabel}: {f.fileName}
                </p>
                <DocumentPreview fileUrl={f.fileUrl} fileName={f.fileName} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {groupHistory.length > 1 ? (
        <section className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="font-medium text-gray-900 mb-4">Appointment group history</h3>
          <ul className="space-y-2 text-sm">
            {groupHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-2 border-b border-gray-50 pb-2">
                <span>{h.serviceName}</span>
                <span className="text-gray-500">{h.status}</span>
                <span className="text-gray-500">
                  {fmtDate(h.timeSlot?.date)} {fmtTime(h.timeSlot?.startTime)}
                </span>
                {h.id !== appointment.id ? (
                  <Link to={managementRoutes.admin.appointment(h.id)} className="text-blue-600 hover:underline">
                    View
                  </Link>
                ) : (
                  <span className="text-gray-400">(current)</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
