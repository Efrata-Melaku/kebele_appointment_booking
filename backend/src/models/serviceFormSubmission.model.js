const { getClient } = require('./_client');

async function findSubmissionByAppointmentId(appointmentId, options = {}, tx) {
  return getClient(tx).serviceFormSubmission.findUnique({
    where: { appointmentId: Number(appointmentId) },
    ...options,
  });
}

async function findManySubmissions(options = {}, tx) {
  return getClient(tx).serviceFormSubmission.findMany(options);
}

async function createSubmission(data, tx) {
  return getClient(tx).serviceFormSubmission.create({ data });
}

async function findUploadedFiles(options = {}, tx) {
  return getClient(tx).uploadedFile.findMany(options);
}

async function findUploadedFile(where, tx) {
  return getClient(tx).uploadedFile.findUnique({ where });
}

async function createUploadedFile(data, tx) {
  return getClient(tx).uploadedFile.create({ data });
}

async function updateUploadedFile(id, data, tx) {
  return getClient(tx).uploadedFile.update({
    where: { id: Number(id) },
    data,
  });
}

module.exports = {
  findSubmissionByAppointmentId,
  findManySubmissions,
  createSubmission,
  findUploadedFiles,
  findUploadedFile,
  createUploadedFile,
  updateUploadedFile,
};
