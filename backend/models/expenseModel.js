const db = require('../config/db');

const Expense = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM expenses ORDER BY date DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (data) => {
        const { type, amount, date } = data;
        const [result] = await db.execute(
            'INSERT INTO expenses (type, amount, date) VALUES (?, ?, ?)',
            [type, amount, date]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { type, amount, date } = data;
        const [result] = await db.execute(
            'UPDATE expenses SET type = ?, amount = ?, date = ? WHERE id = ?',
            [type, amount, date, id]
        );
        return result.affectedRows;
    },
    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
        return result.affectedRows;
    },
    getSummary: async () => {
        const [rows] = await db.execute('SELECT SUM(amount) as total_expenses FROM expenses');
        return rows[0].total_expenses || 0;
    }
};

module.exports = Expense;
