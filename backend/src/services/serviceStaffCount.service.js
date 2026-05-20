const prisma = require('../prisma/client');

async function recalculateStaffCountForService(serviceId) {
  const count = await prisma.staffServiceAssignment.count({
    where: {
      serviceId,
      staff: { role: 'STAFF', isActive: true },
    },
  });

  await prisma.service.update({
    where: { id: serviceId },
    data: { staffCount: count },
  });

  return count;
}

/**
 * Recalculate staff_count for every service a staff member was linked to.
 */
async function recalculateServicesForStaffUser(staffUserId) {
  const links = await prisma.staffServiceAssignment.findMany({
    where: { staffUserId },
    select: { serviceId: true },
  });
  const ids = [...new Set(links.map((l) => l.serviceId))];
  for (const sid of ids) {
    await recalculateStaffCountForService(sid);
  }
}

module.exports = {
  recalculateStaffCountForService,
  recalculateServicesForStaffUser,
};
