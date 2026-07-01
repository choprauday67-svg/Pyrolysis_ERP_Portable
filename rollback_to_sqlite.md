# Rollback Strategy: PostgreSQL -> SQLite

If the PostgreSQL migration fails or the application exhibits issues, follow these steps to instantly revert to the original SQLite implementation:

## Step 1: Restore SQLite Database Adapter
The original SQLite `db.js` adapter was replaced. To restore it:
1. Open `backend/config/db.js`
2. Replace its entire contents with the original SQLite `sqlite3` wrapper logic. (You can pull this from your Git history).

## Step 2: Restore Dependencies
1. Open terminal in the `backend/` directory.
2. Run: `npm uninstall pg`
3. Run: `npm install sqlite3`

## Step 3: Revert Server Schema Loader
1. In `backend/server.js`, revert the `initSchema()` function back to the original `ensureMarketTrendTables()` function containing the raw SQLite `CREATE TABLE` commands.
2. Change the initialization call at the bottom of the file from `initSchema().then(...)` back to `ensureMarketTrendTables().then(...)`.

## Data Preservation
Your original SQLite database file `backend/pyrolysis_erp.db` **was not deleted or modified** during the migration process. As soon as you revert the code as described above, the application will instantly reconnect to all of your original data exactly as it was before the migration.

Once you are 100% confident in the PostgreSQL deployment, you may safely delete:
- `backend/pyrolysis_erp.db`
- `backend/database.sql`
- `backend/migrate_sqlite_to_pg.js`
- `backend/schema.pg.sql` (if you no longer need the raw schema reference)
