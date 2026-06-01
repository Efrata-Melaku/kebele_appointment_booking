const express = require('express');
const bookingController = require('../../controllers/user/booking.controller');

const router = express.Router();

router.get('/services', bookingController.listServices);
router.get('/services/:serviceId', bookingController.getServiceDetail);

module.exports = router;
