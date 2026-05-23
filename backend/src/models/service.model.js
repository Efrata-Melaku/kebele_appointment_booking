const { getClient } = require('./_client');

async function createService(data, options = {}, tx) {
  return getClient(tx).service.create({ data, ...options });
}

async function findServiceById(id, options = {}, tx) {
  return getClient(tx).service.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findFirstServiceByNameAndDepartment(name, departmentId, excludeId, tx) {
  return getClient(tx).service.findFirst({
    where: {
      departmentId: Number(departmentId),
      name,
      ...(excludeId != null ? { NOT: { id: Number(excludeId) } } : {}),
    },
  });
}

async function findManyServices(options = {}, tx) {
  return getClient(tx).service.findMany(options);
}

async function updateService(id, data, options = {}, tx) {
  return getClient(tx).service.update({
    where: { id: Number(id) },
    data,
    ...options,
  });
}

async function deleteService(id, tx) {
  return getClient(tx).service.delete({
    where: { id: Number(id) },
  });
}

async function countServices(where = {}, tx) {
  return getClient(tx).service.count({ where });
}

module.exports = {
  createService,
  findServiceById,
  findFirstServiceByNameAndDepartment,
  findManyServices,
  updateService,
  deleteService,
  countServices,
};
