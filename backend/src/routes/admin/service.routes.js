const express = require('express');
const serviceController = require('../../controllers/admin/service.controller');
const validate = require('../../middleware/validate.middleware');
const { createServiceSchema } = require('../../utils/validators');

const router = express.Router();

// POST /api/admin/services
router.post('/', validate(createServiceSchema), serviceController.createService);

// GET /api/admin/services
router.get('/', serviceController.getServices);

// GET /api/admin/services/:id
router.get('/:id', serviceController.getServiceById);

// PUT /api/admin/services/:id
router.put('/:id', validate(createServiceSchema), serviceController.updateService);

// DELETE /api/admin/services/:id
router.delete('/:id', serviceController.deleteService);

module.exports = router;