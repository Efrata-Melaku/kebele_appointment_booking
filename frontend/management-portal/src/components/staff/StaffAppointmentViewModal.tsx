import { useCallback, useEffect, useState } from 'react';
import { Calendar, ClipboardList, FileText, History, Loader2, Paperclip, Pencil, User } from 'lucide-react';
import { apiFetch } from '@kebele/shared/lib/api';
import { DocumentPreview } from '@kebele/shared/components/DocumentPreview';
import { statusBadgeClass, statusLabel, type StaffStatusTarget } from '@kebele/shared/lib/staffAppointmentStatus';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kebele/shared/components/ui/dialog';
import { Button } from '@kebele/shared/components/ui/button';
import { StaffStatusUpdateModal } from './StaffStatusUpdateModal';

type FormResponseItem = {
  fieldLabel: string;
  fieldType: string;
  value?: string;
  fileUrl?: string;
  fileName?: string;
};

type UploadedFile = {
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

type Props = {
  appointmentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
};

export function StaffAppointmentViewModal({
  appointmentId,
  open,
  onOpenChange,
  onStatusUpdated,
}: Props) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StaffStatusTarget | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch(`/api/staff/appointments/${appointmentId}`);
      if (!res.ok || !body?.success || !body.data) {
        throw new Error((body as { error?: string })?.error || 'Failed to load appointment');
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
      setDetail(null);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (open && appointmentId) void load();
    if (!open) {
      setDetail(null);
      setError('');
    }
  }, [open, appointmentId, load]);

  const nonFileResponses =
    detail?.formResponses.filter((r) => r.fieldType !== 'file' && !r.fileUrl) ?? [];
  const fileResponses =
    detail?.formResponses.filter((r) => r.fieldType === 'file' || r.fileUrl) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Appointment details
            {detail?.appointment.appointmentNumber ? (
              <span className="font-mono text-sm text-gray-500">{detail.appointment.appointmentNumber}</span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-gray-500 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading appointment…
          </div>
        ) : null}

        {error && !loading ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {detail && !loading ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current status</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(detail.appointment.status)}`}
                >
                  {statusLabel(detail.appointment.status)}
                </span>
              </div>
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

            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <User className="h-4 w-4 text-blue-600" /> Resident information
              </h4>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Full name</dt>
                  <dd>{detail.resident?.fullName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd>{detail.resident?.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gender</dt>
                  <dd>{detail.resident?.gender || '—'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Calendar className="h-4 w-4 text-blue-600" /> Appointment information
              </h4>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Service</dt>
                  <dd>{detail.service?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Department</dt>
                  <dd>{detail.service?.department?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date</dt>
                  <dd>{formatDate(detail.appointment.timeSlot?.date)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Time</dt>
                  <dd>{formatTime(detail.appointment.timeSlot?.startTime)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd>{detail.appointment.status}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <ClipboardList className="h-4 w-4 text-blue-600" /> Submitted form data
              </h4>
              {nonFileResponses.length === 0 && fileResponses.length === 0 ? (
                <p className="text-sm text-gray-500">No form responses.</p>
              ) : (
                <div className="space-y-2 rounded-lg border border-gray-100 divide-y">
                  {nonFileResponses.map((row, idx) => (
                    <div key={`${row.fieldLabel}-${idx}`} className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-700">{row.fieldLabel}</p>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{row.value || '—'}</p>
                    </div>
                  ))}
                  {fileResponses.map((row, idx) =>
                    row.fileUrl ? (
                      <div key={`file-${row.fieldLabel}-${idx}`} className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-700 mb-2">{row.fieldLabel}</p>
                        <DocumentPreview
                          fileUrl={row.fileUrl}
                          fileName={row.fileName || 'File'}
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <History className="h-4 w-4 text-blue-600" /> Status history
              </h4>
              {!detail.statusHistory?.length ? (
                <p className="text-sm text-gray-500">No status changes recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {detail.statusHistory.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-gray-100 px-4 py-3 bg-gray-50"
                    >
                      <p className="font-medium text-gray-800">
                        {row.previousStatus ? statusLabel(row.previousStatus) : '—'} →{' '}
                        {statusLabel(row.newStatus)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {row.changedByName || 'System'} ·{' '}
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                      {row.note ? <p className="text-sm text-gray-700 mt-2">{row.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Paperclip className="h-4 w-4 text-blue-600" /> Uploaded files
              </h4>
              {detail.uploadedFiles.length === 0 ? (
                <p className="text-sm text-gray-500">No uploaded files.</p>
              ) : (
                <div className="space-y-4">
                  {detail.uploadedFiles.map((file) => (
                    <div key={`${file.fieldLabel}-${file.fileUrl}`}>
                      <p className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        {file.fieldLabel}
                      </p>
                      <DocumentPreview fileUrl={file.fileUrl} fileName={file.fileName} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        <StaffStatusUpdateModal
          open={statusOpen}
          onOpenChange={setStatusOpen}
          target={statusTarget}
          onUpdated={() => {
            void load();
            onStatusUpdated?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
