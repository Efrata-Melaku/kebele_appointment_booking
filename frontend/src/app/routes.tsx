import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ManageStaff } from "./components/admin/ManageStaff";
import { AppointmentLimits } from "./components/admin/AppointmentLimits";
import { ScheduleOverrides } from "./components/admin/ScheduleOverrides";
import { ServicesManagement } from "./components/admin/ServicesManagement";
import { ServiceFormBuilder } from "./components/admin/ServiceFormBuilder";
import { Feedback } from "./components/admin/Feedback";
import { AdminAppointments } from "./components/admin/AdminAppointments";
import { AdminAppointmentDetails } from "./components/admin/AdminAppointmentDetails";
import { Reports } from "./components/admin/Reports";
import { Settings } from "./components/admin/Settings";
import { StaffDashboard } from "./components/staff/StaffDashboard";
import { StaffAppointmentDetails } from "./components/staff/StaffAppointmentDetails";
import { UserDashboard } from "./components/user/UserDashboard";
import { ServiceCatalog } from "./components/user/ServiceCatalog";
import { ServiceBooking } from "./components/user/ServiceBooking";
import { MyAppointments } from "./components/user/MyAppointments";
import { RoleSelector } from "./components/RoleSelector";
import { LoginPage } from "./components/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RoleSelector,
  },
  {
    path: "/login/:role",
    Component: LoginPage,
  },
  {
    path: "/admin",
    Component: DashboardLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "appointments", Component: AdminAppointments },
      { path: "appointments/:id", Component: AdminAppointmentDetails },
      { path: "staff", Component: ManageStaff },
      { path: "limits", Component: AppointmentLimits },
      { path: "schedule", Component: ScheduleOverrides },
      { path: "services", Component: ServicesManagement },
      { path: "form-builder", Component: ServiceFormBuilder },
      { path: "feedback", Component: Feedback },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
    ],
  },
  {
    path: "/staff",
    Component: DashboardLayout,
    children: [
      { index: true, Component: StaffDashboard },
      { path: "appointments/:id", Component: StaffAppointmentDetails },
    ],
  },
  {
    path: "/user",
    Component: DashboardLayout,
    children: [
      { index: true, Component: UserDashboard },
      { path: "book", Component: ServiceCatalog },
      { path: "book/:serviceId", Component: ServiceBooking },
      { path: "appointments", Component: MyAppointments },
    ],
  },
]);
