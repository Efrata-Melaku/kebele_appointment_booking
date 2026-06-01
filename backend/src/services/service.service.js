const serviceModel = require('../models/service.model');
const departmentModel = require('../models/department.model');
const appointmentModel = require('../models/appointment.model');
const { getClient, runTransaction } = require('../models/_client');
const { ConflictError, NotFoundError } = require('../utils/AppError');

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

class ServiceService {
  async createService(payload) {
    const { name, description, durationInMinutes, staffCount, departmentId, requiredDocuments } =
      payload;

    const department = await departmentModel.findDepartmentById(departmentId);
    if (!department) {
      throw new NotFoundError('Department not found');
    }

    const duplicate = await serviceModel.findFirstServiceByNameAndDepartment(
      String(name).trim(),
      departmentId
    );
    if (duplicate) {
      throw new ConflictError('Service with this name already exists in the department');
    }

    return serviceModel.createService(
      {
        name: String(name).trim(),
        description: description || null,
        durationInMinutes: Number(durationInMinutes),
        staffCount: staffCount != null ? Number(staffCount) : 1,
        departmentId: Number(departmentId),
        requiredDocuments: requiredDocuments || null,
      },
      { include: { department: true } }
    );
  }

  async getServices(options = {}) {
    return serviceModel.findManyServices({
      orderBy: { name: 'asc' },
      include: {
        department: true,
        _count: { select: { appointments: true, formFields: true } },
      },
      ...options,
    });
  }

  async getServiceById(id, options = {}) {
    const prismaQuery = options.select
      ? { select: options.select }
      : { include: options.include ?? { department: true } };

    const service = await serviceModel.findServiceById(id, prismaQuery);
    if (!service) {
      throw new NotFoundError('Service not found');
    }
    return service;
  }

  async updateService(id, payload) {
    const { name, description, durationInMinutes, staffCount, departmentId, requiredDocuments } =
      payload;

    if (departmentId != null) {
      const department = await departmentModel.findDepartmentById(departmentId);
      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    if (name != null && departmentId != null) {
      const dup = await serviceModel.findFirstServiceByNameAndDepartment(
        String(name).trim(),
        departmentId,
        id
      );
      if (dup) {
        throw new ConflictError('Service with this name already exists in the department');
      }
    }

    try {
      return await serviceModel.updateService(
        id,
        {
          ...(name != null ? { name: String(name).trim() } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(durationInMinutes != null ? { durationInMinutes: Number(durationInMinutes) } : {}),
          ...(staffCount != null ? { staffCount: Number(staffCount) } : {}),
          ...(departmentId != null ? { departmentId: Number(departmentId) } : {}),
          ...(requiredDocuments !== undefined ? { requiredDocuments } : {}),
        },
        { include: { department: true } }
      );
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Service not found');
      }
      throw err;
    }
  }

  async deleteService(id) {
    const serviceId = Number(id);
    const service = await serviceModel.findServiceById(serviceId);
    if (!service) {
      throw new NotFoundError('Service not found');
    }

    const today = startOfTodayLocal();
    const blockingAppointments = await appointmentModel.countAppointments({
      serviceId,
      OR: [
        { status: { in: ['PENDING', 'RESCHEDULED'] } },
        {
          AND: [{ slotDate: { gte: today } }, { status: { not: 'CANCELLED' } }],
        },
      ],
    });

    if (blockingAppointments > 0) {
      throw new ConflictError(
        'This service cannot be deleted because appointments are associated with it.'
      );
    }

    try {
      await runTransaction(async (tx) => {
        const db = getClient(tx);
        await db.staffServiceAssignment.deleteMany({ where: { serviceId } });
        await db.serviceFormField.deleteMany({ where: { serviceId } });
        await db.serviceScheduleOverride.deleteMany({ where: { serviceId } });
        await db.serviceFormSubmission.deleteMany({ where: { serviceId } });
        await db.service.delete({ where: { id: serviceId } });
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Service not found');
      }
      throw err;
    }
  }

  async getPublicCatalog() {
    const services = await serviceModel.findManyServices({
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

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationInMinutes: s.durationInMinutes,
      requiredDocuments: s.requiredDocuments,
      departmentName: s.department?.name ?? null,
      activeFieldCount: s._count.formFields,
      bookable: s.staffCount > 0,
    }));
  }

  async getPublicServiceDetail(serviceId) {
    const service = await serviceModel.findServiceById(serviceId, {
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
      throw new NotFoundError('Service not found');
    }

    const { staffCount, formFields, department, ...publicFields } = service;
    return {
      id: publicFields.id,
      name: publicFields.name,
      description: publicFields.description,
      durationInMinutes: publicFields.durationInMinutes,
      requiredDocuments: publicFields.requiredDocuments,
      departmentName: department?.name ?? null,
      bookable: staffCount > 0,
      fields: formFields,
    };
  }

  async getServiceFormFields(serviceId) {
    const exists = await serviceModel.findServiceById(serviceId, { select: { id: true } });
    if (!exists) {
      throw new NotFoundError('Service not found');
    }
    return serviceFormFieldModel.findManyFormFields({
      where: { serviceId: Number(serviceId) },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  async getAdminServices() {
    return serviceModel.findManyServices({
      include: {
        department: true,
        _count: {
          select: { appointments: true, staffServiceAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Flat list for staff assignment picker (searchable multi-select). */
  async getServicePickerOptions() {
    const rows = await serviceModel.findManyServices({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      departmentId: s.departmentId,
      departmentName: s.department?.name ?? '',
    }));
  }

  async getServiceDetailWithFields(id) {
    const service = await serviceModel.findServiceById(id, {
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
      throw new NotFoundError('Service not found');
    }
    return service;
  }

  async getServicesByDepartment(departmentId) {
    return serviceModel.findManyServices({
      where: { departmentId: Number(departmentId) },
      include: {
        department: true,
        _count: {
          select: { appointments: true, staffServiceAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async checkDuplicateService(departmentId, name) {
    const trimmed = String(name).trim();
    const duplicate = await serviceModel.findFirstServiceByNameAndDepartment(
      trimmed,
      departmentId
    );
    return { exists: Boolean(duplicate) };
  }

  async getUserFormFields(serviceId) {
    const service = await serviceModel.findServiceById(serviceId, {
      select: { id: true, name: true, departmentId: true },
    });
    if (!service) {
      throw new NotFoundError('Service not found');
    }
    const fields = await serviceFormFieldModel.findManyFormFields({
      where: { serviceId: Number(serviceId), isActive: true },
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
    return { service, fields };
  }

  async countServices() {
    return serviceModel.countServices();
  }
}

module.exports = new ServiceService();
