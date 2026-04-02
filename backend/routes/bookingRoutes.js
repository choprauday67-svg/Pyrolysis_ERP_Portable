const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize, admin } = require('../middleware/auth');

router.post('/', protect, authorize('Customer'), bookingController.createBooking);
router.get('/my', protect, authorize('Customer'), bookingController.getCustomerBookings);
router.get('/all', protect, admin, bookingController.getAllBookings);
router.patch('/:id/status', protect, admin, bookingController.updateBookingStatus);

module.exports = router;
