const prisma = require('../../prisma/client');
const { successResponse, errorResponse } = require('../../utils/response');

class BookingController {
  /** GET /api/user/booking/services — all bookable services (no department step) */
  async listServices(req, res) {
    try {
      const services = await prisma.service.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          durationInMinutes: true,
          staffCount: true,
          requiredDocuments: true,
          department: { select: { name: true } },
          _count: {
            select: {
              formFields: { where: { isActive: true } },
            },
          },
        },
      });

      const catalog = services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationInMinutes: s.durationInMinutes,
        staffCount: s.staffCount,
        requiredDocuments: s.requiredDocuments,
        departmentName: s.department?.name ?? null,
        activeFieldCount: s._count.formFields,
        bookable: s.staffCount > 0,
      }));

      successResponse(res, 'Services catalog retrieved successfully', catalog);
    } catch (error) {
      errorResponse(res, 'Failed to load services', 500);
    }
  }

  /** GET /api/user/booking/services/:serviceId — detail for booking page */
  async getServiceDetail(req, res) {
    try {
      const serviceId = parseInt(req.params.serviceId, 10);
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          name: true,
          description: true,
          durationInMinutes: true,
          staffCount: true,
          requiredDocuments: true,
          department: { select: { name: true } },
          formFields: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              label: true,
              fieldType: true,
              placeholder: true,
              required: true,
              options: true,
              order: true,
            },
          },
        },
      });

      if (!service) {
        return errorResponse(res, 'Service not found', 404);
      }

      successResponse(res, 'Service detail retrieved successfully', {
        ...service,
        departmentName: service.department?.name ?? null,
        bookable: service.staffCount > 0,
        fields: service.formFields,
      });
    } catch (error) {
      errorResponse(res, 'Failed to load service', 500);
    }
  }
}

module.exports = new BookingController();
