const db = require('../config/db');

// Find user by email
exports.findByEmail = async (email) => {
    const [rows] = await db.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );

    return rows[0]; // return single user
};

// Create user
exports.create = async (name, email, password, role) => {
    const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, password, role]
    );

    return result.insertId;
};