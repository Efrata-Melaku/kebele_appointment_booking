const express = require('express');
const serviceController = require('../../controllers/admin/service.controller');
const serviceFormFieldController = require('../../controllers/admin/serviceFormField.controller');
const validate = require('../../middleware/validate.middleware');
const {
  createServiceSchema,
  replaceServiceFormFieldsSchema,
  createFormFieldSchema,
  updateFormFieldSchema,
} = require('../../utils/validators');

const router = express.Router();

router.post('/', validate(createServiceSchema), serviceController.createService);

router.get('/duplicate-check', serviceController.duplicateServiceCheck);

/** Staff form / picker — flat { id, name, departmentId, departmentName }[] */
router.get('/picker', serviceController.getServicePickerOptions);

router.get('/', serviceController.getServices);

router.get('/:id/form-fields', serviceFormFieldController.listFormFields);

router.post(
  '/:id/form-fields',
  validate(createFormFieldSchema),
  serviceFormFieldController.createFormField
);

router.put(
  '/:id/form-fields/:fieldId',
  validate(updateFormFieldSchema),
  serviceFormFieldController.updateFormFieldForService
);

router.delete('/:id/form-fields/:fieldId', serviceFormFieldController.deleteFormFieldForService);

router.post(
  '/:id/fields',
  validate(replaceServiceFormFieldsSchema),
  serviceFormFieldController.replaceFormFields
);

router.get('/:id', serviceController.getServiceById);

router.put('/:id', validate(createServiceSchema), serviceController.updateService);

router.delete('/:id', serviceController.deleteService);

module.exports = router;
