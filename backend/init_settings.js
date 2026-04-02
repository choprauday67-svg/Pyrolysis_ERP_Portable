const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log("Initializing database...");
        const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                await db.execute(statement.trim());
            }
        }

        console.log("SUCCESS: Database initialized");
        process.exit(0);
    } catch (e) {
        console.error("FAILURE:", e);
        process.exit(1);
    }
}

run();
