const express = require('express');
const router = express.Router();
const { getProfitAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/profit', protect, getProfitAnalytics);

module.exports = router;
