const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');

class ServiceController {
  async createService(req, res) {
    try {
      const {
        name,
        description,
        durationInMinutes,
        staffCount,
        requiredDocuments,
        hasTeyazeRequirement,
        departmentId,
      } = req.body;

      // Check if department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return errorResponse(res, 'Department not found', 404);
      }

      const service = await prisma.service.create({
        data: {
          name,
          description,
          durationInMinutes,
          staffCount,
          requiredDocuments,
          hasTeyazeRequirement,
          departmentId,
        },
        include: {
          department: true,
        },
      });

      successResponse(res, 'Service created successfully', service, 201);
    } catch (error) {
      errorResponse(res, 'Failed to create service', 500);
    }
  }

  async getServices(req, res) {
    try {
      const services = await prisma.service.findMany({
        include: {
          department: true,
          _count: {
            select: { appointments: true, timeSlots: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      successResponse(res, 'Services retrieved successfully', services);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve services', 500);
    }
  }

  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { id: parseInt(id) },
        include: {
          department: true,
          timeSlots: {
            orderBy: { date: 'asc' },
          },
          _count: {
            select: { appointments: true },
          },
        },
      });

      if (!service) {
        return errorResponse(res, 'Service not found', 404);
      }

      successResponse(res, 'Service retrieved successfully', service);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve service', 500);
    }
  }

  async updateService(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        durationInMinutes,
        staffCount,
        requiredDocuments,
        hasTeyazeRequirement,
        departmentId,
      } = req.body;

      const service = await prisma.service.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          durationInMinutes,
          staffCount,
          requiredDocuments,
          hasTeyazeRequirement,
          departmentId,
        },
        include: {
          department: true,
        },
      });

      successResponse(res, 'Service updated successfully', service);
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Service not found', 404);
      }
      errorResponse(res, 'Failed to update service', 500);
    }
  }

  async deleteService(req, res) {
    try {
      const { id } = req.params;

      await prisma.service.delete({
        where: { id: parseInt(id) },
      });

      successResponse(res, 'Service deleted successfully');
    } catch (error) {
      if (error.code === 'P2025') {
        return errorResponse(res, 'Service not found', 404);
      }
      errorResponse(res, 'Failed to delete service', 500);
    }
  }

  async getServicesByDepartment(req, res) {
    try {
      const { departmentId } = req.params;

      const services = await prisma.service.findMany({
        where: { departmentId: parseInt(departmentId) },
        include: {
          department: true,
          _count: {
            select: { appointments: true, timeSlots: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      successResponse(res, 'Services retrieved successfully', services);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve services', 500);
    }
  }
}

module.exports = new ServiceController();