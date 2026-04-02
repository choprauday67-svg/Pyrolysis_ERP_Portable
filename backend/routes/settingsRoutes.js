const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, settingsController.getSettings);
router.post('/limits', protect, admin, settingsController.saveLimits);
router.post('/prices', protect, admin, settingsController.savePrices);

module.exports = router;
