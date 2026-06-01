const { getClient } = require('./_client');

async function findAppointmentById(id, options = {}, tx) {
  return getClient(tx).appointment.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findFirstAppointment(where, options = {}, tx) {
  return getClient(tx).appointment.findFirst({
    where,
    ...options,
  });
}

async function findManyAppointments(options = {}, tx) {
  return getClient(tx).appointment.findMany(options);
}

async function createAppointment(data, options = {}, tx) {
  return getClient(tx).appointment.create({ data, ...options });
}

async function updateAppointment(id, data, options = {}, tx) {
  return getClient(tx).appointment.update({
    where: { id: Number(id) },
    data,
    ...options,
  });
}

async function countAppointments(where = {}, tx) {
  return getClient(tx).appointment.count({ where });
}

async function countSlotBookings(where, tx) {
  return getClient(tx).appointment.count({ where });
}

async function findAppointmentsByServiceAndDay(serviceId, slotDate, statuses, tx) {
  return getClient(tx).appointment.findMany({
    where: {
      serviceId: Number(serviceId),
      slotDate,
      status: { in: statuses },
    },
    select: { slotStartTime: true },
  });
}

/** Appointments on a calendar day that still need a reminder SMS. */
async function findAppointmentsNeedingReminderForDay(dayStart, statuses, tx) {
  return getClient(tx).appointment.findMany({
    where: {
      slotDate: dayStart,
      reminderSent: false,
      status: { in: statuses },
    },
    include: {
      service: { select: { id: true, name: true } },
      group: {
        include: {
          resident: { select: { id: true, phone: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: { slotStartTime: 'asc' },
  });
}

async function markReminderSent(appointmentId, tx) {
  return getClient(tx).appointment.update({
    where: { id: Number(appointmentId) },
    data: {
      reminderSent: true,
      reminderSentAt: new Date(),
    },
  });
}

async function markConfirmationEmailSent(appointmentId, tx) {
  return getClient(tx).appointment.update({
    where: { id: Number(appointmentId) },
    data: {
      confirmationEmailSent: true,
      confirmationEmailSentAt: new Date(),
    },
  });
}

module.exports = {
  findAppointmentById,
  findFirstAppointment,
  findManyAppointments,
  createAppointment,
  updateAppointment,
  countAppointments,
  countSlotBookings,
  findAppointmentsByServiceAndDay,
  findAppointmentsNeedingReminderForDay,
  markReminderSent,
  markConfirmationEmailSent,
};
