const submissionModel = require('../models/serviceFormSubmission.model');
const submissionValueModel = require('../models/serviceFormSubmissionValue.model');

function coerceDisplayValue(fieldType, stored) {
  if (stored == null || stored === '') return null;
  if (fieldType === 'checkbox') {
    return stored === 'true' || stored === '1';
  }
  if (fieldType === 'number') {
    const n = Number(stored);
    return Number.isNaN(n) ? stored : n;
  }
  return stored;
}

const fieldSelect = {
  id: true,
  label: true,
  fieldType: true,
  placeholder: true,
  required: true,
  options: true,
  order: true,
  isActive: true,
  serviceId: true,
};

function mapValuesToApiShape(values, { includeInactiveFields = true } = {}) {
  return values
    .filter((v) => includeInactiveFields || v.formField.isActive)
    .map((v) => ({
      id: v.id,
      formFieldId: v.formFieldId,
      value: v.value,
      displayValue: coerceDisplayValue(v.formField.fieldType, v.value),
      field: v.formField,
    }));
}

/**
 * Create submission header + values inside a transaction.
 */
async function createSubmission(
  tx,
  { serviceId, appointmentId, residentId, rows, fileMetaByFieldId = {} }
) {
  const submission = await submissionModel.createSubmission(
    {
      serviceId,
      appointmentId,
      residentId,
    },
    tx
  );

  if (rows?.length) {
    await submissionValueModel.createManySubmissionValues(
      rows.map((r) => ({
        submissionId: submission.id,
        formFieldId: r.formFieldId,
        value: r.value,
      })),
      tx
    );

    const values = await submissionValueModel.findManySubmissionValues(
      {
        where: { submissionId: submission.id },
        include: { formField: { select: { id: true, fieldType: true } } },
      },
      tx
    );

    for (const v of values) {
      if (v.formField.fieldType !== 'file') continue;
      const meta = fileMetaByFieldId[v.formFieldId];
      if (!meta?.fileUrl) continue;

      await submissionModel.createUploadedFile(
        {
          appointmentId,
          submissionValueId: v.id,
          fileName: meta.fileName || fileNameFromUrl(meta.fileUrl),
          fileUrl: meta.fileUrl,
          fileType: meta.fileType || null,
        },
        tx
      );
    }
  }

  return submission;
}

async function loadSubmissionByAppointmentId(appointmentId, options = {}) {
  const submission = await submissionModel.findSubmissionByAppointmentId(appointmentId, {
    include: {
      values: {
        include: { formField: { select: fieldSelect } },
        orderBy: [{ formField: { order: 'asc' } }, { formFieldId: 'asc' }],
      },
      service: { select: { id: true, name: true } },
    },
  });

  if (!submission) {
    return { submission: null, formResponses: [] };
  }

  return {
    submission,
    formResponses: mapValuesToApiShape(submission.values, options),
  };
}

async function attachSubmissionToAppointment(appointment, options = {}) {
  if (!appointment?.id) return appointment;
  const { formResponses, submission } = await loadSubmissionByAppointmentId(appointment.id, options);
  return {
    ...appointment,
    formSubmission: submission,
    formResponses,
  };
}

async function attachSubmissionsToMany(appointments, options = {}) {
  if (!appointments.length) return appointments;
  const ids = appointments.map((a) => a.id);

  const submissions = await submissionModel.findManySubmissions({
    where: { appointmentId: { in: ids } },
    include: {
      values: {
        include: { formField: { select: fieldSelect } },
        orderBy: [{ formField: { order: 'asc' } }, { formFieldId: 'asc' }],
      },
    },
  });

  const byApt = new Map();
  for (const s of submissions) {
    byApt.set(s.appointmentId, {
      formSubmission: {
        id: s.id,
        serviceId: s.serviceId,
        appointmentId: s.appointmentId,
        residentId: s.residentId,
      },
      formResponses: mapValuesToApiShape(s.values, options),
    });
  }

  return appointments.map((a) => {
    const extra = byApt.get(a.id) || { formSubmission: null, formResponses: [] };
    return { ...a, ...extra };
  });
}

async function upsertSubmissionValues(
  tx,
  appointmentId,
  serviceId,
  residentId,
  rows,
  fileMetaByFieldId = {}
) {
  let submission = await submissionModel.findSubmissionByAppointmentId(appointmentId, {}, tx);

  if (!submission) {
    submission = await submissionModel.createSubmission(
      { serviceId, appointmentId, residentId },
      tx
    );
  }

  for (const row of rows) {
    await submissionValueModel.upsertSubmissionValue(
      {
        submissionId_formFieldId: {
          submissionId: submission.id,
          formFieldId: row.formFieldId,
        },
      },
      {
        submissionId: submission.id,
        formFieldId: row.formFieldId,
        value: row.value,
      },
      { value: row.value },
      tx
    );
  }

  for (const row of rows) {
    const meta = fileMetaByFieldId[row.formFieldId];
    if (!meta?.fileUrl) continue;

    const valueRow = await submissionValueModel.findSubmissionValue(
      {
        submissionId_formFieldId: {
          submissionId: submission.id,
          formFieldId: row.formFieldId,
        },
      },
      { include: { formField: { select: { fieldType: true } } } },
      tx
    );

    if (!valueRow || valueRow.formField.fieldType !== 'file') continue;

    const existing = await submissionModel.findUploadedFile(
      { submissionValueId: valueRow.id },
      tx
    );

    if (existing) {
      await submissionModel.updateUploadedFile(
        existing.id,
        {
          fileName: meta.fileName || existing.fileName,
          fileUrl: meta.fileUrl,
          fileType: meta.fileType || null,
        },
        tx
      );
    } else {
      await submissionModel.createUploadedFile(
        {
          appointmentId,
          submissionValueId: valueRow.id,
          fileName: meta.fileName || fileNameFromUrl(meta.fileUrl),
          fileUrl: meta.fileUrl,
          fileType: meta.fileType || null,
        },
        tx
      );
    }
  }

  return submission;
}

async function searchByFieldValue(formFieldId, valueFragment) {
  return submissionValueModel.searchSubmissionValues({
    where: {
      formFieldId,
      value: { contains: valueFragment },
    },
    include: {
      formField: { select: fieldSelect },
      submission: {
        include: {
          service: { select: { id: true, name: true } },
          appointment: {
            include: {
              group: {
                include: {
                  resident: { select: { fullName: true, phone: true } },
                },
              },
            },
          },
        },
      },
    },
    take: 100,
    orderBy: { updatedAt: 'desc' },
  });
}

/** @deprecated alias — returns formResponses array only */
async function loadResponsesForAppointment(appointmentId, options = {}) {
  const { formResponses } = await loadSubmissionByAppointmentId(appointmentId, options);
  return formResponses;
}

function fileNameFromUrl(url) {
  if (!url) return '';
  const parts = String(url).split('/');
  return parts[parts.length - 1] || url;
}

/**
 * Staff-facing shape: dynamic labels/types, separate uploadedFiles list.
 */
async function loadUploadedFilesForAppointment(appointmentId) {
  return submissionModel.findUploadedFiles({
    where: { appointmentId },
    orderBy: { uploadedAt: 'asc' },
    include: {
      submissionValue: {
        include: { formField: { select: { label: true } } },
      },
    },
  });
}

function formatStaffFormPayload(formResponses, uploadedFileRows = []) {
  const uploadedFiles = [];
  const seenUrls = new Set();

  for (const uf of uploadedFileRows) {
    const label = uf.submissionValue?.formField?.label || 'Document';
    if (!seenUrls.has(uf.fileUrl)) {
      uploadedFiles.push({
        id: uf.id,
        fieldLabel: label,
        fileUrl: uf.fileUrl,
        fileName: uf.fileName,
        fileType: uf.fileType,
      });
      seenUrls.add(uf.fileUrl);
    }
  }

  const formatted = (formResponses || []).map((r) => {
    const fieldType = r.field?.fieldType || 'text';
    const fieldLabel = r.field?.label || 'Field';
    const raw = r.value ?? '';
    const display = r.displayValue ?? raw;

    if (fieldType === 'file' && raw) {
      const matched = uploadedFileRows.find((uf) => uf.submissionValue?.formFieldId === r.formFieldId);
      const fileUrl = matched?.fileUrl || raw;
      const fileName = matched?.fileName || fileNameFromUrl(fileUrl);
      if (!seenUrls.has(fileUrl)) {
        uploadedFiles.push({
          id: matched?.id,
          fieldLabel,
          fileUrl,
          fileName,
          fileType: matched?.fileType || null,
        });
        seenUrls.add(fileUrl);
      }
      return {
        fieldLabel,
        fieldType: 'file',
        value: fileName,
        fileUrl,
        fileName,
      };
    }

    return {
      fieldLabel,
      fieldType,
      value: display != null && display !== '' ? String(display) : '',
    };
  });

  return { formResponses: formatted, uploadedFiles };
}

module.exports = {
  createSubmission,
  loadSubmissionByAppointmentId,
  loadResponsesForAppointment,
  attachSubmissionToAppointment,
  attachSubmissionsToMany,
  upsertSubmissionValues,
  searchByFieldValue,
  coerceDisplayValue,
  loadUploadedFilesForAppointment,
  formatStaffFormPayload,
  fileNameFromUrl,
};
