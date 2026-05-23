const { getClient } = require('./_client');

async function findResidentByPhone(phone, options = {}, tx) {
  return getClient(tx).resident.findUnique({
    where: { phone },
    ...options,
  });
}

async function findResidentById(id, options = {}, tx) {
  return getClient(tx).resident.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function upsertResident(where, create, update, options = {}, tx) {
  return getClient(tx).resident.upsert({
    where,
    create,
    update,
    ...options,
  });
}

async function createResident(data, tx) {
  return getClient(tx).resident.create({ data });
}

async function updateResident(id, data, tx) {
  return getClient(tx).resident.update({
    where: { id: Number(id) },
    data,
  });
}

module.exports = {
  findResidentByPhone,
  findResidentById,
  upsertResident,
  createResident,
  updateResident,
};
