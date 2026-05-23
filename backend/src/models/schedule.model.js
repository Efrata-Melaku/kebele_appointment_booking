const { getClient } = require('./_client');

async function findFirstWorkScheduleTemplate(options = {}, tx) {
  return getClient(tx).workScheduleTemplate.findFirst(options);
}

async function createWorkScheduleTemplate(data, tx) {
  return getClient(tx).workScheduleTemplate.create({ data });
}

async function updateWorkScheduleTemplate(id, data, tx) {
  return getClient(tx).workScheduleTemplate.update({
    where: { id: Number(id) },
    data,
  });
}

async function findOfficeOverrides(options = {}, tx) {
  return getClient(tx).officeScheduleOverride.findMany(options);
}

async function upsertOfficeOverride(where, create, update, tx) {
  return getClient(tx).officeScheduleOverride.upsert({ where, create, update });
}

async function deleteOfficeOverride(where, tx) {
  return getClient(tx).officeScheduleOverride.delete({ where });
}

async function findOfficeOverrideByDate(date, tx) {
  return getClient(tx).officeScheduleOverride.findUnique({
    where: { date },
  });
}

async function findServiceOverrides(options = {}, tx) {
  return getClient(tx).serviceScheduleOverride.findMany(options);
}

async function upsertServiceOverride(where, create, update, tx) {
  return getClient(tx).serviceScheduleOverride.upsert({ where, create, update });
}

async function deleteServiceOverride(where, tx) {
  return getClient(tx).serviceScheduleOverride.delete({ where });
}

async function findServiceOverrideByDate(date, serviceId, tx) {
  return getClient(tx).serviceScheduleOverride.findUnique({
    where: {
      date_serviceId: { date, serviceId: Number(serviceId) },
    },
  });
}

module.exports = {
  findFirstWorkScheduleTemplate,
  createWorkScheduleTemplate,
  updateWorkScheduleTemplate,
  findOfficeOverrides,
  upsertOfficeOverride,
  deleteOfficeOverride,
  findOfficeOverrideByDate,
  findServiceOverrides,
  upsertServiceOverride,
  deleteServiceOverride,
  findServiceOverrideByDate,
};
