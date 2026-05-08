const express = require('express');
const serviceController = require('../../controllers/admin/service.controller');

const router = express.Router();

// GET /api/user/services
router.get('/', serviceController.getServices);

// GET /api/user/services/:departmentId
router.get('/:departmentId', serviceController.getServicesByDepartment);

module.exports = router;