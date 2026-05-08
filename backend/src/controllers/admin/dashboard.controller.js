const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');

class DashboardController {
  async getDashboardStats(req, res) {
    try {
      // Get total counts
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
        prisma.appointment.count({ where: { status: 'PENDING' } }),
        prisma.appointment.count({ where: { status: 'COMPLETED' } }),
        prisma.appointment.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

      // Get recent appointments
      const recentAppointments = await prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          resident: {
            select: { fullName: true, phone: true },
          },
          service: {
            select: {
              name: true,
              department: {
                select: { name: true },
              },
            },
          },
          timeSlot: {
            select: { date: true, startTime: true, endTime: true },
          },
        },
      });

      // Get appointments by department
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

      const departmentStats = appointmentsByDepartment.map(dept => ({
        department: dept.name,
        services: dept.services.length,
        appointments: dept.services.reduce((sum, service) => sum + service.appointments.length, 0),
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