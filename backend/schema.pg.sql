-- =============================================================================
-- schema.pg.sql — Pyrolysis ERP PostgreSQL Schema
-- =============================================================================
-- Run this file once to create all tables in a fresh PostgreSQL database.
-- Idempotent: uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- =============================================================================

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    email      TEXT        UNIQUE NOT NULL,
    password   TEXT        NOT NULL,
    role       TEXT        NOT NULL DEFAULT 'Worker'
                           CHECK (role IN ('Admin', 'Worker', 'Customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Suppliers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    contact    TEXT,
    location   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);

-- ── Inventory (Tyre Input / Raw Material) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    id          SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    weight      NUMERIC(12,2) NOT NULL,
    type        TEXT          NOT NULL CHECK (type IN ('Truck', 'Car', 'Mixed')),
    date        DATE          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_date     ON inventory(date);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);

-- ── Production Batches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
    id             SERIAL PRIMARY KEY,
    batch_number   TEXT,
    input_tyres    NUMERIC(12,2) NOT NULL,
    oil_output     NUMERIC(12,2),
    gas_output     NUMERIC(12,2),
    carbon_output  NUMERIC(12,2),
    steel_output   NUMERIC(12,2),
    status         TEXT          NOT NULL DEFAULT 'Planned'
                                 CHECK (status IN ('Planned', 'In-Progress', 'Completed')),
    start_time     TIMESTAMPTZ,
    end_time       TIMESTAMPTZ,
    date           DATE          NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_date   ON batches(date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- ── Sales (Dispatch Records) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
    id             SERIAL PRIMARY KEY,
    product_type   TEXT          NOT NULL
                                 CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel', 'Steel Wire', 'Gas', 'Energy Recovery')),
    quantity       NUMERIC(12,2) NOT NULL,
    price_per_unit NUMERIC(12,2) NOT NULL,
    buyer          TEXT          NOT NULL,
    date           DATE          NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_date  ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales(buyer);

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id         SERIAL PRIMARY KEY,
    type       TEXT          NOT NULL
               CHECK (type IN ('Transport', 'Labor', 'Electricity', 'Maintenance', 'Other')),
    amount     NUMERIC(14,2) NOT NULL,
    date       DATE          NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- ── System Settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    setting_key   TEXT PRIMARY KEY,
    setting_value TEXT        NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Live Market Rates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_rates (
    product_type TEXT          PRIMARY KEY
                               CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel')),
    unit_price   NUMERIC(12,2) NOT NULL,
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Customer Bookings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_type TEXT          NOT NULL
                               CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel')),
    quantity     NUMERIC(12,2) NOT NULL,
    total_price  NUMERIC(14,2) NOT NULL,
    status       TEXT          NOT NULL DEFAULT 'Pending'
                               CHECK (status IN ('Pending', 'Confirmed', 'Dispatched', 'Completed', 'Cancelled')),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_user   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);

-- ── Customers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    gst_number TEXT        NOT NULL UNIQUE,
    address    TEXT        NOT NULL,
    phone      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id             SERIAL PRIMARY KEY,
    invoice_number TEXT          NOT NULL UNIQUE,
    customer_id    INTEGER       REFERENCES customers(id) ON DELETE SET NULL,
    customer_name  TEXT          NOT NULL,
    gst_number     TEXT          NOT NULL,
    address        TEXT          NOT NULL,
    phone          TEXT,
    invoice_date   TIMESTAMPTZ   NOT NULL,
    taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    cgst           NUMERIC(14,2) NOT NULL DEFAULT 0,
    sgst           NUMERIC(14,2) NOT NULL DEFAULT 0,
    igst           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_status TEXT          NOT NULL DEFAULT 'Pending',
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_date   ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- ── Invoice Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
    id                  SERIAL PRIMARY KEY,
    invoice_id          INTEGER       NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_description TEXT          NOT NULL,
    quantity            NUMERIC(12,2) NOT NULL DEFAULT 0,
    rate                NUMERIC(12,2) NOT NULL DEFAULT 0,
    taxable_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    cgst                NUMERIC(14,2) NOT NULL DEFAULT 0,
    sgst                NUMERIC(14,2) NOT NULL DEFAULT 0,
    igst                NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ── Commodity Market Prices ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commodity_prices (
    id                SERIAL PRIMARY KEY,
    commodity         TEXT          NOT NULL UNIQUE
                                    CHECK (commodity IN ('Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel')),
    current_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
    previous_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
    trend_direction   TEXT          NOT NULL DEFAULT 'stable'
                                    CHECK (trend_direction IN ('up', 'down', 'stable')),
    change_percentage NUMERIC(8,4)  NOT NULL DEFAULT 0,
    last_updated      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Commodity Price History ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commodity_price_history (
    id        SERIAL PRIMARY KEY,
    commodity TEXT          NOT NULL
              CHECK (commodity IN ('Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel')),
    price     NUMERIC(12,2) NOT NULL,
    timestamp TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    FOREIGN KEY (commodity) REFERENCES commodity_prices(commodity) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cph_commodity_ts ON commodity_price_history(commodity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cph_timestamp    ON commodity_price_history(timestamp DESC);

-- =============================================================================
-- Seed data (idempotent)
-- =============================================================================

-- Default admin user (password: admin123)
INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@pyrolysis.com', '$2b$10$hvwH2cSirbOzGxE95JxRZeZKktjqJR8HiMfFL4Fe8PbzzSV1Tmt0G', 'Admin')
ON CONFLICT (email) DO NOTHING;

-- System settings
INSERT INTO settings (setting_key, setting_value) VALUES
    ('TYRE_LIMIT',    '1000'),
    ('OIL_LIMIT',     '500'),
    ('CARBON_LIMIT',  '500'),
    ('OIL_PRICE',     '45.00'),
    ('CARBON_PRICE',  '35.00'),
    ('STEEL_PRICE',   '30.00')
ON CONFLICT (setting_key) DO NOTHING;

-- Live rates
INSERT INTO live_rates (product_type, unit_price) VALUES
    ('Oil',          0.85),
    ('Carbon Black', 0.50),
    ('Steel',        0.30)
ON CONFLICT (product_type) DO NOTHING;

-- Commodity prices (base prices for market simulation)
INSERT INTO commodity_prices (commodity, current_price, previous_price, trend_direction, change_percentage) VALUES
    ('Pyrolysis Oil', 500.00, 500.00, 'stable', 0),
    ('Carbon Black',  350.00, 350.00, 'stable', 0),
    ('Gas',           200.00, 200.00, 'stable', 0),
    ('Steel',         180.00, 180.00, 'stable', 0)
ON CONFLICT (commodity) DO NOTHING;
