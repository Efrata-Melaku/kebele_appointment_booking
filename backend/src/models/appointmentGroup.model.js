const { getClient } = require('./_client');

async function createAppointmentGroup(data, options = {}, tx) {
  return getClient(tx).appointmentGroup.create({ data, ...options });
}

async function findGroupByAppointmentNumber(appointmentNumber, options = {}, tx) {
  return getClient(tx).appointmentGroup.findUnique({
    where: { appointmentNumber },
    ...options,
  });
}

async function findGroupById(id, options = {}, tx) {
  return getClient(tx).appointmentGroup.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

module.exports = {
  createAppointmentGroup,
  findGroupByAppointmentNumber,
  findGroupById,
};
