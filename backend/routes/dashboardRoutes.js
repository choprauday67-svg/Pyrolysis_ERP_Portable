const express = require('express');
const router = express.Router();
const { getDashboardStats, getProductionKPIs, searchTelemetry } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats',           protect, getDashboardStats);
router.get('/production-kpis', protect, getProductionKPIs);
router.get('/search',          protect, searchTelemetry);

module.exports = router;