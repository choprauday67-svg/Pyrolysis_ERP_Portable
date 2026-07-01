const CommodityTrend = require('../models/commodityTrendModel');

class MarketTrendService {
    constructor() {
        this.isRunning = false;
        this.commodities = ['Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel'];
        this.baseVolatility = 0.02; // 2% max change per cycle
        this.trends = {}; // Track trend momentum
    }

    // Initialize trends
    initializeTrends() {
        this.commodities.forEach(commodity => {
            this.trends[commodity] = {
                momentum: 0,
                momentumChange: 0,
                direction: 0
            };
        });
    }

    // Start the market trend service
    start(intervalMs = 60000) { // Default: update every minute
        if (this.isRunning) {
            console.log('⚠️  Market Trend Service is already running');
            return;
        }

        this.isRunning = true;
        this.initializeTrends();
        console.log('✅ Market Trend Service started (update interval: ' + intervalMs + 'ms)');

        // Run immediately on start
        this.simulateMarketMovement().catch(err => 
            console.error('Error in market simulation:', err)
        );

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.simulateMarketMovement().catch(err => 
                console.error('Error in market simulation:', err)
            );
        }, intervalMs);
    }

    // Stop the market trend service
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.isRunning = false;
            console.log('🛑 Market Trend Service stopped');
        }
    }

    // Simulate realistic market movement
    async simulateMarketMovement() {
        try {
            for (const commodity of this.commodities) {
                const price = await CommodityTrend.getCommodityPrice(commodity);
                if (price) {
                    const newPrice = this.calculateNewPrice(commodity, price.current_price);
                    await CommodityTrend.updateCommodityPrice(commodity, newPrice);
                }
            }

            // Cleanup old history periodically (every 100 cycles)
            if (Math.random() < 0.01) {
                await CommodityTrend.cleanupOldHistory();
            }
        } catch (err) {
            console.error('Error in market simulation:', err);
        }
    }

    // Calculate new price with momentum and random fluctuation
    calculateNewPrice(commodity, currentPrice) {
        const trend = this.trends[commodity];

        // Realistic Indian Market Ranges (INR)
        const ranges = {
            'Pyrolysis Oil': { min: 28, max: 48 },
            'Carbon Black': { min: 15, max: 25 },
            'Steel': { min: 30, max: 45 },
            'Gas': { min: 10, max: 20 }
        };

        const range = ranges[commodity] || { min: 10, max: 100 };

        // Hard reset if current price is a legacy USD value (way out of bounds)
        if (currentPrice > range.max * 2 || currentPrice < range.min * 0.5) {
             currentPrice = (range.min + range.max) / 2;
        }

        // Random market shock (reduced to 2% chance for smoother movement)
        if (Math.random() < 0.02) {
            trend.direction = Math.random() < 0.5 ? -1 : 1;
            trend.momentumChange = (Math.random() - 0.5) * 0.2; // Smaller shocks
        } else {
            // Gradual momentum decay (faster decay for smoothness)
            trend.momentumChange *= 0.90;
            trend.momentum += trend.momentumChange;
        }

        // Limit momentum to prevent extreme movements
        trend.momentum = Math.max(-0.05, Math.min(0.05, trend.momentum));

        // Calculate change: base volatility + momentum
        const baseChange = (Math.random() - 0.5) * this.baseVolatility;
        const momentumInfluence = trend.momentum * 0.5;
        const totalChange = baseChange + momentumInfluence;

        // Apply change to price
        let newPrice = currentPrice * (1 + totalChange);

        // Soft bound to realistic ranges
        if (newPrice > range.max) newPrice -= (newPrice - range.max) * 0.2;
        if (newPrice < range.min) newPrice += (range.min - newPrice) * 0.2;

        return parseFloat(newPrice.toFixed(2));
    }

    // Get current market status
    getStatus() {
        return {
            isRunning: this.isRunning,
            commodities: this.commodities,
            trends: this.trends,
            timestamp: new Date().toISOString()
        };
    }

    // Manual price update (for testing or adjustment)
    async manualUpdate(commodity, newPrice) {
        try {
            if (!this.commodities.includes(commodity)) {
                throw new Error(`Invalid commodity: ${commodity}`);
            }
            await CommodityTrend.updateCommodityPrice(commodity, newPrice);
            console.log(`✅ Manually updated ${commodity} to ${newPrice}`);
            return { success: true, commodity, newPrice };
        } catch (err) {
            console.error('Error in manual price update:', err);
            throw err;
        }
    }
}

module.exports = new MarketTrendService();
