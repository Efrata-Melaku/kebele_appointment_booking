const { APPOINTMENT_NUMBER_PREFIX } = require('../config/constants');

const generateAppointmentNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Generate a random 4-digit number
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${APPOINTMENT_NUMBER_PREFIX}-${year}${month}${day}-${random}`;
};

module.exports = generateAppointmentNumber;