const { getClient } = require('./_client');

async function createDepartment(data, tx) {
  return getClient(tx).department.create({ data });
}

async function findDepartmentById(id, options = {}, tx) {
  return getClient(tx).department.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findDepartmentByName(name, tx) {
  return getClient(tx).department.findUnique({
    where: { name },
  });
}

async function findFirstDepartmentByName(name, excludeId, tx) {
  return getClient(tx).department.findFirst({
    where: {
      name,
      ...(excludeId != null ? { NOT: { id: Number(excludeId) } } : {}),
    },
  });
}

async function getDepartments(options = {}, tx) {
  return getClient(tx).department.findMany({
    orderBy: { name: 'asc' },
    ...options,
  });
}

async function updateDepartment(id, data, tx) {
  return getClient(tx).department.update({
    where: { id: Number(id) },
    data,
  });
}

async function deleteDepartment(id, tx) {
  return getClient(tx).department.delete({
    where: { id: Number(id) },
  });
}

async function countDepartments(where = {}, tx) {
  return getClient(tx).department.count({ where });
}

async function countDepartmentServices(id, tx) {
  return getClient(tx).service.count({
    where: { departmentId: Number(id) },
  });
}

async function countDepartmentStaff(id, tx) {
  return getClient(tx).user.count({
    where: { departmentId: Number(id) },
  });
}

module.exports = {
  createDepartment,
  findDepartmentById,
  findDepartmentByName,
  findFirstDepartmentByName,
  getDepartments,
  updateDepartment,
  deleteDepartment,
  countDepartments,
  countDepartmentServices,
  countDepartmentStaff,
};
