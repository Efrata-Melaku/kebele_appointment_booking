const express = require('express');
const smsTestController = require('../../controllers/test/sms.controller');

const router = express.Router();

router.post('/sms', smsTestController.sendTestSms.bind(smsTestController));
router.post('/reminder', smsTestController.runReminderJob.bind(smsTestController));
router.post('/cancel', smsTestController.sendTestCancel.bind(smsTestController));
router.post('/reschedule', smsTestController.sendTestReschedule.bind(smsTestController));
router.post('/confirm', smsTestController.sendTestConfirm.bind(smsTestController));

module.exports = router;
