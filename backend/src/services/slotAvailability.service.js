const prisma = require('../prisma/client');
const { APPOINTMENT_STATUS } = require('../config/constants');
const {
  parseDateParam,
  generateSlotIntervals,
  applyCapacityToSlots,
  atLocalDate,
  slotStartKey,
} = require('../utils/generateSlots');
const { resolveDaySchedule } = require('./overrideChecker.service');

const ACTIVE_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.RESCHEDULED,
  APPOINTMENT_STATUS.NOT_SERVED,
];

async function countBookingsForDay(serviceId, dayStart) {
  const appointments = await prisma.appointment.findMany({
    where: {
      serviceId,
      slotDate: dayStart,
      status: { in: ACTIVE_STATUSES },
    },
    select: { slotStartTime: true },
  });

  const map = new Map();
  for (const a of appointments) {
    const key = slotStartKey(a.slotStartTime);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

const CLOSED_HINTS = {
  non_working_day:
    'The office is closed on this day (weekend). Please choose a weekday (Monday–Friday).',
  office_closed: 'The office is closed on this date. Please choose another day.',
  service_disabled: 'This service is not available on the selected date.',
  no_staff:
    'No staff are assigned to this service yet. An administrator must assign staff before bookings can be made.',
};

function buildSlotsPayload({ closed, closedReason, hint, slots }) {
  return {
    closed: Boolean(closed),
    closedReason: closedReason || null,
    hint: hint || null,
    slots: slots || [],
  };
}

/** Mark same-day slots that have already started as unavailable. */
function applyPastSlotCutoff(slots, dayStart) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (dayStart.getTime() !== today.getTime()) {
    return slots;
  }

  return slots.map((slot) => {
    const [hours, minutes] = slot.start.split(':').map(Number);
    const slotAt = new Date(dayStart);
    slotAt.setHours(hours, minutes, 0, 0);
    if (slotAt.getTime() <= now.getTime()) {
      return { ...slot, available: false, remainingCapacity: 0 };
    }
    return slot;
  });
}

/**
 * Dynamically generate slots for a service/date with availability.
 */
async function getAvailableSlotsForServiceDate(serviceId, dateInput) {
  const serviceIdNum = Number(serviceId);
  const dayStart = parseDateParam(dateInput);
  if (!dayStart) {
    throw new Error('Invalid date');
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceIdNum },
    select: { id: true, durationInMinutes: true, staffCount: true },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  if (service.staffCount <= 0) {
    return buildSlotsPayload({
      closed: true,
      closedReason: 'no_staff',
      hint: CLOSED_HINTS.no_staff,
      slots: [],
    });
  }

  const schedule = await resolveDaySchedule(serviceIdNum, dayStart);
  if (schedule.closed) {
    return buildSlotsPayload({
      closed: true,
      closedReason: schedule.reason || 'closed',
      hint: CLOSED_HINTS[schedule.reason] || 'No appointments on this date.',
      slots: [],
    });
  }

  const intervals = generateSlotIntervals({
    dayStart: schedule.dayStart,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    lunchStart: schedule.lunchStart,
    lunchEnd: schedule.lunchEnd,
    durationMinutes: service.durationInMinutes,
  });

  const bookedByStart = await countBookingsForDay(serviceIdNum, dayStart);
  let slots = applyCapacityToSlots(intervals, bookedByStart, service.staffCount);
  slots = applyPastSlotCutoff(slots, dayStart);

  const availableCount = slots.filter((s) => s.available).length;
  let hint = null;
  if (slots.length > 0 && availableCount === 0) {
    hint = 'All time slots are fully booked for this date. Try another day or time.';
  }

  return buildSlotsPayload({ closed: false, slots, hint });
}

/**
 * Resolve slot window and validate it exists in the generated schedule.
 */
async function resolveBookableSlot(serviceId, dateInput, slotStartHHmm) {
  const serviceIdNum = Number(serviceId);
  const dayStart = parseDateParam(dateInput);
  if (!dayStart) {
    throw new Error('Invalid date');
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceIdNum },
    select: { id: true, durationInMinutes: true, staffCount: true },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const schedule = await resolveDaySchedule(serviceIdNum, dayStart);
  if (schedule.closed) {
    throw new Error('No appointments available on this date');
  }

  const intervals = generateSlotIntervals({
    dayStart: schedule.dayStart,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    lunchStart: schedule.lunchStart,
    lunchEnd: schedule.lunchEnd,
    durationMinutes: service.durationInMinutes,
  });

  const match = intervals.find((s) => s.start === slotStartHHmm);
  if (!match) {
    throw new Error('Invalid time slot for this date');
  }

  return {
    service,
    dayStart,
    slotStartTime: match.startAt,
    slotEndTime: match.endAt,
    staffCount: service.staffCount,
  };
}

/**
 * Count active bookings for exact slot (used inside transactions).
 */
async function countSlotBookings(tx, { serviceId, slotDate, slotStartTime }) {
  return tx.appointment.count({
    where: {
      serviceId,
      slotDate,
      slotStartTime,
      status: { in: ACTIVE_STATUSES },
    },
  });
}

async function assertSlotHasCapacity(tx, { serviceId, slotDate, slotStartTime, staffCount }) {
  const booked = await countSlotBookings(tx, { serviceId, slotDate, slotStartTime });
  if (booked >= staffCount || staffCount <= 0) {
    throw new Error('Time slot is fully booked');
  }
  return booked;
}

module.exports = {
  getAvailableSlotsForServiceDate,
  resolveBookableSlot,
  countSlotBookings,
  assertSlotHasCapacity,
  atLocalDate,
};
