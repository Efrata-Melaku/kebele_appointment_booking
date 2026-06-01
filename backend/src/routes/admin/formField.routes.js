const express = require('express');
const serviceFormFieldController = require('../../controllers/admin/serviceFormField.controller');
const validate = require('../../middleware/validate.middleware');
const {
  createFormFieldSchema,
  updateFormFieldSchema,
  reorderFormFieldsSchema,
  searchFormResponsesSchema,
} = require('../../utils/validators');

const router = express.Router();

router.patch(
  '/reorder',
  validate(reorderFormFieldsSchema),
  serviceFormFieldController.reorderFormFields
);

router.get(
  '/search',
  validate.validateQuery(searchFormResponsesSchema),
  serviceFormFieldController.searchByFormValue
);

router.put('/:id', validate(updateFormFieldSchema), serviceFormFieldController.updateFormField);

router.delete('/:id', serviceFormFieldController.deleteFormField);

module.exports = router;
