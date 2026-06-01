const prisma = require('../config/prisma');
const { APPOINTMENT_STATUS, USER_ROLES } = require('../config/constants');
const {
  resolveDateFilterRange,
  describeDateFilter,
  startOfLocalDay,
  endOfLocalDay,
} = require('../utils/dateRange');

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function buildAppointmentWhere(dateRange) {
  if (!dateRange) return {};
  return { slotDate: dateRange };
}

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pickTrendGranularity(preset, dateRange) {
  if (preset === 'today') return 'hour';
  if (preset === 'week' || preset === 'month') return 'day';
  if (preset === 'year') return 'month';
  if (dateRange?.gte && dateRange?.lte) {
    const days =
      (endOfLocalDay(dateRange.lte).getTime() - startOfLocalDay(dateRange.gte).getTime()) /
      (24 * 60 * 60 * 1000);
    if (days <= 1) return 'hour';
    if (days <= 31) return 'day';
    if (days <= 120) return 'week';
    return 'month';
  }
  return 'month';
}

async function countByStatus(where) {
  const groups = await prisma.appointment.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  const map = Object.fromEntries(
    Object.values(APPOINTMENT_STATUS).map((s) => [s, 0])
  );
  for (const row of groups) {
    map[row.status] = row._count._all;
  }
  return map;
}

async function getAppointmentsByService(where) {
  const groups = await prisma.appointment.groupBy({
    by: ['serviceId'],
    where,
    _count: { _all: true },
  });
  groups.sort((a, b) => b._count._all - a._count._all);
  if (!groups.length) return [];

  const serviceIds = groups.map((g) => g.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: {
      id: true,
      name: true,
      department: { select: { id: true, name: true } },
    },
  });
  const byId = new Map(services.map((s) => [s.id, s]));

  return groups.map((g, index) => {
    const svc = byId.get(g.serviceId);
    return {
      serviceId: g.serviceId,
      serviceName: svc?.name ?? `Service #${g.serviceId}`,
      departmentId: svc?.department?.id ?? null,
      departmentName: svc?.department?.name ?? '—',
      count: g._count._all,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });
}

async function getAppointmentsByDepartment(where) {
  const byService = await getAppointmentsByService(where);
  const deptMap = new Map();
  for (const row of byService) {
    const key = row.departmentId ?? 0;
    const existing = deptMap.get(key) || {
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      count: 0,
      services: 0,
    };
    existing.count += row.count;
    existing.services += 1;
    deptMap.set(key, existing);
  }
  return [...deptMap.values()].sort((a, b) => b.count - a.count);
}

async function getStaffWorkload(where) {
  const historyWhere = {
    newStatus: APPOINTMENT_STATUS.COMPLETED,
    appointment: where.slotDate ? { slotDate: where.slotDate } : {},
  };

  const groups = await prisma.appointmentStatusHistory.groupBy({
    by: ['changedByUserId'],
    where: historyWhere,
    _count: { _all: true },
  });

  const staffIds = groups
    .map((g) => g.changedByUserId)
    .filter((id) => id != null);

  const users =
    staffIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: staffIds }, role: USER_ROLES.STAFF },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const completed = groups
    .filter((g) => g.changedByUserId != null)
    .map((g) => ({
      staffId: g.changedByUserId,
      staffName: nameById.get(g.changedByUserId) ?? `Staff #${g.changedByUserId}`,
      completedCount: g._count._all,
    }))
    .sort((a, b) => b.completedCount - a.completedCount);

  const handledGroups = await prisma.appointmentStatusHistory.groupBy({
    by: ['changedByUserId'],
    where: {
      changedByUserId: { not: null },
      appointment: where.slotDate ? { slotDate: where.slotDate } : {},
    },
    _count: { _all: true },
  });

  const handledMap = new Map(
    handledGroups.map((g) => [g.changedByUserId, g._count._all])
  );

  return completed.map((row) => ({
    ...row,
    totalHandled: handledMap.get(row.staffId) ?? row.completedCount,
  }));
}

async function getTrends(where, granularity, dateRange) {
  const gte = dateRange?.gte ?? startOfLocalDay(new Date(0));
  const lte = dateRange?.lte ?? endOfLocalDay(new Date());

  if (granularity === 'hour') {
    const rows = await prisma.$queryRaw`
      SELECT
        HOUR(slotStartTime) AS hour,
        status,
        COUNT(*) AS cnt
      FROM appointments
      WHERE slotDate >= ${gte} AND slotDate <= ${lte}
      GROUP BY HOUR(slotStartTime), status
      ORDER BY hour ASC
    `;
    const buckets = new Map();
    for (let h = 0; h < 24; h += 1) {
      const label =
        h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      buckets.set(h, {
        period: String(h),
        label,
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        rescheduled: 0,
        notServed: 0,
      });
    }
    for (const row of rows) {
      const hour = Number(row.hour);
      const b = buckets.get(hour);
      if (!b) continue;
      const c = Number(row.cnt);
      b.total += c;
      if (row.status === 'COMPLETED') b.completed += c;
      else if (row.status === 'CANCELLED') b.cancelled += c;
      else if (row.status === 'PENDING') b.pending += c;
      else if (row.status === 'RESCHEDULED') b.rescheduled += c;
      else if (row.status === 'NOT_SERVED') b.notServed += c;
    }
    return [...buckets.values()].filter((b) => b.total > 0);
  }

  if (granularity === 'day') {
    const rows = await prisma.$queryRaw`
      SELECT
        DATE(slotDate) AS day,
        status,
        COUNT(*) AS cnt
      FROM appointments
      WHERE slotDate >= ${gte} AND slotDate <= ${lte}
      GROUP BY DATE(slotDate), status
      ORDER BY day ASC
    `;
    const buckets = new Map();
    for (const row of rows) {
      const key = formatYmd(new Date(row.day));
      if (!buckets.has(key)) {
        buckets.set(key, {
          period: key,
          label: new Date(row.day).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          total: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          rescheduled: 0,
          notServed: 0,
        });
      }
      const b = buckets.get(key);
      const c = Number(row.cnt);
      b.total += c;
      if (row.status === 'COMPLETED') b.completed += c;
      else if (row.status === 'CANCELLED') b.cancelled += c;
      else if (row.status === 'PENDING') b.pending += c;
      else if (row.status === 'RESCHEDULED') b.rescheduled += c;
      else if (row.status === 'NOT_SERVED') b.notServed += c;
    }
    return [...buckets.values()];
  }

  if (granularity === 'week') {
    const rows = await prisma.$queryRaw`
      SELECT
        YEARWEEK(slotDate, 1) AS yw,
        MIN(slotDate) AS weekStart,
        status,
        COUNT(*) AS cnt
      FROM appointments
      WHERE slotDate >= ${gte} AND slotDate <= ${lte}
      GROUP BY YEARWEEK(slotDate, 1), status
      ORDER BY yw ASC
    `;
    const buckets = new Map();
    for (const row of rows) {
      const key = String(row.yw);
      if (!buckets.has(key)) {
        const start = new Date(row.weekStart);
        buckets.set(key, {
          period: key,
          label: `Week of ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          total: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          rescheduled: 0,
          notServed: 0,
        });
      }
      const b = buckets.get(key);
      const c = Number(row.cnt);
      b.total += c;
      if (row.status === 'COMPLETED') b.completed += c;
      else if (row.status === 'CANCELLED') b.cancelled += c;
      else if (row.status === 'PENDING') b.pending += c;
      else if (row.status === 'RESCHEDULED') b.rescheduled += c;
      else if (row.status === 'NOT_SERVED') b.notServed += c;
    }
    return [...buckets.values()];
  }

  const rows = await prisma.$queryRaw`
    SELECT
      YEAR(slotDate) AS yr,
      MONTH(slotDate) AS mo,
      status,
      COUNT(*) AS cnt
    FROM appointments
    WHERE slotDate >= ${gte} AND slotDate <= ${lte}
    GROUP BY YEAR(slotDate), MONTH(slotDate), status
    ORDER BY yr ASC, mo ASC
  `;
  const buckets = new Map();
  for (const row of rows) {
    const key = `${row.yr}-${String(row.mo).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        period: key,
        label: new Date(Number(row.yr), Number(row.mo) - 1, 1).toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        }),
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        rescheduled: 0,
        notServed: 0,
      });
    }
    const b = buckets.get(key);
    const c = Number(row.cnt);
    b.total += c;
    if (row.status === 'COMPLETED') b.completed += c;
    else if (row.status === 'CANCELLED') b.cancelled += c;
    else if (row.status === 'PENDING') b.pending += c;
    else if (row.status === 'RESCHEDULED') b.rescheduled += c;
    else if (row.status === 'NOT_SERVED') b.notServed += c;
  }
  return [...buckets.values()];
}

async function getPeakHours(where) {
  const dateFilter = where.slotDate;
  const rows = dateFilter
    ? await prisma.$queryRaw`
        SELECT HOUR(slotStartTime) AS hour, COUNT(*) AS cnt
        FROM appointments
        WHERE slotDate >= ${dateFilter.gte} AND slotDate <= ${dateFilter.lte}
        GROUP BY HOUR(slotStartTime)
        ORDER BY hour ASC
      `
    : await prisma.$queryRaw`
        SELECT HOUR(slotStartTime) AS hour, COUNT(*) AS cnt
        FROM appointments
        GROUP BY HOUR(slotStartTime)
        ORDER BY hour ASC
      `;

  return rows.map((row) => {
    const h = Number(row.hour);
    const label =
      h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    return { hour: label, count: Number(row.cnt) };
  });
}

async function getPeriodSummaries(where) {
  const base = where.slotDate ? { slotDate: where.slotDate } : {};
  const [totalInRange, allTime] = await Promise.all([
    prisma.appointment.count({ where: base }),
    prisma.appointment.count(),
  ]);
  return {
    filteredTotal: totalInRange,
    allTimeTotal: allTime,
  };
}

class ReportService {
  async getFullReport(query = {}) {
    const filters = {
      datePreset: query.datePreset || query.preset || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null,
    };

    const dateRange = resolveDateFilterRange(filters);
    const where = buildAppointmentWhere(dateRange);
    const granularity = pickTrendGranularity(filters.datePreset, dateRange);

    const [
      statusCounts,
      totalResidents,
      totalServices,
      totalStaff,
      totalDepartments,
      appointmentsByService,
      appointmentsByDepartment,
      staffWorkload,
      trends,
      peakHours,
      periodSummaries,
    ] = await Promise.all([
      countByStatus(where),
      prisma.resident.count(),
      prisma.service.count(),
      prisma.user.count({ where: { role: USER_ROLES.STAFF, isActive: true } }),
      prisma.department.count(),
      getAppointmentsByService(where),
      getAppointmentsByDepartment(where),
      getStaffWorkload(where),
      getTrends(where, granularity, dateRange),
      getPeakHours(where),
      getPeriodSummaries(where),
    ]);

    const totalAppointments = Object.values(statusCounts).reduce((s, n) => s + n, 0);
    const completionRate =
      totalAppointments > 0
        ? Math.round((statusCounts.COMPLETED / totalAppointments) * 1000) / 10
        : 0;

    const appointmentsByStatus = Object.values(APPOINTMENT_STATUS).map((status, index) => ({
      status,
      count: statusCounts[status] ?? 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const sortedServices = [...appointmentsByService];
    const mostRequested = sortedServices.slice(0, 5);
    const leastRequested = [...sortedServices].reverse().slice(0, 5);

    return {
      filters: {
        ...filters,
        label: describeDateFilter(filters),
        granularity,
        dateFrom: dateRange?.gte ? formatYmd(dateRange.gte) : null,
        dateTo: dateRange?.lte ? formatYmd(dateRange.lte) : null,
      },
      overview: {
        totalAppointments,
        pendingAppointments: statusCounts.PENDING ?? 0,
        completedAppointments: statusCounts.COMPLETED ?? 0,
        rescheduledAppointments: statusCounts.RESCHEDULED ?? 0,
        cancelledAppointments: statusCounts.CANCELLED ?? 0,
        notServedAppointments: statusCounts.NOT_SERVED ?? 0,
        totalResidents,
        totalServices,
        totalStaff,
        totalDepartments,
        completionRate,
      },
      appointmentsByStatus,
      appointmentsByService,
      appointmentsByDepartment,
      serviceUtilization: {
        mostRequested,
        leastRequested,
        all: appointmentsByService,
      },
      staffWorkload,
      trends,
      peakHours,
      periodSummaries,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new ReportService();
