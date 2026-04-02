const db = require('../config/db');

const Sales = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM sales ORDER BY date DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM sales WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (data) => {
        const { product_type, quantity, price_per_unit, buyer, date } = data;
        const [result] = await db.execute(
            'INSERT INTO sales (product_type, quantity, price_per_unit, buyer, date) VALUES (?, ?, ?, ?, ?)',
            [product_type, quantity, price_per_unit, buyer, date]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { product_type, quantity, price_per_unit, buyer, date } = data;
        const [result] = await db.execute(
            'UPDATE sales SET product_type = ?, quantity = ?, price_per_unit = ?, buyer = ?, date = ? WHERE id = ?',
            [product_type, quantity, price_per_unit, buyer, date, id]
        );
        return result.affectedRows;
    },
    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM sales WHERE id = ?', [id]);
        return result.affectedRows;
    },
    getSummary: async () => {
        const [rows] = await db.execute('SELECT SUM(quantity * price_per_unit) as total_revenue FROM sales');
        return rows[0].total_revenue || 0;
    },
    getBuyerInsights: async () => {
        const [rows] = await db.execute(`
            SELECT 
                buyer, 
                SUM(quantity * price_per_unit) as total_profit, 
                SUM(quantity) as total_output, 
                AVG(price_per_unit) as avg_price 
            FROM sales 
            GROUP BY buyer 
            ORDER BY total_profit DESC 
            LIMIT 5
        `);
        return rows;
    },
    getCategorySummary: async () => {
        const [rows] = await db.execute('SELECT product_type, SUM(quantity) as total_sold FROM sales GROUP BY product_type');
        return rows;
    }
};

module.exports = Sales;
