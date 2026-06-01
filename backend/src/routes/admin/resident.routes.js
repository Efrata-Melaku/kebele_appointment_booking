const express = require('express');
const residentController = require('../../controllers/admin/resident.controller');
const validate = require('../../middleware/validate.middleware');
const { listResidentsQuerySchema } = require('../../utils/validators');

const router = express.Router();

router.get(
  '/',
  validate.validateQuery(listResidentsQuerySchema),
  residentController.listResidents
);

module.exports = router;
