const db = require('../config/db');

const Rates = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM live_rates');
        return rows;
    },
    update: async (product_type, unit_price) => {
        const [result] = await db.execute(
            'INSERT INTO live_rates (product_type, unit_price) VALUES (?, ?) ON DUPLICATE KEY UPDATE unit_price = ?',
            [product_type, unit_price, unit_price]
        );
        return result.affectedRows;
    }
};

module.exports = Rates;
