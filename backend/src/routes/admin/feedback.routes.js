const express = require('express');
const feedbackController = require('../../controllers/user/feedback.controller');

const router = express.Router();

router.get('/', feedbackController.getAllFeedback);

module.exports = router;
