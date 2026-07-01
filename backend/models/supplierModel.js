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

    // Case-insensitive duplicate check (excludes current id on update)
    findByName: async (name, excludeId = null) => {
        const [rows] = await db.execute(
            'SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != COALESCE(?, -1)',
            [name, excludeId]
        );
        return rows[0] || null;
    },

    create: async (supplierData) => {
        const { name, contact, location } = supplierData;

        const [result] = await db.execute(
            'INSERT INTO suppliers (name, contact, location) VALUES (?, ?, ?)',
            [name.trim(), contact, location]
        );

        return result.insertId;
    },

    update: async (id, supplierData) => {
        const { name, contact, location } = supplierData;

        const [result] = await db.execute(
            'UPDATE suppliers SET name = ?, contact = ?, location = ? WHERE id = ?',
            [name.trim(), contact, location, id]
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