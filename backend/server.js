const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const marketTrendService = require('./services/marketTrendService');

dotenv.config();

const app = express();

// ✅ CORS CONFIG
app.use(cors({
    origin: true, // Allow all origins for portable version
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ✅ BODY PARSER
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVE STATIC FILES (FRONTEND)
const staticRoot = path.join(__dirname, '../frontend');
console.log('🔧 Static root set to:', staticRoot, 'exists:', fs.existsSync(staticRoot));

// ✅ API ROUTES (must be registered before static and fallback)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/rates', require('./routes/ratesRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/production', require('./routes/batchRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/market-trends', require('./routes/commodityTrendRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ status: 'OK', routes: 'ACTIVE', db: 'SQLite' }));

// ✅ Explicit marketTrends.js route to ensure static file is served
app.get('/marketTrends.js', (req, res) => {
    const marketPath = path.join(staticRoot, 'marketTrends.js');
    console.log('🧭 marketTrends request, resolved path:', marketPath, 'exists:', fs.existsSync(marketPath));
    res.type('application/javascript');
    return res.sendFile(marketPath);
});

// ✅ Explicit assets route for frontend build files
app.use('/assets', express.static(path.join(staticRoot, 'assets')));

// ✅ Serve general frontend static files
app.use(express.static(staticRoot));

// ✅ SPA FALLBACK (only non-API / non-static frontend routes)
app.get(/^\/(?!api\/|marketTrends\.js$|assets\/).*$/, (req, res) => {
    const indexPath = path.join(staticRoot, 'index.html');
    console.log('🧭 SPA fallback request:', req.path, 'serving', indexPath);
    return res.sendFile(indexPath);
});

// ✅ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ✅ SQLite Schema Migration — non-destructive, only adds missing tables/columns
function ensureSchema() {
    const rawDb = db.getRawDb();

    // ── Tables that may not exist in older SQLite databases ──────────────────
    rawDb.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            gst_number TEXT NOT NULL UNIQUE,
            address    TEXT NOT NULL,
            phone      TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT    NOT NULL UNIQUE,
            customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
            customer_name  TEXT    NOT NULL,
            gst_number     TEXT    NOT NULL,
            address        TEXT    NOT NULL,
            phone          TEXT,
            invoice_date   DATETIME NOT NULL,
            taxable_amount REAL    NOT NULL DEFAULT 0,
            cgst           REAL    NOT NULL DEFAULT 0,
            sgst           REAL    NOT NULL DEFAULT 0,
            igst           REAL    NOT NULL DEFAULT 0,
            total_amount   REAL    NOT NULL DEFAULT 0,
            payment_status TEXT    NOT NULL DEFAULT 'Pending',
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices(invoice_date);
        CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(payment_status);
        CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

        CREATE TABLE IF NOT EXISTS invoice_items (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id          INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            product_description TEXT    NOT NULL,
            quantity            REAL    NOT NULL DEFAULT 0,
            rate                REAL    NOT NULL DEFAULT 0,
            taxable_amount      REAL    NOT NULL DEFAULT 0,
            cgst                REAL    NOT NULL DEFAULT 0,
            sgst                REAL    NOT NULL DEFAULT 0,
            igst                REAL    NOT NULL DEFAULT 0,
            total_amount        REAL    NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

        CREATE TABLE IF NOT EXISTS commodity_prices (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity         TEXT NOT NULL UNIQUE,
            current_price     REAL NOT NULL DEFAULT 0,
            previous_price    REAL NOT NULL DEFAULT 0,
            trend_direction   TEXT DEFAULT 'stable',
            change_percentage REAL DEFAULT 0,
            last_updated      DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS commodity_price_history (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity TEXT NOT NULL,
            price     REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cph_commodity_ts ON commodity_price_history(commodity, timestamp);
        CREATE INDEX IF NOT EXISTS idx_cph_timestamp    ON commodity_price_history(timestamp);
    `);

    // ── Seed commodity prices if the table is empty ──────────────────────────
    const count = rawDb.prepare('SELECT COUNT(*) AS n FROM commodity_prices').get();
    if (count.n === 0) {
        rawDb.prepare(`
            INSERT OR IGNORE INTO commodity_prices (commodity, current_price, previous_price, trend_direction, change_percentage)
            VALUES (?, ?, ?, 'stable', 0)
        `).run('Pyrolysis Oil', 500, 500);
        rawDb.prepare(`
            INSERT OR IGNORE INTO commodity_prices (commodity, current_price, previous_price, trend_direction, change_percentage)
            VALUES (?, ?, ?, 'stable', 0)
        `).run('Carbon Black', 350, 350);
        rawDb.prepare(`
            INSERT OR IGNORE INTO commodity_prices (commodity, current_price, previous_price, trend_direction, change_percentage)
            VALUES (?, ?, ?, 'stable', 0)
        `).run('Gas', 200, 200);
        rawDb.prepare(`
            INSERT OR IGNORE INTO commodity_prices (commodity, current_price, previous_price, trend_direction, change_percentage)
            VALUES (?, ?, ?, 'stable', 0)
        `).run('Steel', 180, 180);
        console.log('✅ Seeded commodity_prices with base prices');
    }

    // ── Seed default settings if missing ─────────────────────────────────────
    const settingsCount = rawDb.prepare('SELECT COUNT(*) AS n FROM settings').get();
    if (settingsCount.n === 0) {
        const insertSetting = rawDb.prepare('INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)');
        [
            ['TYRE_LIMIT', '1000'],
            ['OIL_LIMIT', '500'],
            ['CARBON_LIMIT', '500'],
            ['OIL_PRICE', '45.00'],
            ['CARBON_PRICE', '35.00'],
            ['STEEL_PRICE', '30.00'],
        ].forEach(([k, v]) => insertSetting.run(k, v));
        console.log('✅ Seeded default settings');
    }

    console.log('✅ SQLite schema migration complete');
}

const PORT = process.env.PORT || 5000;
let server;

// ✅ Start: run schema migration, then start market trends and HTTP server
try {
    ensureSchema();
    db.testConnection().then(() => {
        marketTrendService.start(60000); // Update prices every 60 seconds
        server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }).catch((err) => {
        console.error('❌ DB connection test failed:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('❌ Schema migration failed:', err);
    process.exit(1);
}

// ✅ GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
    console.log('📌 SIGTERM received, shutting down gracefully...');
    marketTrendService.stop();
    if (server) {
        server.close(() => {
            db.closePool();
            console.log('✅ Server closed');
            process.exit(0);
        });
    }
});

process.on('SIGINT', () => {
    console.log('📌 SIGINT received, shutting down gracefully...');
    marketTrendService.stop();
    if (server) {
        server.close(() => {
            db.closePool();
            console.log('✅ Server closed');
            process.exit(0);
        });
    }
});