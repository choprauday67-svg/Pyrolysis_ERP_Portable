const db = require('../config/db');

const Production = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM production ORDER BY date DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM production WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (data) => {
        const { input_weight, oil_output, carbon_output, steel_output, date } = data;
        const [result] = await db.execute(
            'INSERT INTO production (input_weight, oil_output, carbon_output, steel_output, date) VALUES (?, ?, ?, ?, ?)',
            [input_weight, oil_output, carbon_output, steel_output, date]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { input_weight, oil_output, carbon_output, steel_output, date } = data;
        const [result] = await db.execute(
            'UPDATE production SET input_weight = ?, oil_output = ?, carbon_output = ?, steel_output = ?, date = ? WHERE id = ?',
            [input_weight, oil_output, carbon_output, steel_output, date, id]
        );
        return result.affectedRows;
    },
    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM production WHERE id = ?', [id]);
        return result.affectedRows;
    },
    getSummary: async () => {
        const [rows] = await db.execute(`
            SELECT 
                SUM(oil_output) as total_oil, 
                SUM(carbon_output) as total_carbon, 
                SUM(steel_output) as total_steel,
                AVG(efficiency) as avg_efficiency
            FROM production
        `);
        return rows[0];
    }
};

module.exports = Production;
