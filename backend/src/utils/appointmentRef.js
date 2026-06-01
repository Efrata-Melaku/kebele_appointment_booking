const { APPOINTMENT_NUMBER_PREFIX } = require('../config/constants');

const APPOINTMENT_NUMBER_REGEX = new RegExp(
  `^${APPOINTMENT_NUMBER_PREFIX}-\\d{8}-\\d{4}$`
);

function isAppointmentNumberRef(ref) {
  return typeof ref === 'string' && APPOINTMENT_NUMBER_REGEX.test(ref.trim());
}

module.exports = { isAppointmentNumberRef };
