const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// PostgreSQL Pool
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'pyrolysis_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// SQLite Connection
const sqlitePath = path.join(__dirname, 'pyrolysis_erp.db');
if (!fs.existsSync(sqlitePath)) {
  console.error('❌ SQLite database pyrolysis_erp.db not found. Nothing to migrate.');
  process.exit(1);
}
const sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);

// Helper to query SQLite
const querySqlite = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const TABLES = [
  'users',
  'suppliers',
  'inventory',
  'batches',
  'sales',
  'expenses',
  'settings',
  'live_rates',
  'commodity_prices',
  'commodity_price_history',
  'customers',
  'invoices',
  'invoice_items',
  'bookings'
];

async function migrate() {
  console.log('🚀 Starting Pyrolysis ERP Data Migration: SQLite -> PostgreSQL');
  const pgClient = await pgPool.connect();

  try {
    // Check if PG schema exists by testing for users table
    const checkSchema = await pgClient.query("SELECT to_regclass('public.users') as exists");
    if (!checkSchema.rows[0].exists) {
        console.error('❌ PostgreSQL schema not found. Please start the server once so initSchema() runs, or run schema.pg.sql manually.');
        process.exit(1);
    }

    await pgClient.query('BEGIN'); // Wrap entirely in a transaction

    for (const table of TABLES) {
      console.log(`\n📦 Migrating table: ${table}...`);
      
      // Check if table exists in SQLite
      const tableCheck = await querySqlite(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
      if (tableCheck.length === 0) {
        console.log(`⚠️ Table ${table} does not exist in SQLite, skipping.`);
        continue;
      }

      const rows = await querySqlite(`SELECT * FROM ${table}`);
      console.log(`   Found ${rows.length} rows in SQLite.`);

      if (rows.length === 0) continue;

      // Build bulk insert query
      const columns = Object.keys(rows[0]);
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Handle ON CONFLICT for some specific tables
        let conflictClause = '';
        if (table === 'settings') {
          conflictClause = ' ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value';
        } else if (table === 'live_rates') {
          conflictClause = ' ON CONFLICT (product_type) DO UPDATE SET unit_price = EXCLUDED.unit_price';
        } else if (table === 'commodity_prices') {
          conflictClause = ' ON CONFLICT (commodity) DO UPDATE SET current_price = EXCLUDED.current_price';
        }

        const insertQuery = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})${conflictClause}`;
        
        try {
            await pgClient.query(insertQuery, values);
        } catch (insertErr) {
            // If duplicate key error on standard tables, we might just ignore or update, but for now we throw
            if (insertErr.code === '23505') {
                console.log(`   ⚠️ Row ID ${row.id || 'N/A'} skipped (Duplicate Key)`);
            } else {
                throw insertErr;
            }
        }
      }

      // Update PostgreSQL sequence to match the max ID imported
      if (columns.includes('id')) {
        const result = await pgClient.query(`SELECT MAX(id) as max_id FROM ${table}`);
        const maxId = result.rows[0].max_id;
        if (maxId) {
            await pgClient.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId})`);
            console.log(`   🔄 Updated sequence for ${table} to ${maxId}`);
        }
      }

      console.log(`   ✅ Migrated ${rows.length} rows to ${table}.`);
    }

    await pgClient.query('COMMIT');
    console.log('\n🎉 Migration completed successfully!');

  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error('\n❌ Migration failed, transaction rolled back:', err);
  } finally {
    pgClient.release();
    sqliteDb.close();
    await pgPool.end();
  }
}

migrate();
