const express = require('express');
const reportController = require('../../controllers/admin/report.controller');

const router = express.Router();

router.get('/', reportController.getReports);

module.exports = router;
