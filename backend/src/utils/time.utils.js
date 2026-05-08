const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

const formatTime = (date) => {
  return date.toTimeString().slice(0, 5); // HH:MM format
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const isTimeBefore = (time1, time2) => {
  return time1.getTime() < time2.getTime();
};

const generateTimeSlots = (startTime, endTime, durationMinutes) => {
  const slots = [];
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    const slotEnd = addMinutes(currentTime, durationMinutes);

    if (slotEnd > endTime) break;

    slots.push({
      start: new Date(currentTime),
      end: new Date(slotEnd),
    });

    currentTime = slotEnd;
  }

  return slots;
};

module.exports = {
  addMinutes,
  formatTime,
  parseTime,
  isTimeBefore,
  generateTimeSlots,
};