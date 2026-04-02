const db = require('../config/db');

const Inventory = {
    getAll: async () => {
        const [rows] = await db.execute(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id 
            ORDER BY i.date DESC
        `);
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.execute(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id 
            WHERE i.id = ?
        `, [id]);
        return rows[0];
    },
    create: async (data) => {
        const { supplier_id, weight, type, date } = data;
        const [result] = await db.execute(
            'INSERT INTO inventory (supplier_id, weight, type, date) VALUES (?, ?, ?, ?)',
            [supplier_id, weight, type, date]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { supplier_id, weight, type, date } = data;
        const [result] = await db.execute(
            'UPDATE inventory SET supplier_id = ?, weight = ?, type = ?, date = ? WHERE id = ?',
            [supplier_id, weight, type, date, id]
        );
        return result.affectedRows;
    },
    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM inventory WHERE id = ?', [id]);
        return result.affectedRows;
    },
    getTotalSummary: async () => {
        // Calculate total available stock (sum of all inventory weight minus sum of all batches input_tyres)
        const [invRows] = await db.execute('SELECT SUM(weight) as total_in FROM inventory');
        const [batchRows] = await db.execute('SELECT SUM(input_tyres) as total_used FROM batches');
        
        const totalIn = invRows[0].total_in || 0;
        const totalUsed = batchRows[0].total_used || 0;
        
        return {
            total_received: parseFloat(totalIn),
            total_used: parseFloat(totalUsed),
            current_stock: parseFloat(totalIn) - parseFloat(totalUsed)
        };
    }
};

module.exports = Inventory;
