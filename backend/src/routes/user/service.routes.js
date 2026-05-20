const express = require('express');
const serviceController = require('../../controllers/admin/service.controller');

const router = express.Router();

router.get('/', serviceController.getServices);

router.get('/:serviceId/form-fields', serviceController.getUserServiceFormFields);

router.get('/:departmentId', serviceController.getServicesByDepartment);

module.exports = router;
