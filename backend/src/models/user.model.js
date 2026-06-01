const { getClient } = require('./_client');

async function findUserByEmail(email, options = {}, tx) {
  return getClient(tx).user.findUnique({
    where: { email },
    ...options,
  });
}

async function findUserById(id, options = {}, tx) {
  return getClient(tx).user.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findFirstUser(where, options = {}, tx) {
  return getClient(tx).user.findFirst({
    where,
    ...options,
  });
}

async function createUser(data, options = {}, tx) {
  return getClient(tx).user.create({ data, ...options });
}

async function updateUser(id, data, tx) {
  return getClient(tx).user.update({
    where: { id: Number(id) },
    data,
  });
}

async function deleteUser(id, tx) {
  return getClient(tx).user.delete({
    where: { id: Number(id) },
  });
}

async function deleteManyUsers(where, tx) {
  return getClient(tx).user.deleteMany({ where });
}

async function findManyUsers(options = {}, tx) {
  return getClient(tx).user.findMany(options);
}

async function countUsers(where = {}, tx) {
  return getClient(tx).user.count({ where });
}

async function findStaffAssignment(staffUserId, serviceId, tx) {
  return getClient(tx).staffServiceAssignment.findUnique({
    where: {
      staffUserId_serviceId: {
        staffUserId: Number(staffUserId),
        serviceId: Number(serviceId),
      },
    },
  });
}

async function findStaffAssignmentsByUser(staffUserId, tx) {
  return getClient(tx).staffServiceAssignment.findMany({
    where: { staffUserId: Number(staffUserId) },
    select: { serviceId: true },
  });
}

async function createStaffAssignment(data, tx) {
  return getClient(tx).staffServiceAssignment.create({ data });
}

async function deleteStaffAssignmentsForUser(staffUserId, tx) {
  return getClient(tx).staffServiceAssignment.deleteMany({
    where: { staffUserId: Number(staffUserId) },
  });
}

async function createManyStaffAssignments(data, tx) {
  return getClient(tx).staffServiceAssignment.createMany({ data });
}

async function countStaffAssignments(where = {}, tx) {
  return getClient(tx).staffServiceAssignment.count({ where });
}

async function findStaffAssignments(where = {}, options = {}, tx) {
  return getClient(tx).staffServiceAssignment.findMany({ where, ...options });
}

async function countStaff(where = {}, tx) {
  return getClient(tx).user.count({ where });
}

module.exports = {
  findUserByEmail,
  findUserById,
  findFirstUser,
  createUser,
  updateUser,
  deleteUser,
  deleteManyUsers,
  findManyUsers,
  countUsers,
  countStaff,
  findStaffAssignment,
  findStaffAssignmentsByUser,
  createStaffAssignment,
  deleteStaffAssignmentsForUser,
  createManyStaffAssignments,
  countStaffAssignments,
  findStaffAssignments,
};
