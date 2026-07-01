/**
 * Realistic seed data for Pyrolysis ERP testing
 * Run: node seed_realistic.js
 */
const db = require('./config/db');

async function run() {
  console.log('🌱 Seeding realistic ERP data...');

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const suppliers = [
    ['Bharat Tyre Recyclers Pvt Ltd', '9011234567', 'Pune, Maharashtra'],
    ['Rajasthan Waste Solutions',     '9876543210', 'Jaipur, Rajasthan'],
    ['Karnataka Rubber Recyclers',    '9900001111', 'Bengaluru, Karnataka'],
  ];
  for (const [name, contact, location] of suppliers) {
    await db.execute(
      `INSERT OR IGNORE INTO suppliers (name, contact, location) VALUES (?, ?, ?)`,
      [name, contact, location]
    );
  }
  console.log('✅ Suppliers seeded');

  // ── Inventory ──────────────────────────────────────────────────────────────
  const invEntries = [
    [1, 12500, 'Tyre', '2026-04-03'],
    [2, 9800,  'Tyre', '2026-04-10'],
    [1, 15000, 'Tyre', '2026-04-18'],
    [3, 8200,  'Tyre', '2026-05-02'],
    [2, 11300, 'Tyre', '2026-05-09'],
    [1, 6500,  'Tyre', '2026-05-20'],
    [3, 4000,  'Tyre', '2026-05-25'],
  ];
  for (const [sid, weight, type, date] of invEntries) {
    await db.execute(
      `INSERT OR IGNORE INTO inventory (supplier_id, weight, type, date) VALUES (?, ?, ?, ?)`,
      [sid, weight, type, date]
    );
  }
  console.log('✅ Inventory seeded');

  // ── Batches with outputs ───────────────────────────────────────────────────
  const batches = [
    // [batch_number, input_tyres, oil (42%), carbon (32%), steel (12%), gas (14%), status, date]
    ['BATCH-2026-001', 5000, 2100, 1600, 600, 700,  'Completed', '2026-04-05'],
    ['BATCH-2026-002', 4800, 2016, 1536, 576, 672,  'Completed', '2026-04-12'],
    ['BATCH-2026-003', 6000, 2520, 1920, 720, 840, 'Completed', '2026-04-20'],
    ['BATCH-2026-004', 5500, 2310, 1760, 660, 770,  'Completed', '2026-04-28'],
    ['BATCH-2026-005', 4000, 1680, 1280, 480, 560,  'Completed', '2026-05-05'],
    ['BATCH-2026-006', 7000, 2940, 2240, 840, 980, 'Completed', '2026-05-12'],
    // Anomaly Batch: only 30% oil, 20% carbon
    ['BATCH-2026-007', 3500, 1050, 700,  400, 1350, 'Completed', '2026-05-19'],
    ['BATCH-2026-008', 4500, 1890, 1440, 540, 630,  'In-Progress','2026-05-27'],
    ['BATCH-2026-009', 2000, null, null, null, null,'Planned',   '2026-06-02'],
  ];
  for (const [bn, it, oil, carbon, steel, gas, status, date] of batches) {
    await db.execute(
      `INSERT OR IGNORE INTO batches (batch_number, input_tyres, oil_output, carbon_output, steel_output, gas_output, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bn, it, oil, carbon, steel, gas, status, date]
    );
  }
  console.log('✅ Batches seeded');

  // ── Sales (product sales records) ─────────────────────────────────────────
  const sales = [
    ['Oil',         800,  42.0,  'Shree Petroleum',      '2026-04-08'],
    ['Oil',         600,  43.5,  'Kumar Oil Traders',    '2026-04-15'],
    ['Carbon Black', 350, 28.0,  'Polyplast India',      '2026-04-22'],
    ['Oil',         750,  44.0,  'Shree Petroleum',      '2026-04-29'],
    ['Steel Wire',  200,  35.0,  'Mehta Metals',         '2026-05-03'],
    ['Carbon Black', 400, 29.0,  'Polyplast India',      '2026-05-08'],
    ['Oil',         900,  45.0,  'Kumar Oil Traders',    '2026-05-14'],
    ['Gas',         180,  12.0,  'Local Industrial Co.', '2026-05-18'],
    ['Oil',         500,  46.5,  'Shree Petroleum',      '2026-05-22'],
    ['Carbon Black', 300, 28.5,  'Ravi Chemicals',       '2026-05-25'],
    ['Steel Wire',  150,  36.0,  'Mehta Metals',         '2026-05-27'],
  ];
  for (const [pt, qty, ppu, buyer, date] of sales) {
    await db.execute(
      `INSERT OR IGNORE INTO sales (product_type, quantity, price_per_unit, buyer, date) VALUES (?, ?, ?, ?, ?)`,
      [pt, qty, ppu, buyer, date]
    );
  }
  console.log('✅ Sales seeded');

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenses = [
    ['Labor',       45000,  '2026-04-05'],
    ['Transport',   12000,  '2026-04-10'],
    ['Maintenance', 18000,  '2026-04-20'],
    ['Labor',       45000,  '2026-05-05'],
    ['Transport',   13500,  '2026-05-12'],
    ['Electricity', 8500,   '2026-05-15'],
    ['Transport',   9200,   '2026-05-20'],
    ['Maintenance', 6500,   '2026-05-25'],
  ];
  for (const [type, amt, date] of expenses) {
    await db.execute(
      `INSERT INTO expenses (type, amount, date) VALUES (?, ?, ?)`,
      [type, amt, date]
    );
  }
  console.log('✅ Expenses seeded');

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = [
    ['Shree Petroleum Distributors', '27AAACS1234A1Z5', 'Plot 14, MIDC, Pune, Maharashtra 411019', '9011122334'],
    ['Kumar Oil Trading Co.',        '07AABCK5678B1Z3', 'A-45, Naraina Industrial Area, New Delhi 110028', '9876501234'],
    ['Polyplast India Pvt Ltd',      '29AAECP9012C2Z1', '8th Cross, Peenya Industrial Zone, Bengaluru 560058', '9900112233'],
    ['Mehta Metals & Alloys',        '24AAHCM3456D3Z8', 'Opp. GIDC, Vatva, Ahmedabad, Gujarat 382445', '9988776655'],
    ['Ravi Chemicals Pvt Ltd',       '33AAFCR7890E4Z2', '12, Sipcot Industrial Estate, Chennai, Tamil Nadu 600097', '9444555666'],
  ];
  for (const [name, gst, address, phone] of customers) {
    await db.execute(
      `INSERT OR IGNORE INTO customers (name, gst_number, address, phone) VALUES (?, ?, ?, ?)`,
      [name, gst, address, phone]
    );
  }
  console.log('✅ Customers seeded');

  // ── Invoices ───────────────────────────────────────────────────────────────
  const [custRows] = await db.execute('SELECT id, name FROM customers ORDER BY id');
  const custMap = {};
  custRows.forEach(r => { custMap[r.name] = r.id; });

  const invoiceData = [
    {
      customer: 'Shree Petroleum Distributors',
      date: '2026-04-10',
      status: 'Paid',
      items: [
        { desc: 'Pyrolysis Oil - Grade A', qty: 800, rate: 42 }
      ]
    },
    {
      customer: 'Kumar Oil Trading Co.',
      date: '2026-04-18',
      status: 'Paid',
      items: [
        { desc: 'Pyrolysis Oil - Grade B', qty: 600, rate: 43.5 }
      ]
    },
    {
      customer: 'Polyplast India Pvt Ltd',
      date: '2026-04-25',
      status: 'Paid',
      items: [
        { desc: 'Carbon Black N330', qty: 350, rate: 28 }
      ]
    },
    {
      customer: 'Shree Petroleum Distributors',
      date: '2026-05-02',
      status: 'Paid',
      items: [
        { desc: 'Pyrolysis Oil - Grade A', qty: 750, rate: 44 },
        { desc: 'Carbon Black N330',       qty: 100, rate: 28 }
      ]
    },
    {
      customer: 'Mehta Metals & Alloys',
      date: '2026-05-06',
      status: 'Pending',
      items: [
        { desc: 'Steel Wire Recovered', qty: 200, rate: 35 }
      ]
    },
    {
      customer: 'Kumar Oil Trading Co.',
      date: '2026-05-16',
      status: 'Pending',
      items: [
        { desc: 'Pyrolysis Oil - Grade A', qty: 900, rate: 45 }
      ]
    },
    {
      customer: 'Polyplast India Pvt Ltd',
      date: '2026-05-20',
      status: 'Overdue',
      items: [
        { desc: 'Carbon Black N330', qty: 400, rate: 29 }
      ]
    },
    {
      customer: 'Ravi Chemicals Pvt Ltd',
      date: '2026-05-24',
      status: 'Pending',
      items: [
        { desc: 'Carbon Black N330',       qty: 300, rate: 28.5 },
        { desc: 'Pyrolysis Oil - Grade B', qty: 200, rate: 44   }
      ]
    },
    {
      customer: 'Mehta Metals & Alloys',
      date: '2026-05-28',
      status: 'Pending',
      items: [
        { desc: 'Steel Wire Recovered', qty: 150, rate: 36 }
      ]
    },
  ];

  // Clear existing test invoices first
  await db.execute("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'INV2026%')");
  await db.execute("DELETE FROM invoices WHERE invoice_number LIKE 'INV2026%'");

  let seq = 1;
  for (const inv of invoiceData) {
    const invNum = `INV202605-${String(seq).padStart(4, '0')}`;
    seq++;

    // Get customer info
    const [cr] = await db.execute('SELECT * FROM customers WHERE name = ?', [inv.customer]);
    const cust = cr[0];
    if (!cust) { console.warn(`Customer not found: ${inv.customer}`); continue; }

    // Calculate item totals (18% GST intra-state: 9% CGST + 9% SGST)
    let taxableTotal = 0, cgstTotal = 0, sgstTotal = 0, grandTotal = 0;
    const itemsWithTotals = inv.items.map(item => {
      const taxable = Math.round(item.qty * item.rate * 100) / 100;
      const cgst    = Math.round(taxable * 0.09 * 100) / 100;
      const sgst    = Math.round(taxable * 0.09 * 100) / 100;
      const total   = Math.round((taxable + cgst + sgst) * 100) / 100;
      taxableTotal += taxable;
      cgstTotal    += cgst;
      sgstTotal    += sgst;
      grandTotal   += total;
      return { ...item, taxable, cgst, sgst, total };
    });

    taxableTotal = Math.round(taxableTotal * 100) / 100;
    cgstTotal    = Math.round(cgstTotal * 100) / 100;
    sgstTotal    = Math.round(sgstTotal * 100) / 100;
    grandTotal   = Math.round(grandTotal * 100) / 100;

    const [invoiceResult] = await db.execute(
      `INSERT INTO invoices (invoice_number, customer_id, customer_name, gst_number, address, phone, invoice_date, taxable_amount, cgst, sgst, igst, total_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [invNum, cust.id, cust.name, cust.gst_number, cust.address, cust.phone, inv.date, taxableTotal, cgstTotal, sgstTotal, grandTotal, inv.status]
    );
    const invoiceId = invoiceResult.insertId;

    for (const item of itemsWithTotals) {
      await db.execute(
        `INSERT INTO invoice_items (invoice_id, product_description, quantity, rate, taxable_amount, cgst, sgst, igst, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [invoiceId, item.desc, item.qty, item.rate, item.taxable, item.cgst, item.sgst, item.total]
      );
    }
  }
  console.log(`✅ ${invoiceData.length} invoices seeded`);

  // ── Settings ───────────────────────────────────────────────────────────────
  const settingsEntries = [
    ['TYRE_LIMIT',      '2000'],
    ['OIL_LIMIT',       '500'],
    ['CARBON_LIMIT',    '300'],
    ['COMPANY_NAME',    'PyroTech Industries Pvt Ltd'],
    ['COMPANY_GST',     '27AABCP1234A1Z5'],
    ['COMPANY_ADDRESS', 'B-12, MIDC Industrial Area, Pune, Maharashtra 411019'],
    ['COMPANY_PHONE',   '020-12345678'],
  ];
  for (const [key, value] of settingsEntries) {
    await db.execute(
      `INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)`,
      [key, value]
    );
  }
  console.log('✅ Settings seeded');

  console.log('\n🎉 Realistic data seed complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
