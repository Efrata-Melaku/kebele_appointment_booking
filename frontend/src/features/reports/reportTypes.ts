export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export type ReportFilters = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  label: string;
  granularity: string;
};

export type ReportOverview = {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  rescheduledAppointments: number;
  cancelledAppointments: number;
  notServedAppointments: number;
  totalResidents: number;
  totalServices: number;
  totalStaff: number;
  totalDepartments: number;
  completionRate: number;
};

export type StatusRow = { status: string; count: number; color: string };
export type ServiceRow = {
  serviceId: number;
  serviceName: string;
  departmentId: number | null;
  departmentName: string;
  count: number;
  color: string;
};
export type DepartmentRow = {
  departmentId: number | null;
  departmentName: string;
  count: number;
  services: number;
};
export type StaffRow = {
  staffId: number;
  staffName: string;
  completedCount: number;
  totalHandled: number;
};
export type TrendRow = {
  period: string;
  label: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  rescheduled: number;
  notServed: number;
};
export type PeakHourRow = { hour: string; count: number };

export type FullReport = {
  filters: ReportFilters;
  overview: ReportOverview;
  appointmentsByStatus: StatusRow[];
  appointmentsByService: ServiceRow[];
  appointmentsByDepartment: DepartmentRow[];
  serviceUtilization: {
    mostRequested: ServiceRow[];
    leastRequested: ServiceRow[];
    all: ServiceRow[];
  };
  staffWorkload: StaffRow[];
  trends: TrendRow[];
  peakHours: PeakHourRow[];
  periodSummaries: { filteredTotal: number; allTimeTotal: number };
  generatedAt: string;
};
