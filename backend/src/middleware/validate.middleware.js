const Joi = require('joi');

const logValidationBody = (req) => {
  if (process.env.NODE_ENV === 'production') return;
  const body = req.body || {};
  console.debug('[validate] incoming body', {
    keys: Object.keys(body),
    fullName: typeof body.fullName === 'string' ? body.fullName.slice(0, 40) : body.fullName,
    phone: body.phone ? '[set]' : body.phone,
    serviceId: body.serviceId,
    slotDate: body.slotDate,
    slotStart: body.slotStart,
    hasResponses: body.responses != null && String(body.responses).length > 0,
    hasDynamicFields: body.dynamicFields != null && String(body.dynamicFields).length > 0,
    fileCount: Array.isArray(req.files) ? req.files.length : 0,
  });
};

const validate = (schema) => {
  return (req, res, next) => {
    logValidationBody(req);
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
      stripUnknown: false,
    });

    if (!error && value) {
      req.body = value;
    }

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    if (value) {
      req.query = value;
    }

    next();
  };
};

module.exports = validate;
module.exports.validateQuery = validateQuery;
