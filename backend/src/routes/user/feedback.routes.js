const express = require('express');
const feedbackController = require('../../controllers/user/feedback.controller');
const validate = require('../../middleware/validate.middleware');
const {
  createFeedbackSchema,
  updateFeedbackSchema,
} = require('../../utils/validators');

const router = express.Router();

// POST /api/user/feedback
router.post('/', validate(createFeedbackSchema), feedbackController.createFeedback);

module.exports = router;
