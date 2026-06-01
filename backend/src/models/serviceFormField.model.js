const { getClient } = require('./_client');

async function findFormFieldById(id, options = {}, tx) {
  return getClient(tx).serviceFormField.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findManyFormFields(options = {}, tx) {
  return getClient(tx).serviceFormField.findMany(options);
}

async function createFormField(data, tx) {
  return getClient(tx).serviceFormField.create({ data });
}

async function updateFormField(id, data, tx) {
  return getClient(tx).serviceFormField.update({
    where: { id: Number(id) },
    data,
  });
}

async function aggregateMaxOrder(serviceId, tx) {
  return getClient(tx).serviceFormField.aggregate({
    where: { serviceId: Number(serviceId) },
    _max: { order: true },
  });
}

async function updateManyFormFields(where, data, tx) {
  return getClient(tx).serviceFormField.updateMany({ where, data });
}

module.exports = {
  findFormFieldById,
  findManyFormFields,
  createFormField,
  updateFormField,
  aggregateMaxOrder,
  updateManyFormFields,
};
