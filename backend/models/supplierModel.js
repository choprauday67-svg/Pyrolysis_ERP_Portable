const db = require('../config/db');

const Supplier = {
    // ✅ FIXED HERE (removed created_at)
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM suppliers ORDER BY id DESC');
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.execute(
            'SELECT * FROM suppliers WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    create: async (supplierData) => {
        const { name, contact, location } = supplierData;

        const [result] = await db.execute(
            'INSERT INTO suppliers (name, contact, location) VALUES (?, ?, ?)',
            [name, contact, location]
        );

        return result.insertId;
    },

    update: async (id, supplierData) => {
        const { name, contact, location } = supplierData;

        const [result] = await db.execute(
            'UPDATE suppliers SET name = ?, contact = ?, location = ? WHERE id = ?',
            [name, contact, location, id]
        );

        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await db.execute(
            'DELETE FROM suppliers WHERE id = ?',
            [id]
        );

        return result.affectedRows;
    }
};

module.exports = Supplier;