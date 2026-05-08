const express = require('express');
const dashboardController = require('../../controllers/admin/dashboard.controller');

const router = express.Router();

// GET /api/admin/dashboard
router.get('/', dashboardController.getDashboardStats);

module.exports = router;