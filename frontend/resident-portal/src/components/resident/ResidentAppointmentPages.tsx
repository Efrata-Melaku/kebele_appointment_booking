import { MyAppointments } from '../user/MyAppointments';

type Props = {
  pageTitle: string;
  pageDescription: string;
  highlight?: 'track' | 'manage';
  viewMode?: 'default' | 'feedback';
};

function ResidentAppointmentsPage({ pageTitle, pageDescription, highlight, viewMode }: Props) {
  return (
    <MyAppointments
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      highlight={highlight}
      viewMode={viewMode}
    />
  );
}

export function TrackAppointmentPage() {
  return (
    <ResidentAppointmentsPage
      pageTitle="Track appointment"
      pageDescription="Enter your phone number or look up by appointment reference."
      highlight="track"
    />
  );
}

export function EditAppointmentPage() {
  return (
    <ResidentAppointmentsPage
      pageTitle="Edit appointment"
      pageDescription="Load your appointments to edit responses or reschedule."
      highlight="manage"
    />
  );
}

export function CancelAppointmentPage() {
  return (
    <ResidentAppointmentsPage
      pageTitle="Cancel appointment"
      pageDescription="Load your pending appointments and cancel if needed."
      highlight="manage"
    />
  );
}

export function FeedbackPage() {
  return (
    <ResidentAppointmentsPage
      pageTitle="Feedback"
      pageDescription="Search and submit feedback for your appointments."
      highlight="track"
      viewMode="feedback"
    />
  );
}
