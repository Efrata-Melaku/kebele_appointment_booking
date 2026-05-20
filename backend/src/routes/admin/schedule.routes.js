const express = require('express');
const scheduleController = require('../../controllers/admin/schedule.controller');
const validate = require('../../middleware/validate.middleware');
const {
  workScheduleTemplateSchema,
  officeOverrideSchema,
  serviceOverrideSchema,
} = require('../../utils/validators');

const router = express.Router();

router.get('/template', scheduleController.getTemplate);
router.put('/template', validate(workScheduleTemplateSchema), scheduleController.updateTemplate);

router.get('/office-overrides', scheduleController.listOfficeOverrides);
router.post('/office-overrides', validate(officeOverrideSchema), scheduleController.upsertOfficeOverride);
router.delete('/office-overrides/:date', scheduleController.deleteOfficeOverride);

router.get('/service-overrides', scheduleController.listServiceOverrides);
router.post('/service-overrides', validate(serviceOverrideSchema), scheduleController.upsertServiceOverride);
router.delete('/service-overrides/:date/:serviceId', scheduleController.deleteServiceOverride);

module.exports = router;
