const db = require('../config/db');

const Settings = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
        return rows;
    },
    
    get: async (key) => {
        const [rows] = await db.execute('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
        return rows[0] ? rows[0].setting_value : null;
    },

    update: async (key, value) => {
        const [result] = await db.execute(
            'INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)',
            [key, value]
        );
        return result.affectedRows;
    }
};

module.exports = Settings;
