const CommodityTrend = require('../models/commodityTrendModel');

// Get all commodity prices
exports.getAllCommodities = async (req, res) => {
    try {
        const commodities = await CommodityTrend.getAllCommodities();
        res.json({
            success: true,
            data: commodities
        });
    } catch (err) {
        console.error('Error fetching commodities:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch commodities',
            error: err.message
        });
    }
};

// Get price for specific commodity
exports.getCommodityPrice = async (req, res) => {
    try {
        const { commodity } = req.params;
        const price = await CommodityTrend.getCommodityPrice(commodity);
        
        if (!price) {
            return res.status(404).json({
                success: false,
                message: 'Commodity not found'
            });
        }
        
        res.json({
            success: true,
            data: price
        });
    } catch (err) {
        console.error('Error fetching commodity price:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch commodity price',
            error: err.message
        });
    }
};

// Get price history for charting
exports.getPriceHistory = async (req, res) => {
    try {
        const { commodity } = req.params;
        const { limit = 50 } = req.query;
        
        const history = await CommodityTrend.getPriceHistory(commodity, parseInt(limit));
        
        res.json({
            success: true,
            commodity,
            history,
            count: history.length
        });
    } catch (err) {
        console.error('Error fetching price history:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price history',
            error: err.message
        });
    }
};

// Get all price histories for dashboard
exports.getAllPriceHistories = async (req, res) => {
    try {
        const { limit = 30 } = req.query;
        
        const histories = await CommodityTrend.getAllPriceHistories(parseInt(limit));
        
        res.json({
            success: true,
            histories
        });
    } catch (err) {
        console.error('Error fetching all price histories:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price histories',
            error: err.message
        });
    }
};

// Get market trend summary
exports.getMarketTrendSummary = async (req, res) => {
    try {
        const summary = await CommodityTrend.getMarketTrendSummary();
        
        res.json({
            success: true,
            summary
        });
    } catch (err) {
        console.error('Error fetching market trend summary:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market trend summary',
            error: err.message
        });
    }
};

// Calculate inventory valuation (used by dashboard)
exports.calculateValuation = async (req, res) => {
    try {
        const { inventory } = req.body;
        
        if (!inventory) {
            return res.status(400).json({
                success: false,
                message: 'Inventory data required'
            });
        }
        
        const valuation = await CommodityTrend.calculateInventoryValuation(inventory);
        
        res.json({
            success: true,
            valuation
        });
    } catch (err) {
        console.error('Error calculating valuation:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate valuation',
            error: err.message
        });
    }
};
