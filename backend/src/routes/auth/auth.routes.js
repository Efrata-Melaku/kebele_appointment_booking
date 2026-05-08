const express = require('express');
const authController = require('../../controllers/auth/auth.controller');
const validate = require('../../middleware/validate.middleware');
const protect = require('../../middleware/auth.middleware');
const { loginSchema } = require('../../utils/validators');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

router.get('/profile', protect, authController.getProfile);

module.exports = router;
