const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'pyrolysis_erp.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.serialize(() => {
    db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log("--- DATABASE SCHEMA ---");
        tables.forEach(t => {
            console.log(t.sql + ";\n");
        });
        db.close();
    });
});
