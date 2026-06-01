import { createBrowserRouter } from 'react-router';
import { ResidentLayout } from './components/resident/ResidentLayout';
import { ResidentHome } from './components/resident/ResidentHome';
import {
  TrackAppointmentPage,
  EditAppointmentPage,
  CancelAppointmentPage,
  FeedbackPage,
} from './components/resident/ResidentAppointmentPages';
import { ServiceCatalog } from './components/user/ServiceCatalog';
import { ServiceBooking } from './components/user/ServiceBooking';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ResidentLayout,
    children: [
      { index: true, Component: ResidentHome },
      { path: 'home', Component: ResidentHome },
      { path: 'book-appointment', Component: ServiceCatalog },
      { path: 'book-appointment/:serviceId', Component: ServiceBooking },
      { path: 'services', Component: ServiceCatalog },
      { path: 'track-appointment', Component: TrackAppointmentPage },
      { path: 'edit-appointment', Component: EditAppointmentPage },
      { path: 'cancel-appointment', Component: CancelAppointmentPage },
      { path: 'feedback', Component: FeedbackPage },
    ],
  },
]);
