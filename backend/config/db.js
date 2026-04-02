const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create database connection
const db = new sqlite3.Database(process.env.DB_NAME || 'pyrolysis_erp.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database.');
    }
});

// Wrapper to make it compatible with mysql2 promise interface
const dbPromise = {
    execute: (query, params = []) => {
        return new Promise((resolve, reject) => {
            if (query.toLowerCase().trim().startsWith('select')) {
                db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            } else {
                db.run(query, params, function(err) {
                    if (err) reject(err);
                    else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
                });
            }
        });
    },
    query: (query, params = []) => {
        return new Promise((resolve, reject) => {
            if (query.toLowerCase().trim().startsWith('select')) {
                db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            } else {
                db.run(query, params, function(err) {
                    if (err) reject(err);
                    else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
                });
            }
        });
    }
};

// Export promise-based interface
module.exports = dbPromise;