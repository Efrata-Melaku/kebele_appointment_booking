const prisma = require('../../prisma/client');
const slotGeneratorService = require('../../services/slotGenerator.service');
const { successResponse, errorResponse } = require('../../utils/response');

class TimeSlotController {
  async generateTimeSlots(req, res) {
    try {
      const { departmentId, serviceId, date, startTime, endTime } = req.body;

      const slots = await slotGeneratorService.generateTimeSlots(
        departmentId,
        serviceId,
        date,
        startTime,
        endTime
      );

      successResponse(res, 'Time slots generated successfully', slots, 201);
    } catch (error) {
      errorResponse(res, error.message, 400);
    }
  }

  async getTimeSlots(req, res) {
    try {
      const { serviceId, date, departmentId } = req.query;

      let where = {};

      if (serviceId) {
        where.serviceId = parseInt(serviceId);
      }

      if (departmentId) {
        // Get services for this department and filter slots
        const services = await prisma.service.findMany({
          where: { departmentId: parseInt(departmentId) },
          select: { id: true },
        });
        where.serviceId = { in: services.map(s => s.id) };
      }

      if (date) {
        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        where.date = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      const timeSlots = await prisma.timeSlot.findMany({
        where,
        include: {
          service: {
            include: {
              department: true,
            },
          },
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
      });

      successResponse(res, 'Time slots retrieved successfully', timeSlots);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve time slots', 500);
    }
  }

  async getTimeSlotById(req, res) {
    try {
      const { id } = req.params;

      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) },
        include: {
          service: {
            include: {
              department: true,
            },
          },
          appointments: {
            include: {
              resident: true,
            },
          },
        },
      });

      if (!timeSlot) {
        return errorResponse(res, 'Time slot not found', 404);
      }

      successResponse(res, 'Time slot retrieved successfully', timeSlot);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve time slot', 500);
    }
  }

  async deleteTimeSlot(req, res) {
    try {
      const { id } = req.params;

      // Check if slot has appointments
      const timeSlot = await prisma.timeSlot.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { appointments: true },
          },
        },
      });

      if (!timeSlot) {
        return errorResponse(res, 'Time slot not found', 404);
      }

      if (timeSlot._count.appointments > 0) {
        return errorResponse(res, 'Cannot delete time slot with existing appointments', 400);
      }

      await prisma.timeSlot.delete({
        where: { id: parseInt(id) },
      });

      successResponse(res, 'Time slot deleted successfully');
    } catch (error) {
      errorResponse(res, 'Failed to delete time slot', 500);
    }
  }
}

module.exports = new TimeSlotController();