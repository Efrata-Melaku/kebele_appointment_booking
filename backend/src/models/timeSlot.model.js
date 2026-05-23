/**
 * Time slots are generated dynamically (not stored as rows).
 * This model wraps appointment-based slot capacity queries.
 */
const appointmentModel = require('./appointment.model');

module.exports = {
  countSlotBookings: appointmentModel.countSlotBookings,
  findBookingsForServiceDay: appointmentModel.findAppointmentsByServiceAndDay,
};
