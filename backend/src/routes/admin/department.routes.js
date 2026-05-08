const express = require('express');
const departmentController = require('../../controllers/admin/department.controller');
const validate = require('../../middleware/validate.middleware');
const { createDepartmentSchema } = require('../../utils/validators');

const router = express.Router();

// POST /api/admin/departments
router.post('/', validate(createDepartmentSchema), departmentController.createDepartment);

// GET /api/admin/departments
router.get('/', departmentController.getDepartments);

// GET /api/admin/departments/:id
router.get('/:id', departmentController.getDepartmentById);

// PUT /api/admin/departments/:id
router.put('/:id', validate(createDepartmentSchema), departmentController.updateDepartment);

// DELETE /api/admin/departments/:id
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;