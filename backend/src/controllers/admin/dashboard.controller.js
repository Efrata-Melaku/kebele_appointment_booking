const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');
const { APPOINTMENT_STATUS } = require('../../config/constants');

class DashboardController {
  async getDashboardStats(req, res) {
    try {
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = new Date();
      endToday.setHours(23, 59, 59, 999);

      const [
        totalDepartments,
        totalServices,
        totalStaff,
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        todayAppointments,
      ] = await Promise.all([
        prisma.department.count(),
        prisma.service.count(),
        prisma.user.count({ where: { role: 'STAFF' } }),
        prisma.appointment.count(),
        prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.PENDING } }),
        prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.COMPLETED } }),
        prisma.appointment.count({
          where: {
            status: { not: APPOINTMENT_STATUS.CANCELLED },
            slotDate: { gte: startToday, lte: endToday },
          },
        }),
      ]);

      const recentRows = await prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          group: {
            include: {
              resident: { select: { fullName: true, phone: true } },
            },
          },
          service: {
            select: {
              name: true,
              department: {
                select: { name: true },
              },
            },
          },
          slotDate: true,
          slotStartTime: true,
          slotEndTime: true,
        },
      });

      const recentAppointments = recentRows.map((apt) => ({
        id: apt.id,
        appointmentNumber: apt.group.appointmentNumber,
        status: apt.status,
        resident: apt.group.resident,
        service: apt.service,
        timeSlot: {
          date: apt.slotDate,
          startTime: apt.slotStartTime,
          endTime: apt.slotEndTime,
        },
      }));

      const appointmentsByDepartment = await prisma.department.findMany({
        include: {
          services: {
            include: {
              appointments: {
                select: { id: true },
              },
            },
          },
        },
      });

      const departmentStats = appointmentsByDepartment.map((dept) => ({
        department: dept.name,
        services: dept.services.length,
        appointments: dept.services.reduce(
          (sum, service) => sum + service.appointments.length,
          0
        ),
      }));

      const stats = {
        overview: {
          totalDepartments,
          totalServices,
          totalStaff,
          totalAppointments,
          pendingAppointments,
          completedAppointments,
          todayAppointments,
        },
        recentAppointments,
        departmentStats,
      };

      successResponse(res, 'Dashboard stats retrieved successfully', stats);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve dashboard stats', 500);
    }
  }
}

module.exports = new DashboardController();
