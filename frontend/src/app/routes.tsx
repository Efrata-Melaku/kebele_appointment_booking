import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ManageStaff } from "./components/admin/ManageStaff";
import { HouseownerRecords } from "./components/admin/HouseownerRecords";
import { AppointmentLimits } from "./components/admin/AppointmentLimits";
import { ServicesManagement } from "./components/admin/ServicesManagement";
import { Feedback } from "./components/admin/Feedback";
import { Reports } from "./components/admin/Reports";
import { Settings } from "./components/admin/Settings";
import { StaffDashboard } from "./components/staff/StaffDashboard";
import { UserDashboard } from "./components/user/UserDashboard";
import { BookAppointment } from "./components/user/BookAppointment";
import { MyAppointments } from "./components/user/MyAppointments";
import { RoleSelector } from "./components/RoleSelector";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RoleSelector,
  },
  {
    path: "/admin",
    Component: DashboardLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "staff", Component: ManageStaff },
      { path: "houseowners", Component: HouseownerRecords },
      { path: "limits", Component: AppointmentLimits },
      { path: "services", Component: ServicesManagement },
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
    ],
  },
  {
    path: "/user",
    Component: DashboardLayout,
    children: [
      { index: true, Component: UserDashboard },
      { path: "book", Component: BookAppointment },
      { path: "appointments", Component: MyAppointments },
    ],
  },
]);
