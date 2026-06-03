const appointmentModel = require('../models/appointment.model');
const serviceModel = require('../models/service.model');
const { APPOINTMENT_STATUS } = require('../config/constants');
const { normalizeCalendarDay } = require('../utils/dateRange');
const {
  generateSlotIntervals,
  applyCapacityToSlots,
  toResidentSlotList,
  toAdminSlotList,
  atLocalDate,
  slotStartKey,
} = require('../utils/generateSlots');
const { resolveDaySchedule } = require('./overrideChecker.service');
const { closedReasonMessage, INVALID_SLOT_MESSAGE } = require('../utils/scheduleErrors');
const { logScheduleDebug } = require('../utils/scheduleMerge');

const ACTIVE_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.RESCHEDULED,
  APPOINTMENT_STATUS.NOT_SERVED,
];

function assertScheduleAllowsBooking(schedule) {
  if (!schedule.closed) return;
  throw new Error(closedReasonMessage(schedule.reason));
}

async function countBookingsForDay(serviceId, prismaDate) {
  const appointments = await appointmentModel.findAppointmentsByServiceAndDay(
    serviceId,
    prismaDate,
    ACTIVE_STATUSES
  );

  const map = new Map();
  for (const a of appointments) {
    const key = slotStartKey(a.slotStartTime);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/**
 * Internal: all intervals with capacity metadata.
 */
async function buildSlotsWithCapacity(serviceId, dateInput) {
  const serviceIdNum = Number(serviceId);
  const normalized = normalizeCalendarDay(dateInput);
  if (!normalized) {
    throw new Error('Invalid date');
  }

  const service = await serviceModel.findServiceById(serviceIdNum, {
    select: { id: true, durationInMinutes: true, staffCount: true },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const schedule = await resolveDaySchedule(serviceIdNum, normalized.ymd);
  assertScheduleAllowsBooking(schedule);

  const intervals = generateSlotIntervals({
    dayStart: schedule.dayStart,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    lunchStart: schedule.lunchStart,
    lunchEnd: schedule.lunchEnd,
    hasLunch: schedule.hasLunch,
    durationMinutes: service.durationInMinutes,
  });

  logScheduleDebug({
    phase: 'slot-generation',
    serviceId: serviceIdNum,
    date: normalized.ymd,
    durationMinutes: service.durationInMinutes,
    sources: schedule.sources,
    slotCount: intervals.length,
    slots: intervals.map((s) => ({ start: s.start, end: s.end })),
  });

  const bookedByStart = await countBookingsForDay(serviceIdNum, schedule.prismaDate);
  return applyCapacityToSlots(intervals, bookedByStart, service.staffCount);
}

/**
 * Resident booking: only available slots, no capacity/staff fields.
 */
async function getAvailableSlotsForResidents(serviceId, dateInput) {
  const withCapacity = await buildSlotsWithCapacity(serviceId, dateInput);
  return toResidentSlotList(withCapacity);
}

/**
 * Admin/staff: all slots including full ones, with capacity metadata.
 */
async function getAvailableSlotsForAdmin(serviceId, dateInput) {
  const withCapacity = await buildSlotsWithCapacity(serviceId, dateInput);
  return toAdminSlotList(withCapacity);
}

/** @deprecated Use getAvailableSlotsForResidents or getAvailableSlotsForAdmin */
async function getAvailableSlotsForServiceDate(serviceId, dateInput, options = {}) {
  const audience = options.audience || 'resident';
  if (audience === 'admin') {
    return getAvailableSlotsForAdmin(serviceId, dateInput);
  }
  return getAvailableSlotsForResidents(serviceId, dateInput);
}

/**
 * Resolve slot window and validate it exists in the generated schedule (booking guard).
 */
async function resolveBookableSlot(serviceId, dateInput, slotStartHHmm) {
  const serviceIdNum = Number(serviceId);
  const normalized = normalizeCalendarDay(dateInput);
  if (!normalized) {
    throw new Error('Invalid date');
  }

  const service = await serviceModel.findServiceById(serviceIdNum, {
    select: { id: true, durationInMinutes: true, staffCount: true },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const schedule = await resolveDaySchedule(serviceIdNum, normalized.ymd);
  assertScheduleAllowsBooking(schedule);

  const intervals = generateSlotIntervals({
    dayStart: schedule.dayStart,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    lunchStart: schedule.lunchStart,
    lunchEnd: schedule.lunchEnd,
    hasLunch: schedule.hasLunch,
    durationMinutes: service.durationInMinutes,
  });

  const match = intervals.find((s) => s.start === slotStartHHmm);
  if (!match) {
    throw new Error(INVALID_SLOT_MESSAGE);
  }

  const bookedByStart = await countBookingsForDay(serviceIdNum, schedule.prismaDate);
  const booked = bookedByStart.get(slotStartHHmm) || 0;
  if (service.staffCount <= 0 || booked >= service.staffCount) {
    throw new Error('Time slot is fully booked');
  }

  return {
    service,
    dayStart: schedule.prismaDate,
    slotStartTime: match.startAt,
    slotEndTime: match.endAt,
    staffCount: service.staffCount,
  };
}

/**
 * Count active bookings for exact slot (used inside transactions).
 */
async function countSlotBookings(tx, { serviceId, slotDate, slotStartTime }) {
  return appointmentModel.countSlotBookings(
    {
      serviceId,
      slotDate,
      slotStartTime,
      status: { in: ACTIVE_STATUSES },
    },
    tx
  );
}

async function assertSlotHasCapacity(
  tx,
  { serviceId, slotDate, slotStartTime, staffCount, excludeAppointmentId }
) {
  const where = {
    serviceId,
    slotDate,
    slotStartTime,
    status: { in: ACTIVE_STATUSES },
  };
  if (excludeAppointmentId != null) {
    where.id = { not: Number(excludeAppointmentId) };
  }
  const booked = await appointmentModel.countSlotBookings(where, tx);
  if (booked >= staffCount || staffCount <= 0) {
    throw new Error('Time slot is fully booked');
  }
  return booked;
}

module.exports = {
  getAvailableSlotsForResidents,
  getAvailableSlotsForAdmin,
  getAvailableSlotsForServiceDate,
  resolveBookableSlot,
  countSlotBookings,
  assertSlotHasCapacity,
  atLocalDate,
};
