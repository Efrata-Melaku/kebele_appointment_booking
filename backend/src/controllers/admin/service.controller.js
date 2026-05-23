const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');
class ServiceController {
  async createService(req, res) {
    try {
      const { name, description, durationInMinutes, requiredDocuments, departmentId } = req.body;

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return errorResponse(res, 'Department not found', 404);
      }

      const trimmedName = String(name).trim();
      const duplicate = await prisma.service.findFirst({
        where: {
          departmentId,
          name: trimmedName,
        },
      });

      if (duplicate) {
        return errorResponse(res, 'A service with this name already exists in the selected department', 400);
      }

      const service = await prisma.service.create({
        data: {
          name: trimmedName,
          description,
          durationInMinutes,
          staffCount: 0,
          requiredDocuments,
          departmentId,
        },
        include: {
          department: true,
        },
      });

      successResponse(res, 'Service created successfully', service, 201);
    } catch (error) {
      if (error.code === 'P2002') {
        return errorResponse(
          res,
          'A service with this name already exists in the selected department',
          400
        );
      }
      errorResponse(res, 'Failed to create service', 500);
    }
  }

  async getServices(req, res) {
    try {
      const services = await prisma.service.findMany({
        include: {
          department: true,
          _count: {
            select: { appointments: true, staffServiceAssignments: true },
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
        where: { id: parseInt(id, 10) },
        include: {
          department: true,
          formFields: {
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
          },
          _count: {
            select: { appointments: true, staffServiceAssignments: true },
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
      const { name, description, durationInMinutes, requiredDocuments, departmentId } = req.body;

      const trimmedName = String(name).trim();
      const dup = await prisma.service.findFirst({
        where: {
          departmentId,
          name: trimmedName,
          NOT: { id: parseInt(id, 10) },
        },
      });
      if (dup) {
        return errorResponse(res, 'A service with this name already exists in the selected department', 400);
      }

      const service = await prisma.service.update({
        where: { id: parseInt(id, 10) },
        data: {
          name: trimmedName,
          description,
          durationInMinutes,
          requiredDocuments,
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
        where: { id: parseInt(id, 10) },
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
        where: { departmentId: parseInt(departmentId, 10) },
        include: {
          department: true,
          _count: {
            select: { appointments: true, staffServiceAssignments: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      successResponse(res, 'Services retrieved successfully', services);
    } catch (error) {
      errorResponse(res, 'Failed to retrieve services', 500);
    }
  }

  /** GET /api/admin/services/duplicate-check?departmentId=&name= */
  async duplicateServiceCheck(req, res) {
    try {
      const departmentId = parseInt(String(req.query.departmentId), 10);
      const name = String(req.query.name || '').trim();
      if (!departmentId || !name) {
        return errorResponse(res, 'departmentId and name are required', 400);
      }
      const exists = await prisma.service.findFirst({
        where: { departmentId, name },
      });
      successResponse(res, 'OK', { exists: Boolean(exists) });
    } catch (error) {
      errorResponse(res, 'Check failed', 500);
    }
  }

  /** GET /api/user/services/:serviceId/form-fields */
  async getUserServiceFormFields(req, res) {
    try {
      const serviceId = parseInt(req.params.serviceId, 10);
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { id: true, name: true, departmentId: true },
      });
      if (!service) {
        return errorResponse(res, 'Service not found', 404);
      }
      const fields = await prisma.serviceFormField.findMany({
        where: { serviceId, isActive: true },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          label: true,
          fieldType: true,
          placeholder: true,
          required: true,
          options: true,
          order: true,
          isActive: true,
        },
      });
      successResponse(res, 'Form fields retrieved successfully', { service, fields });
    } catch (error) {
      errorResponse(res, 'Failed to retrieve form fields', 500);
    }
  }
}

module.exports = new ServiceController();
