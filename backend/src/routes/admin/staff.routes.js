const express = require('express');
const staffController = require('../../controllers/admin/staff.controller');
const validate = require('../../middleware/validate.middleware');
const { registerStaffSchema, updateStaffSchema } = require('../../utils/validators');

const router = express.Router();

// POST /api/admin/staff/register
router.post('/register', validate(registerStaffSchema), staffController.registerStaff);

// GET /api/admin/staff
router.get('/', staffController.getStaff);

// GET /api/admin/staff/:id
router.get('/:id', staffController.getStaffById);

// PUT /api/admin/staff/:id
router.put('/:id', validate(updateStaffSchema), staffController.updateStaff);

// DELETE /api/admin/staff/:id
router.delete('/:id', staffController.deleteStaff);

module.exports = router;