-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'Worker' CHECK (role IN ('Admin', 'Worker', 'Customer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table (Tyre Input)
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    weight REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Truck', 'Car', 'Mixed')),
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Production Table (Batches)
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT,
    input_tyres REAL NOT NULL,
    oil_output REAL,
    gas_output REAL,
    carbon_output REAL,
    steel_output REAL,
    status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'In-Progress', 'Completed')),
    start_time DATETIME,
    end_time DATETIME,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_type TEXT NOT NULL CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel')),
    quantity REAL NOT NULL,
    price_per_unit REAL NOT NULL,
    buyer TEXT NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('Transport', 'Labor', 'Electricity', 'Maintenance', 'Other')),
    amount REAL NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Settings & Thresholds
CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Live Market Rates
CREATE TABLE IF NOT EXISTS live_rates (
    product_type TEXT PRIMARY KEY CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel')),
    unit_price REAL NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('Oil', 'Carbon Black', 'Steel')),
    quantity REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Dispatched', 'Completed', 'Cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Batches Table (for batch management)
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL,
    input_tyres REAL NOT NULL,
    oil_output REAL,
    gas_output REAL,
    carbon_output REAL,
    steel_output REAL,
    status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'In-Progress', 'Completed')),
    start_time DATETIME,
    end_time DATETIME,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory(date);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches(date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales(buyer);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_booking_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);CREATE INDEX IF NOT EXISTS idx_batches_date ON batches(date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
-- Initial Setup / Seeds
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@pyrolysis.com', '$2b$10$hvwH2cSirbOzGxE95JxRZeZKktjqJR8HiMfFL4Fe8PbzzSV1Tmt0G', 'Admin');

INSERT INTO settings (setting_key, setting_value) VALUES 
('TYRE_LIMIT', '1000'),
('OIL_LIMIT', '500'),
('CARBON_LIMIT', '500'),
('OIL_PRICE', '45.00'),
('CARBON_PRICE', '35.00'),
('STEEL_PRICE', '30.00');

INSERT INTO live_rates (product_type, unit_price) VALUES 
('Oil', '0.85'),
('Carbon Black', '0.50'),
('Steel', '0.30');

INSERT INTO suppliers (name, contact, location) VALUES 
('Global Tyres Inc', '555-1234', 'New York'),
('Local Scrap Co', '555-5678', 'New Jersey');

INSERT INTO inventory (supplier_id, weight, type, date) VALUES 
(1, 15000.00, 'Truck', '2026-03-01'),
(2, 5000.00, 'Car', '2026-03-05'),
(1, 10000.00, 'Mixed', '2026-03-10');

INSERT INTO batches (batch_number, input_tyres, oil_output, carbon_output, steel_output, status, date) VALUES 
('BATCH-001', 5000.00, 2200.00, 1500.00, 750.00, 'Completed', '2026-03-02'),
('BATCH-002', 2500.00, 1100.00, 750.00, 300.00, 'Completed', '2026-03-06'),
('BATCH-003', 1000.00, 450.00, 300.00, 150.00, 'Completed', '2026-03-11');

INSERT INTO sales (product_type, quantity, price_per_unit, buyer, date) VALUES 
('Oil', 1000.00, 0.85, 'Energy Corp', '2026-03-04'),
('Carbon Black', 2000.00, 0.50, 'Rubber Makers Ltd', '2026-03-10'),
('Steel', 1000.00, 0.30, 'Metal Recyclers', '2026-03-15');

INSERT INTO expenses (type, amount, date) VALUES 
('Electricity', 1500.00, '2026-03-01'),
('Labor', 3000.00, '2026-03-05'),
('Maintenance', 500.00, '2026-03-15');
