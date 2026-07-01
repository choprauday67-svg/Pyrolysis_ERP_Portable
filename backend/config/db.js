'use strict';

/**
 * config/db.js — SQLite connection layer (better-sqlite3)
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for the former PostgreSQL (pg) wrapper.
 *
 * Public interface (unchanged — zero changes required in any model/controller):
 *  • db.execute(sql, params)  → SELECT returns [rows], others return [{ insertId, affectedRows }]
 *  • db.query(sql, params)    → alias for execute
 *  • db.testConnection()      → verifies the db file opens correctly
 *  • db.closePool()           → closes the SQLite connection
 *
 * DB file: backend/pyrolysis_erp.db  (existing production database — never recreated)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

// ── Resolve DB path ────────────────────────────────────────────────────────────
// Prefer DB_PATH env var, fallback to pyrolysis_erp.db in the backend directory
const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '..', 'pyrolysis_erp.db');

if (!fs.existsSync(DB_PATH)) {
  console.warn(`⚠️  SQLite DB not found at ${DB_PATH} — a new database will be created.`);
}

// ── Open the database ──────────────────────────────────────────────────────────
let _db;
try {
  _db = new Database(DB_PATH, { verbose: undefined });
  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  console.log(`✅ SQLite database opened: ${DB_PATH}`);
} catch (err) {
  console.error('❌ Failed to open SQLite database:', err.message);
  throw err;
}

// ── Detect statement type ──────────────────────────────────────────────────────
const SELECT_RE = /^\s*(SELECT|WITH|PRAGMA)\b/i;
const INSERT_RE = /^\s*INSERT\b/i;

// ── Core execute wrapper ───────────────────────────────────────────────────────
/**
 * Executes a SQL statement and returns results in the format that all
 * existing models and controllers expect:
 *   SELECT  → [rows]                          (array of row objects)
 *   INSERT  → [{ insertId, affectedRows }]
 *   UPDATE/
 *   DELETE  → [{ insertId: null, affectedRows }]
 *
 * Accepts ? placeholders (same as the old pg wrapper which auto-converted them).
 * params can be an array or left undefined.
 */
function execute(sql, params = []) {
  try {
    const stmt = _db.prepare(sql);

    if (SELECT_RE.test(sql)) {
      const rows = stmt.all(...params);
      return Promise.resolve([rows]);
    }

    if (INSERT_RE.test(sql)) {
      const info = stmt.run(...params);
      return Promise.resolve([{
        insertId:     info.lastInsertRowid,
        affectedRows: info.changes,
      }]);
    }

    // UPDATE / DELETE / DDL
    const info = stmt.run(...params);
    return Promise.resolve([{
      insertId:     null,
      affectedRows: info.changes,
    }]);

  } catch (err) {
    return Promise.reject(err);
  }
}

// ── Health check ───────────────────────────────────────────────────────────────
async function testConnection() {
  const [rows] = await execute("SELECT sqlite_version() AS version");
  console.log(`✅ SQLite version: ${rows[0].version} | DB: ${DB_PATH}`);
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function closePool() {
  if (_db && _db.open) {
    _db.close();
    console.log('✅ SQLite connection closed.');
  }
}

// ── Raw DB access (for migrations in server.js) ────────────────────────────────
function getRawDb() {
  return _db;
}

// ── Public interface ───────────────────────────────────────────────────────────
module.exports = {
  execute,
  query: execute,    // alias — some modules use db.query(...)
  testConnection,
  closePool,
  getRawDb,
};