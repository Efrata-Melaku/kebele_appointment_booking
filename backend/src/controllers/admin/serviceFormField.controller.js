const serviceService = require('../../services/service.service');
const serviceFormFieldModel = require('../../models/serviceFormField.model');
const formFieldService = require('../../services/formField.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { assertValidFieldType, parseOptions } = require('../../services/dynamicForm.service');
const { AppError } = require('../../utils/AppError');

function handleServiceError(res, error, fallback) {
  if (error instanceof AppError || error.statusCode) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
  if (error.message && error.message.includes('Invalid field type')) {
    return errorResponse(res, error.message, 400);
  }
  errorResponse(res, fallback, 500);
}

class ServiceFormFieldController {
  /** GET /api/admin/services/:id/form-fields */
  async listFormFields(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const service = await serviceService.getServiceById(serviceId, {
        select: { id: true, name: true },
      });
      if (!service) {
        return errorResponse(res, 'Service not found', 404);
      }
      const fields = await formFieldService.listFieldsForService(serviceId);
      successResponse(res, 'Form fields retrieved successfully', { service, fields });
    } catch (error) {
      handleServiceError(res, error, 'Failed to list form fields');
    }
  }

  /** POST /api/admin/services/:id/form-fields */
  async createFormField(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const field = await formFieldService.createField(serviceId, req.body);
      successResponse(res, 'Form field created successfully', field, 201);
    } catch (error) {
      handleServiceError(res, error, 'Failed to create form field');
    }
  }

  /** PUT /api/admin/form-fields/:id */
  async updateFormField(req, res) {
    try {
      const fieldId = parseInt(req.params.id, 10);
      const field = await formFieldService.updateField(fieldId, req.body);
      successResponse(res, 'Form field updated successfully', field);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update form field');
    }
  }

  /** PUT /api/admin/services/:id/form-fields/:fieldId */
  async updateFormFieldForService(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const fieldId = parseInt(req.params.fieldId, 10);
      const existing = await serviceFormFieldModel.findFormFieldById(fieldId);
      if (!existing || existing.serviceId !== serviceId) {
        return errorResponse(res, 'Form field not found for this service', 404);
      }
      const field = await formFieldService.updateField(fieldId, req.body);
      successResponse(res, 'Form field updated successfully', field);
    } catch (error) {
      handleServiceError(res, error, 'Failed to update form field');
    }
  }

  /** DELETE /api/admin/form-fields/:id — soft delete */
  async deleteFormField(req, res) {
    try {
      const fieldId = parseInt(req.params.id, 10);
      const field = await formFieldService.deactivateField(fieldId);
      successResponse(res, 'Form field deactivated successfully', field);
    } catch (error) {
      handleServiceError(res, error, 'Failed to deactivate form field');
    }
  }

  /** DELETE /api/admin/services/:id/form-fields/:fieldId */
  async deleteFormFieldForService(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const fieldId = parseInt(req.params.fieldId, 10);
      const existing = await serviceFormFieldModel.findFormFieldById(fieldId);
      if (!existing || existing.serviceId !== serviceId) {
        return errorResponse(res, 'Form field not found for this service', 404);
      }
      const field = await formFieldService.deactivateField(fieldId);
      successResponse(res, 'Form field deactivated successfully', field);
    } catch (error) {
      handleServiceError(res, error, 'Failed to deactivate form field');
    }
  }

  /** PATCH /api/admin/form-fields/reorder */
  async reorderFormFields(req, res) {
    try {
      const { serviceId, orderedIds } = req.body;
      const fields = await formFieldService.reorderFields(Number(serviceId), orderedIds);
      successResponse(res, 'Form fields reordered successfully', fields);
    } catch (error) {
      handleServiceError(res, error, 'Failed to reorder form fields');
    }
  }

  /**
   * POST /api/admin/services/:id/fields — bulk replace (service creation wizard)
   */
  async replaceFormFields(req, res) {
    try {
      const serviceId = parseInt(req.params.id, 10);
      const { fields } = req.body;

      if (!Array.isArray(fields)) {
        return errorResponse(res, 'fields must be an array', 400);
      }

      const labels = new Set();
      for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i];
        if (!f || typeof f !== 'object') {
          return errorResponse(res, `Invalid field at index ${i}`, 400);
        }
        assertValidFieldType(f.fieldType);
        const label = String(f.label || '').trim();
        if (!label) {
          return errorResponse(res, `Field ${i}: label is required`, 400);
        }
        const key = label.toLowerCase();
        if (labels.has(key)) {
          return errorResponse(res, `Duplicate label "${label}"`, 400);
        }
        labels.add(key);
        if (f.fieldType === 'select' || f.fieldType === 'radio') {
          const opts = parseOptions(formFieldService.normalizeOptionsInput(f.options));
          if (opts.length < 2) {
            return errorResponse(
              res,
              `Field "${f.label}": select/radio requires at least two options`,
              400
            );
          }
        }
      }

      const updated = await formFieldService.replaceFormFieldsForService(serviceId, fields);
      successResponse(res, 'Form fields saved successfully', updated, 201);
    } catch (error) {
      handleServiceError(res, error, 'Failed to save form fields');
    }
  }

  /** GET /api/admin/appointments/search?formFieldId=&value= */
  async searchByFormValue(req, res) {
    try {
      const formFieldId = parseInt(req.query.formFieldId, 10);
      const value = String(req.query.value || '').trim();
      if (!formFieldId || !value) {
        return errorResponse(res, 'formFieldId and value are required', 400);
      }

      const formSubmissionService = require('../../services/formSubmission.service');
      const rows = await formSubmissionService.searchByFieldValue(formFieldId, value);

      successResponse(res, 'Search results', rows);
    } catch (error) {
      errorResponse(res, 'Search failed', 500);
    }
  }
}

module.exports = new ServiceFormFieldController();
