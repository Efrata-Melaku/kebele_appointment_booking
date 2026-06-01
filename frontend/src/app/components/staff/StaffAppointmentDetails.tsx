import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  User,
  Calendar,
  ClipboardList,
  Paperclip,
  History,
  Pencil,
} from 'lucide-react';
import { apiFetch, browserViewUrl, resolveUploadUrl } from '../../../lib/api';
import { statusBadgeClass, statusLabel, type StaffStatusTarget } from '../../../lib/staffAppointmentStatus';
import { Button } from '../ui/button';
import { StaffStatusUpdateModal } from './StaffStatusUpdateModal';

type FormResponseItem = {
  fieldLabel: string;
  fieldType: string;
  value?: string;
  fileUrl?: string;
  fileName?: string;
};

type UploadedFile = {
  id?: number;
  fieldLabel: string;
  fileUrl: string;
  fileName: string;
  fileType?: string | null;
};

type AppointmentDetail = {
  appointment: {
    id: number;
    appointmentNumber: string;
    status: string;
    timeSlot?: { date: string; startTime: string; endTime?: string };
    documentUrl?: string | null;
  };
  resident: {
    fullName: string;
    phone: string;
    gender: string;
  } | null;
  service: {
    id?: number;
    name: string;
    department?: { name: string } | null;
  } | null;
  formResponses: FormResponseItem[];
  uploadedFiles: UploadedFile[];
  statusHistory?: {
    id: number;
    previousStatus?: string | null;
    newStatus: string;
    note?: string | null;
    changedByName?: string;
    createdAt: string;
  }[];
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
}

function formatTime(iso?: string) {
  return iso
    ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';
}

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{row.label}</dt>
          <dd className="mt-1 text-sm text-gray-900 break-words">{row.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function StaffAppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StaffStatusTarget | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/staff/appointments/${id}`);
      if (!res.ok || !body?.success || !body.data) {
        const msg = (body as { error?: string })?.error || 'Failed to load appointment';
        if (res.status === 403) throw new Error('You are not authorized to view this appointment');
        if (res.status === 404) throw new Error('Appointment not found');
        throw new Error(msg);
      }
      const data = body.data as AppointmentDetail;
      setDetail(data);
      if (data.service?.id) {
        setStatusTarget({
          id: data.appointment.id,
          serviceId: data.service.id,
          appointmentNumber: data.appointment.appointmentNumber,
          status: data.appointment.status,
          residentName: data.resident?.fullName || '—',
          serviceName: data.service.name,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadFile(file: UploadedFile) {
    const url = resolveUploadUrl(file.fileUrl);
    if (!url) {
      setError('File URL is missing or invalid.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12">
        <Loader2 className="w-6 h-6 animate-spin" /> Loading appointment…
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to appointments
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!detail) return null;

  const { appointment, resident, service, formResponses, uploadedFiles, statusHistory } = detail;
  const nonFileResponses = formResponses.filter((r) => r.fieldType !== 'file');

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/staff"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to appointments
          </Link>
          <h2 className="text-2xl text-gray-800">Appointment details</h2>
          <p className="text-gray-600 text-sm font-mono">{appointment.appointmentNumber}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(appointment.status)}`}
          >
            {statusLabel(appointment.status)}
          </span>
          {statusTarget ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setStatusOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Change status
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <SectionCard title="Resident information" icon={User}>
        <InfoGrid
          rows={[
            { label: 'Full name', value: resident?.fullName ?? '' },
            { label: 'Phone number', value: resident?.phone ?? '' },
            { label: 'Gender', value: resident?.gender ?? '' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Appointment information" icon={Calendar}>
        <InfoGrid
          rows={[
            { label: 'Department', value: service?.department?.name ?? '' },
            { label: 'Service name', value: service?.name ?? '' },
            { label: 'Appointment number', value: appointment.appointmentNumber },
            { label: 'Appointment date', value: formatDate(appointment.timeSlot?.date) },
            { label: 'Appointment time', value: formatTime(appointment.timeSlot?.startTime) },
            { label: 'Status', value: appointment.status },
          ]}
        />
      </SectionCard>

      <SectionCard title="Status history" icon={History}>
        {!statusHistory?.length ? (
          <p className="text-sm text-gray-500">No status changes recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {statusHistory.map((row) => (
              <li key={row.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">
                  {row.previousStatus ? statusLabel(row.previousStatus) : '—'} →{' '}
                  {statusLabel(row.newStatus)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {row.changedByName || 'System'} · {new Date(row.createdAt).toLocaleString()}
                </p>
                {row.note ? <p className="mt-2 text-gray-700">{row.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Submitted form data" icon={ClipboardList}>
        {nonFileResponses.length === 0 ? (
          <p className="text-sm text-gray-500">No form responses submitted.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium w-1/3">Field</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Response</th>
                </tr>
              </thead>
              <tbody>
                {nonFileResponses.map((row, idx) => (
                  <tr key={`${row.fieldLabel}-${idx}`} className="border-t border-gray-100">
                    <td className="py-3 px-4 text-gray-700 font-medium align-top">{row.fieldLabel}</td>
                    <td className="py-3 px-4 text-gray-900 break-words whitespace-pre-wrap">
                      {row.value || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Uploaded documents" icon={Paperclip}>
        {uploadedFiles.length === 0 ? (
          <p className="text-sm text-gray-500">No files uploaded.</p>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={`${file.fieldLabel}-${file.fileUrl}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{file.fieldLabel}</p>
                    <p className="text-xs text-gray-500 truncate">{file.fileName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <a
                    href={browserViewUrl(file.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!browserViewUrl(file.fileUrl)) {
                        e.preventDefault();
                        setError('File URL is missing or invalid.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 text-blue-700 hover:bg-blue-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in browser
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadFile(file)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <StaffStatusUpdateModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        target={statusTarget}
        onUpdated={() => void load()}
      />
    </div>
  );
}
