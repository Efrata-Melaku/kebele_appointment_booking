const Joi = require('joi');
const { GENDER_OPTIONS } = require('../config/constants');

const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Auth validators
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  departmentId: Joi.number().integer().positive().required(),
  serviceIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).allow('', null).optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow('', null).optional(),
  departmentId: Joi.number().integer().positive().allow(null).optional(),
  serviceIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

// Department validators
const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

// Service validators (staffCount is computed — never accepted from client)
const createServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null).optional(),
  durationInMinutes: Joi.number().integer().min(1).max(480).required(),
  requiredDocuments: Joi.string().allow('', null).optional(),
  hasTeyazeRequirement: Joi.boolean().default(false),
  departmentId: Joi.number().integer().required(),
});

const availableSlotsQuerySchema = Joi.object({
  serviceId: Joi.number().integer().positive().required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
});

const slotBookingFields = {
  slotDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  slotStart: Joi.string().pattern(timePattern).required(),
};

const formFieldTypes = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
];

const replaceServiceFormFieldsSchema = Joi.object({
  fields: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().min(1).max(200).required(),
        fieldType: Joi.string()
          .valid(...formFieldTypes)
          .required(),
        placeholder: Joi.string().max(500).allow('', null).optional(),
        required: Joi.boolean().default(false),
        options: Joi.alternatives()
          .try(Joi.string().max(5000), Joi.array().items(Joi.string()).min(1))
          .optional(),
        order: Joi.number().integer().min(0).optional(),
      })
    )
    .max(50)
    .required(),
});

const formFieldBodySchema = {
  label: Joi.string().min(1).max(200),
  fieldType: Joi.string().valid(...formFieldTypes),
  placeholder: Joi.string().max(500).allow('', null).optional(),
  required: Joi.boolean(),
  options: Joi.alternatives()
    .try(Joi.string().max(5000), Joi.array().items(Joi.string().min(1)).min(1))
    .optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
};

const createFormFieldSchema = Joi.object({
  label: formFieldBodySchema.label.required(),
  fieldType: formFieldBodySchema.fieldType.required(),
  placeholder: formFieldBodySchema.placeholder,
  required: formFieldBodySchema.required.default(false),
  options: formFieldBodySchema.options,
  order: formFieldBodySchema.order,
});

const updateFormFieldSchema = Joi.object({
  label: formFieldBodySchema.label,
  fieldType: formFieldBodySchema.fieldType,
  placeholder: formFieldBodySchema.placeholder,
  required: formFieldBodySchema.required,
  options: formFieldBodySchema.options,
  order: formFieldBodySchema.order,
  isActive: formFieldBodySchema.isActive,
}).min(1);

const reorderFormFieldsSchema = Joi.object({
  serviceId: Joi.number().integer().positive().required(),
  orderedIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});

const searchFormResponsesSchema = Joi.object({
  formFieldId: Joi.number().integer().positive().required(),
  value: Joi.string().min(1).max(500).required(),
});

/** JSON string of dynamic form values keyed by field id (multipart text field) */
const dynamicFormResponsesJson = Joi.string().max(100000).allow('', null).optional();

const updateAppointmentFormResponsesSchema = Joi.object({
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]+$/).required(),
  appointmentItemId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .optional(),
  responses: dynamicFormResponsesJson,
  dynamicFields: dynamicFormResponsesJson,
});

// Appointment validators
const createAppointmentSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]+$/).required(),
  gender: Joi.string().valid(...Object.values(GENDER_OPTIONS)).required(),
  serviceId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .required(),
  ...slotBookingFields,
  /** JSON object keyed by form field id (string) for non-file dynamic fields */
  responses: dynamicFormResponsesJson,
  dynamicFields: dynamicFormResponsesJson,
});

const rescheduleAppointmentSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  ...slotBookingFields,
  appointmentItemId: Joi.number().integer().positive().optional(),
});

const cancelAppointmentQuerySchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  appointmentItemId: Joi.number().integer().positive().optional(),
});

const addBookingServiceSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  serviceId: Joi.number().integer().required(),
  ...slotBookingFields,
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

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'completed', 'rescheduled', 'not_served')
    .required(),
});

const workScheduleTemplateSchema = Joi.object({
  mon: Joi.boolean(),
  tue: Joi.boolean(),
  wed: Joi.boolean(),
  thu: Joi.boolean(),
  fri: Joi.boolean(),
  sat: Joi.boolean(),
  sun: Joi.boolean(),
  workStart: Joi.string().pattern(timePattern),
  workEnd: Joi.string().pattern(timePattern),
  lunchStart: Joi.string().pattern(timePattern),
  lunchEnd: Joi.string().pattern(timePattern),
}).min(1);

const officeOverrideSchema = Joi.object({
  date: Joi.date().required(),
  isClosed: Joi.boolean().default(false),
  workStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  workEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
});

const serviceOverrideSchema = Joi.object({
  date: Joi.date().required(),
  serviceId: Joi.number().integer().positive().required(),
  serviceDisabled: Joi.boolean().default(false),
  workStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  workEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
});

module.exports = {
  loginSchema,
  registerStaffSchema,
  updateStaffSchema,
  createDepartmentSchema,
  createServiceSchema,
  replaceServiceFormFieldsSchema,
  createFormFieldSchema,
  updateFormFieldSchema,
  reorderFormFieldsSchema,
  searchFormResponsesSchema,
  updateAppointmentFormResponsesSchema,
  availableSlotsQuerySchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentQuerySchema,
  addBookingServiceSchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  updateAppointmentStatusSchema,
  workScheduleTemplateSchema,
  officeOverrideSchema,
  serviceOverrideSchema,
};
