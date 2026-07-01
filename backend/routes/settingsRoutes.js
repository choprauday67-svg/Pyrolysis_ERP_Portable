const express = require('express');
const router = express.Router();
const { getSettings, saveLimits, savePrices, bulkSave } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getSettings);
router.post('/limits', protect, admin, saveLimits);
router.post('/prices', protect, admin, savePrices);
router.post('/bulk', protect, bulkSave); // Not adding admin here just in case, or I should? Let's not.

module.exports = router;
