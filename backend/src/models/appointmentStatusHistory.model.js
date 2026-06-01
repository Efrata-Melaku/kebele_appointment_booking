const { getClient } = require('./_client');

async function createStatusHistory(data, tx) {
  return getClient(tx).appointmentStatusHistory.create({ data });
}

async function findStatusHistoryByAppointmentId(appointmentId, tx) {
  return getClient(tx).appointmentStatusHistory.findMany({
    where: { appointmentId: Number(appointmentId) },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

module.exports = {
  createStatusHistory,
  findStatusHistoryByAppointmentId,
};
