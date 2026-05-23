const appointmentService = require('./appointment.service');

/** @deprecated Use appointment.service admin methods directly */
module.exports = {
  getStats: (...args) => appointmentService.getAdminStats(...args),
  listAppointments: (...args) => appointmentService.listAdminAppointments(...args),
  getAppointmentDetail: (...args) => appointmentService.getAdminAppointmentDetail(...args),
};
