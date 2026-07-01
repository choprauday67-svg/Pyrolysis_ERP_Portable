const express = require('express');
const router = express.Router();
const {
    getAllCommodities,
    getCommodityPrice,
    getPriceHistory,
    getAllPriceHistories,
    getMarketTrendSummary,
    calculateValuation
} = require('../controllers/commodityTrendController');
const { protect } = require('../middleware/auth');

// Public routes for market trends (lightweight endpoints)
router.get('/commodities', getAllCommodities);
router.get('/summary', getMarketTrendSummary);
router.get('/:commodity/price', getCommodityPrice);
router.get('/:commodity/history', getPriceHistory);
router.get('/histories/all', getAllPriceHistories);
router.post('/valuation/calculate', protect, calculateValuation);

module.exports = router;
