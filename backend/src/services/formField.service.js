const prisma = require('../prisma/client');
const { assertValidFieldType, parseOptions } = require('./dynamicForm.service');

function normalizeOptionsInput(options) {
  if (options == null) return null;
  if (Array.isArray(options)) {
    const arr = options.map((o) => String(o).trim()).filter(Boolean);
    return arr.length ? JSON.stringify(arr) : null;
  }
  const s = String(options).trim();
  if (!s) return null;
  if (s.startsWith('[')) return s;
  const arr = s.split(',').map((o) => o.trim()).filter(Boolean);
  return arr.length ? JSON.stringify(arr) : null;
}

async function assertServiceExists(serviceId) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    throw err;
  }
  return service;
}

async function assertUniqueLabel(serviceId, label, excludeFieldId = null) {
  const normalized = String(label).trim().toLowerCase();
  const fields = await prisma.serviceFormField.findMany({
    where: {
      serviceId,
      isActive: true,
      ...(excludeFieldId ? { id: { not: excludeFieldId } } : {}),
    },
    select: { id: true, label: true },
  });
  const dup = fields.find((f) => f.label.trim().toLowerCase() === normalized);
  if (dup) {
    const err = new Error(`A field with label "${label}" already exists for this service`);
    err.statusCode = 400;
    throw err;
  }
}

function validateFieldPayload(payload, { isUpdate = false } = {}) {
  const { label, fieldType, placeholder, required, options } = payload;

  if (!isUpdate || label !== undefined) {
    if (!label || String(label).trim().length === 0) {
      throw Object.assign(new Error('label is required'), { statusCode: 400 });
    }
  }

  if (!isUpdate || fieldType !== undefined) {
    assertValidFieldType(fieldType);
    if (fieldType === 'select' || fieldType === 'radio') {
      const opts = parseOptions(normalizeOptionsInput(options));
      if (opts.length < 2) {
        throw Object.assign(
          new Error('select/radio fields require at least two options'),
          { statusCode: 400 }
        );
      }
    }
  }
}

async function getNextOrder(serviceId) {
  const max = await prisma.serviceFormField.aggregate({
    where: { serviceId },
    _max: { order: true },
  });
  return (max._max.order ?? -1) + 1;
}

async function listFieldsForService(serviceId, { activeOnly = false } = {}) {
  return prisma.serviceFormField.findMany({
    where: {
      serviceId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
}

async function createField(serviceId, payload) {
  await assertServiceExists(serviceId);
  validateFieldPayload(payload);
  await assertUniqueLabel(serviceId, payload.label);

  const order =
    typeof payload.order === 'number' ? payload.order : await getNextOrder(serviceId);

  return prisma.serviceFormField.create({
    data: {
      serviceId,
      label: String(payload.label).trim(),
      fieldType: payload.fieldType,
      placeholder: payload.placeholder != null ? String(payload.placeholder) : null,
      required: Boolean(payload.required),
      options: normalizeOptionsInput(payload.options),
      order,
      isActive: true,
    },
  });
}

async function updateField(fieldId, payload) {
  const existing = await prisma.serviceFormField.findUnique({ where: { id: fieldId } });
  if (!existing) {
    throw Object.assign(new Error('Form field not found'), { statusCode: 404 });
  }

  validateFieldPayload(
    {
      label: payload.label ?? existing.label,
      fieldType: payload.fieldType ?? existing.fieldType,
      options: payload.options !== undefined ? payload.options : existing.options,
    },
    { isUpdate: true }
  );

  if (payload.label !== undefined) {
    await assertUniqueLabel(existing.serviceId, payload.label, fieldId);
  }

  const fieldType = payload.fieldType ?? existing.fieldType;
  if (payload.isActive === false) {
    // allow deactivation without option validation
  } else if (fieldType === 'select' || fieldType === 'radio') {
    const opts = parseOptions(
      normalizeOptionsInput(payload.options !== undefined ? payload.options : existing.options)
    );
    if (opts.length < 2) {
      throw Object.assign(
        new Error('select/radio fields require at least two options'),
        { statusCode: 400 }
      );
    }
  }

  return prisma.serviceFormField.update({
    where: { id: fieldId },
    data: {
      ...(payload.label !== undefined ? { label: String(payload.label).trim() } : {}),
      ...(payload.fieldType !== undefined ? { fieldType: payload.fieldType } : {}),
      ...(payload.placeholder !== undefined
        ? { placeholder: payload.placeholder != null ? String(payload.placeholder) : null }
        : {}),
      ...(payload.required !== undefined ? { required: Boolean(payload.required) } : {}),
      ...(payload.options !== undefined
        ? { options: normalizeOptionsInput(payload.options) }
        : {}),
      ...(payload.order !== undefined ? { order: Number(payload.order) } : {}),
      ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {}),
    },
  });
}

/** Soft delete — preserves historical appointment responses */
async function deactivateField(fieldId) {
  const existing = await prisma.serviceFormField.findUnique({ where: { id: fieldId } });
  if (!existing) {
    throw Object.assign(new Error('Form field not found'), { statusCode: 404 });
  }
  return prisma.serviceFormField.update({
    where: { id: fieldId },
    data: { isActive: false },
  });
}

async function reorderFields(serviceId, orderedIds) {
  await assertServiceExists(serviceId);
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw Object.assign(new Error('orderedIds must be a non-empty array'), { statusCode: 400 });
  }

  const fields = await prisma.serviceFormField.findMany({
    where: { serviceId },
    select: { id: true },
  });
  const validIds = new Set(fields.map((f) => f.id));
  for (const id of orderedIds) {
    if (!validIds.has(Number(id))) {
      throw Object.assign(new Error(`Field id ${id} does not belong to this service`), {
        statusCode: 400,
      });
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.serviceFormField.update({
        where: { id: Number(id) },
        data: { order: index },
      })
    )
  );

  return listFieldsForService(serviceId);
}

module.exports = {
  listFieldsForService,
  createField,
  updateField,
  deactivateField,
  reorderFields,
  normalizeOptionsInput,
};
