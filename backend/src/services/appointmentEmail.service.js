const emailService = require('./email.service');
const appointmentModel = require('../models/appointment.model');
const { attachTimeSlot } = require('../utils/appointmentSlot');
const { NotFoundError } = require('../utils/AppError');
const { isAppointmentNumberRef } = require('../utils/appointmentRef');
const {
  requireNormalizedPhone,
  assertPhoneMatchesResident,
} = require('../utils/ethiopianPhone');

const appointmentEmailInclude = {
  group: { include: { resident: true } },
  service: { include: { department: true } },
};

function buildEmailPayload(appointment) {
  const flat = attachTimeSlot(appointment);
  const resident = appointment.group?.resident;
  return {
    appointmentId: flat.id,
    email: resident?.email,
    residentName: resident?.fullName || 'Resident',
    appointmentNumber: appointment.group?.appointmentNumber,
    serviceName: appointment.service?.name || 'Kebele Service',
    departmentName: appointment.service?.department?.name || '',
    appointmentDate: flat.timeSlot?.date ?? flat.slotDate,
    appointmentTime: flat.timeSlot?.startTime ?? flat.slotStartTime,
    status: flat.status,
  };
}

async function sendConfirmationForAppointment(appointment) {
  const payload = buildEmailPayload(appointment);
  if (!payload.email) {
    return { success: false, skipped: true, message: 'Resident has no email address' };
  }

  const result = await emailService.sendAppointmentConfirmationEmail(payload);
  if (result.success && payload.appointmentId) {
    await appointmentModel.markConfirmationEmailSent(payload.appointmentId);
  }
  return result;
}

async function sendUpdateForAppointment(appointment) {
  const payload = buildEmailPayload(appointment);
  if (!payload.email) {
    return { success: false, skipped: true, message: 'Resident has no email address' };
  }
  return emailService.sendAppointmentUpdateEmail(payload);
}

async function sendCancellationForAppointment(appointment, partial = {}) {
  const payload = buildEmailPayload(appointment);
  const email = partial.email || payload.email;
  if (!email) {
    return { success: false, skipped: true, message: 'Resident has no email address' };
  }
  return emailService.sendAppointmentCancellationEmail({
    email,
    residentName: partial.residentName || payload.residentName,
    appointmentNumber: partial.appointmentNumber || payload.appointmentNumber,
    serviceName: partial.serviceName || payload.serviceName,
  });
}

async function sendReminderForAppointment(appointment) {
  const payload = buildEmailPayload(appointment);
  if (!payload.email) {
    return { success: false, skipped: true, message: 'Resident has no email address' };
  }
  return emailService.sendAppointmentReminderEmail(payload);
}

async function sendStatusChangeForAppointment(appointment, newStatus) {
  const payload = buildEmailPayload({ ...appointment, status: newStatus });
  if (!payload.email) {
    return { success: false, skipped: true, message: 'Resident has no email address' };
  }
  const status = String(newStatus).toUpperCase();
  if (status === 'COMPLETED') {
    return emailService.sendAppointmentCompletedEmail(payload);
  }
  if (status === 'NOT_SERVED') {
    return emailService.sendAppointmentNotServedEmail(payload);
  }
  if (status === 'RESCHEDULED') {
    return emailService.sendAppointmentRescheduledEmail(payload);
  }
  if (status === 'CANCELLED') {
    return emailService.sendAppointmentCancellationEmail(payload);
  }
  if (status === 'PENDING') {
    return emailService.sendAppointmentUpdateEmail(payload);
  }
  return emailService.sendAppointmentUpdateEmail(payload);
}

async function resendConfirmationByRef(appointmentRef, phone, appointmentItemId) {
  const normalizedPhone = requireNormalizedPhone(phone);
  const ref = String(appointmentRef).trim();

  let appointment;
  if (isAppointmentNumberRef(ref)) {
    const group = await appointmentModel.findFirstAppointment(
      { group: { appointmentNumber: ref } },
      { include: appointmentEmailInclude }
    );
    if (!group) throw new NotFoundError('Appointment not found');
    if (appointmentItemId != null) {
      appointment = await appointmentModel.findAppointmentById(Number(appointmentItemId), {
        include: appointmentEmailInclude,
      });
      if (!appointment || appointment.groupId !== group.groupId) {
        throw new NotFoundError('Appointment not found');
      }
    } else {
      appointment = group;
    }
  } else {
    appointment = await appointmentModel.findAppointmentById(Number(ref), {
      include: appointmentEmailInclude,
    });
  }

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  assertPhoneMatchesResident(appointment.group.resident.phone, normalizedPhone);

  return sendConfirmationForAppointment(appointment);
}

module.exports = {
  buildEmailPayload,
  sendConfirmationForAppointment,
  sendUpdateForAppointment,
  sendCancellationForAppointment,
  sendReminderForAppointment,
  sendStatusChangeForAppointment,
  resendConfirmationByRef,
};
