const Joi = require('joi');
const { GENDER_OPTIONS } = require('../config/constants');

// Auth validators
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
});

// Department validators
const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

// Service validators
const createServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null).optional(),
  durationInMinutes: Joi.number().integer().min(1).max(480).required(),
  staffCount: Joi.number().integer().min(1).max(100).required(),
  requiredDocuments: Joi.string().allow('', null).optional(),
  hasTeyazeRequirement: Joi.boolean().default(false),
  departmentId: Joi.number().integer().required(),
});

// TimeSlot validators
const generateTimeSlotsSchema = Joi.object({
  departmentId: Joi.number().integer().required(),
  serviceId: Joi.number().integer().required(),
  date: Joi.date().required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
});

// Appointment validators
const createAppointmentSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  gender: Joi.string().valid(...Object.values(GENDER_OPTIONS)).required(),
  serviceId: Joi.number().integer().required(),
  timeSlotId: Joi.number().integer().required(),
});

const rescheduleAppointmentSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  timeSlotId: Joi.number().integer().required(),
});

const cancelAppointmentQuerySchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
});

// Feedback validators
const createFeedbackSchema = Joi.object({
  appointmentId: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().max(1000).allow('', null).optional(),
}).or('rating', 'comment');

const updateFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().max(1000).allow('', null).optional(),
}).or('rating', 'comment');

// Staff validators (API accepts lowercase; mapped to Prisma enums in controller)
const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'completed', 'rescheduled', 'not_served')
    .required(),
});

module.exports = {
  loginSchema,
  registerStaffSchema,
  createDepartmentSchema,
  createServiceSchema,
  generateTimeSlotsSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentQuerySchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  updateAppointmentStatusSchema,
};
