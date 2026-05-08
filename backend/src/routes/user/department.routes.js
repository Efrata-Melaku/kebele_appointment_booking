const express = require('express');
const departmentController = require('../../controllers/admin/department.controller');

const router = express.Router();

// GET /api/user/departments
router.get('/', departmentController.getDepartments);

module.exports = router;