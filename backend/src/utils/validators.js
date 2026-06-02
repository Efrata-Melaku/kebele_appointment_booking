const Joi = require('joi');
const { GENDER_OPTIONS } = require('../config/constants');
const {
  normalizeEthiopianPhone,
  ETHIOPIAN_PHONE_ERROR,
} = require('./ethiopianPhone');

const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/** Joi string that normalizes to +2519XXXXXXXX / +2517XXXXXXXX */
function ethiopianPhoneField(required = true) {
  let schema = Joi.string().trim();
  if (!required) {
    schema = schema.allow('', null).optional();
  } else {
    schema = schema.required();
  }
  return schema.custom((value, helpers) => {
    if (!required && (value === '' || value == null)) return value;
    const normalized = normalizeEthiopianPhone(value);
    if (!normalized) {
      return helpers.message({ custom: ETHIOPIAN_PHONE_ERROR });
    }
    return normalized;
  }, 'Ethiopian phone validation');
}

// Auth validators
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: ethiopianPhoneField(true),
  departmentId: Joi.number().integer().positive().required(),
  serviceIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).allow('', null).optional(),
  phone: ethiopianPhoneField(false),
  departmentId: Joi.number().integer().positive().optional(),
  serviceIds: Joi.array().items(Joi.number().integer().positive()).min(1).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const paginationQueryFields = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(7),
  pageSize: Joi.number().integer().min(1).max(100).optional(),
};

const listStaffQuerySchema = Joi.object({
  ...paginationQueryFields,
  search: Joi.string().trim().max(200).optional(),
});

const listResidentsQuerySchema = Joi.object({
  ...paginationQueryFields,
  search: Joi.string().trim().max(200).optional(),
});

const staffAppointmentsQuerySchema = Joi.object({
  ...paginationQueryFields,
  search: Joi.string().trim().max(200).optional(),
  status: Joi.string()
    .valid('PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_SERVED', 'pending', 'completed', 'cancelled', 'rescheduled', 'not_served')
    .optional(),
  slotDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

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
  phone: ethiopianPhoneField(true),
  appointmentItemId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .optional(),
  responses: dynamicFormResponsesJson,
  dynamicFields: dynamicFormResponsesJson,
});

// Appointment validators
const createAppointmentSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: ethiopianPhoneField(true),
  email: Joi.string()
    .trim()
    .email()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address.',
      'any.required': 'Email is required',
      'string.empty': 'Email is required',
    }),
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
  phone: ethiopianPhoneField(true),
  ...slotBookingFields,
  appointmentItemId: Joi.number().integer().positive().optional(),
});

const cancelAppointmentQuerySchema = Joi.object({
  phone: ethiopianPhoneField(true),
  appointmentItemId: Joi.number().integer().positive().optional(),
});

const resendConfirmationSchema = Joi.object({
  phone: ethiopianPhoneField(true),
  appointmentItemId: Joi.number().integer().positive().optional(),
});

const addBookingServiceSchema = Joi.object({
  phone: ethiopianPhoneField(true),
  serviceId: Joi.number().integer().required(),
  ...slotBookingFields,
});

// Feedback validators
const createFeedbackSchema = Joi.object({
  phone: ethiopianPhoneField(true),
  appointmentId: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).allow('', null).optional(),
});

const updateFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().max(1000).allow('', null).optional(),
}).min(1);

const residentCreateFeedbackSchema = Joi.object({
  phone: ethiopianPhoneField(true),
  appointmentId: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).allow('', null).optional(),
});

const residentUpdateFeedbackSchema = Joi.object({
  phone: ethiopianPhoneField(true),
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().max(1000).allow('', null).optional(),
}).min(2);

const residentFeedbackQuerySchema = Joi.object({
  phone: ethiopianPhoneField(true),
});

const adminAppointmentsQuerySchema = Joi.object({
  ...paginationQueryFields,
  search: Joi.string().trim().max(200).optional(),
  departmentId: Joi.number().integer().positive().optional(),
  serviceId: Joi.number().integer().positive().optional(),
  status: Joi.string()
    .valid('PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NOT_SERVED')
    .optional(),
  datePreset: Joi.string().valid('today', 'week', 'month').optional(),
  slotDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  residentName: Joi.string().trim().max(100).optional(),
  phone: Joi.string().trim().max(30).optional(),
  appointmentNumber: Joi.string().trim().max(64).optional(),
});

const adminFeedbackQuerySchema = Joi.object({
  ...paginationQueryFields,
  departmentId: Joi.number().integer().positive().optional(),
  serviceId: Joi.number().integer().positive().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  datePreset: Joi.string().valid('today', 'week', 'month').optional(),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'PENDING',
      'COMPLETED',
      'RESCHEDULED',
      'NOT_SERVED',
      'CANCELLED',
      'pending',
      'completed',
      'rescheduled',
      'not_served',
      'cancelled'
    )
    .required(),
  note: Joi.string().trim().max(1000).allow('', null).optional(),
  slotDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slotStart: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
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
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  isClosed: Joi.boolean().default(false),
  workStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  workEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchStart: Joi.string().pattern(timePattern).allow(null, '').optional(),
  lunchEnd: Joi.string().pattern(timePattern).allow(null, '').optional(),
});

const myAppointmentsQuerySchema = Joi.object({
  phone: ethiopianPhoneField(false),
  appointmentNumber: Joi.string().trim().max(64).optional(),
}).or('phone', 'appointmentNumber');

const getAppointmentByRefQuerySchema = Joi.object({
  phone: ethiopianPhoneField(true),
});

const serviceOverrideSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
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
  resendConfirmationSchema,
  addBookingServiceSchema,
  myAppointmentsQuerySchema,
  getAppointmentByRefQuerySchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  residentCreateFeedbackSchema,
  residentUpdateFeedbackSchema,
  residentFeedbackQuerySchema,
  listStaffQuerySchema,
  listResidentsQuerySchema,
  staffAppointmentsQuerySchema,
  adminAppointmentsQuerySchema,
  adminFeedbackQuerySchema,
  updateAppointmentStatusSchema,
  workScheduleTemplateSchema,
  officeOverrideSchema,
  serviceOverrideSchema,
};
