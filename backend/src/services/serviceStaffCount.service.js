const userModel = require('../models/user.model');
const serviceModel = require('../models/service.model');

async function recalculateStaffCountForService(serviceId) {
  const count = await userModel.countStaffAssignments({
    serviceId: Number(serviceId),
    staff: { role: 'STAFF', isActive: true },
  });

  await serviceModel.updateService(serviceId, { staffCount: count });

  return count;
}

/**
 * Recalculate staff_count for every service a staff member was linked to.
 */
async function recalculateServicesForStaffUser(staffUserId) {
  const links = await userModel.findStaffAssignments(
    { staffUserId: Number(staffUserId) },
    { select: { serviceId: true } }
  );
  const ids = [...new Set(links.map((l) => l.serviceId))];
  for (const sid of ids) {
    await recalculateStaffCountForService(sid);
  }
}

module.exports = {
  recalculateStaffCountForService,
  recalculateServicesForStaffUser,
};
