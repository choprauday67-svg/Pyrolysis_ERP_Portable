const db = require('../config/db');

const Booking = {
    create: async (data) => {
        const { user_id, product_type, quantity, total_price, date } = data;
        const [result] = await db.execute(
            'INSERT INTO bookings (user_id, product_type, quantity, total_price, date) VALUES (?, ?, ?, ?, ?)',
            [user_id, product_type, quantity, total_price, date]
        );
        return result.insertId;
    },
    getByUser: async (user_id) => {
        const [rows] = await db.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY date DESC', [user_id]);
        return rows;
    },
    getAll: async () => {
        const [rows] = await db.execute(`
            SELECT b.*, u.name as customer_name 
            FROM bookings b 
            JOIN users u ON b.user_id = u.id 
            ORDER BY b.date DESC
        `);
        return rows;
    },
    updateStatus: async (id, status) => {
        const [result] = await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows;
    }
};

module.exports = Booking;
