const express = require('express');
const adminFeedbackController = require('../../controllers/admin/feedback.controller');
const validate = require('../../middleware/validate.middleware');
const { adminFeedbackQuerySchema } = require('../../utils/validators');

const router = express.Router();

router.get('/stats', validate.validateQuery(adminFeedbackQuerySchema), adminFeedbackController.getStats);
router.get('/reporting', adminFeedbackController.getReporting);
router.get(
  '/',
  validate.validateQuery(adminFeedbackQuerySchema),
  adminFeedbackController.listFeedback
);
router.get('/:id', adminFeedbackController.getFeedbackDetail);

module.exports = router;
