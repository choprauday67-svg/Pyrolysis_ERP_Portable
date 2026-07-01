const db = require('../config/db');

class CommodityTrend {
    // Get all commodity prices with current trend data
    static async getAllCommodities() {
        try {
            const [rows] = await db.execute('SELECT * FROM commodity_prices ORDER BY commodity');
            return rows || [];
        } catch (err) {
            console.error('Error fetching commodity prices:', err);
            throw err;
        }
    }

    // Get price for specific commodity
    static async getCommodityPrice(commodity) {
        try {
            const [rows] = await db.execute('SELECT * FROM commodity_prices WHERE commodity = ?', [commodity]);
            return rows && rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error(`Error fetching price for ${commodity}:`, err);
            throw err;
        }
    }

    // Update commodity price and record history
    static async updateCommodityPrice(commodity, newPrice) {
        try {
            // Get previous price and current price
            const existing = await this.getCommodityPrice(commodity);
            const previousPrice = existing ? existing.current_price : newPrice;
            
            // Calculate change percentage
            const changePercentage = previousPrice !== 0 
                ? ((newPrice - previousPrice) / previousPrice) * 100 
                : 0;
            
            // Determine trend direction
            let trendDirection = 'stable';
            if (changePercentage > 0.1) trendDirection = 'up';
            else if (changePercentage < -0.1) trendDirection = 'down';
            
            // Update commodity price
            await db.execute(
                'UPDATE commodity_prices SET current_price = ?, previous_price = ?, trend_direction = ?, change_percentage = ?, last_updated = CURRENT_TIMESTAMP WHERE commodity = ?',
                [newPrice, previousPrice, trendDirection, changePercentage.toFixed(2), commodity]
            );
            
            // Record in price history
            await db.execute(
                'INSERT INTO commodity_price_history (commodity, price) VALUES (?, ?)',
                [commodity, newPrice]
            );
            
            return { commodity, newPrice, previousPrice, changePercentage, trendDirection };
        } catch (err) {
            console.error(`Error updating price for ${commodity}:`, err);
            throw err;
        }
    }

    // Get price history for charting (last N entries)
    static async getPriceHistory(commodity, limit = 50) {
        try {
            const [rows] = await db.execute(
                'SELECT price, timestamp FROM commodity_price_history WHERE commodity = ? ORDER BY timestamp DESC LIMIT ?',
                [commodity, limit]
            );
            // Reverse to get chronological order
            return rows ? rows.reverse() : [];
        } catch (err) {
            console.error(`Error fetching price history for ${commodity}:`, err);
            throw err;
        }
    }

    // Get all price histories for all commodities
    static async getAllPriceHistories(limit = 30) {
        try {
            const commodities = ['Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel'];
            const result = {};
            
            for (const commodity of commodities) {
                result[commodity] = await this.getPriceHistory(commodity, limit);
            }
            
            return result;
        } catch (err) {
            console.error('Error fetching all price histories:', err);
            throw err;
        }
    }

    // Calculate inventory valuation based on commodity prices
    static async calculateInventoryValuation(inventory) {
        try {
            let totalValuation = 0;
            
            // Get all commodity prices
            const prices = await this.getAllCommodities();
            const priceMap = {};
            prices.forEach(p => {
                priceMap[p.commodity] = p.current_price;
            });
            
            // Map inventory items to commodity valuations
            if (inventory.totalProduction) {
                if (inventory.totalProduction.oil) {
                    totalValuation += inventory.totalProduction.oil * (priceMap['Pyrolysis Oil'] || 38);
                }
                if (inventory.totalProduction.carbon) {
                    totalValuation += inventory.totalProduction.carbon * (priceMap['Carbon Black'] || 20);
                }
                if (inventory.totalProduction.steel) {
                    totalValuation += inventory.totalProduction.steel * (priceMap['Steel'] || 38);
                }
            }
            
            return parseFloat(totalValuation.toFixed(2));
        } catch (err) {
            console.error('Error calculating inventory valuation:', err);
            throw err;
        }
    }

    // Get market trend summary for dashboard
    static async getMarketTrendSummary() {
        try {
            const commodities = await this.getAllCommodities();
            const summary = {
                commodities: commodities.map(c => ({
                    name: c.commodity,
                    currentPrice: parseFloat(c.current_price).toFixed(2),
                    previousPrice: parseFloat(c.previous_price).toFixed(2),
                    changePercentage: parseFloat(c.change_percentage).toFixed(2),
                    trend: c.trend_direction,
                    lastUpdated: c.last_updated
                })),
                averageVolatility: this._calculateVolatility(commodities)
            };
            return summary;
        } catch (err) {
            console.error('Error fetching market trend summary:', err);
            throw err;
        }
    }

    // Helper: Calculate average volatility
    static _calculateVolatility(commodities) {
        if (!commodities || commodities.length === 0) return 0;
        const totalChange = commodities.reduce((sum, c) => sum + Math.abs(parseFloat(c.change_percentage)), 0);
        return parseFloat((totalChange / commodities.length).toFixed(2));
    }

    // Clean old price history (keep only last 1000 entries per commodity)
    static async cleanupOldHistory() {
        try {
            const commodities = ['Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel'];
            for (const commodity of commodities) {
                // Get IDs of entries to keep
                const [keepRows] = await db.execute(
                    'SELECT id FROM commodity_price_history WHERE commodity = ? ORDER BY timestamp DESC LIMIT 1000',
                    [commodity]
                );
                
                if (keepRows.length > 0) {
                    const maxId = keepRows[keepRows.length - 1].id;
                    await db.execute(
                        'DELETE FROM commodity_price_history WHERE commodity = ? AND id < ?',
                        [commodity, maxId]
                    );
                }
            }
            console.log('✅ Cleaned up old price history');
        } catch (err) {
            console.error('Error cleaning up price history:', err);
        }
    }
}

module.exports = CommodityTrend;
