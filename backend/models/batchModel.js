const db = require('../config/db');

const Batch = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM batches ORDER BY date DESC');
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM batches WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data) => {
        const { batch_number, input_tyres, status, start_time, date } = data;
        const [result] = await db.execute(
            'INSERT INTO batches (batch_number, input_tyres, status, start_time, date) VALUES (?, ?, ?, ?, ?)',
            [batch_number, input_tyres, status || 'Planned', start_time || null, date || new Date()]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const fields = [];
        const values = [];

        // Dynamic update fields
        const possibleFields = ['batch_number', 'input_tyres', 'oil_output', 'gas_output', 'carbon_output', 'steel_output', 'status', 'start_time', 'end_time', 'date'];
        
        possibleFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        });

        if (fields.length === 0) return 0;

        values.push(id);
        const [result] = await db.execute(
            `UPDATE batches SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM batches WHERE id = ?', [id]);
        return result.affectedRows;
    },

    getSummary: async () => {
        const [rows] = await db.execute(`
            SELECT 
                SUM(oil_output) as total_oil, 
                SUM(carbon_output) as total_carbon, 
                SUM(steel_output) as total_steel,
                SUM(input_tyres) as total_input,
                AVG((oil_output / input_tyres) * 100) as avg_efficiency
            FROM batches
            WHERE status = 'Completed'
        `);
        return rows[0];
    }
};

module.exports = Batch;
