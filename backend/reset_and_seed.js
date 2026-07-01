/**
 * Full database reset and realistic seed.
 * Clears ALL production data, keeps admin user and settings.
 */
const db = require('./config/db');

async function run() {
  console.log('🔄 Resetting database...');

  // Temporarily disable FK constraints so we can clear tables in any order
  await db.execute('PRAGMA foreign_keys = OFF');

  // Clear operational tables
  await db.execute('DELETE FROM invoice_items');
  await db.execute('DELETE FROM invoices');
  await db.execute('DELETE FROM sales');
  await db.execute('DELETE FROM expenses');
  await db.execute('DELETE FROM batches');
  await db.execute('DELETE FROM inventory');
  await db.execute('DELETE FROM customers');
  await db.execute('DELETE FROM suppliers');

  await db.execute('PRAGMA foreign_keys = ON');
  console.log('✅ Cleared operational tables');

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const supplierNames = [
    ['Bharat Tyre Recyclers Pvt Ltd', '9011234567', 'Pune, Maharashtra'],
    ['Rajasthan Waste Solutions',     '9876543210', 'Jaipur, Rajasthan'],
    ['Karnataka Rubber Recyclers',    '9900001111', 'Bengaluru, Karnataka'],
  ];
  const sIds = [];
  for (const [name, contact, location] of supplierNames) {
    const [r] = await db.execute(`INSERT INTO suppliers (name, contact, location) VALUES (?, ?, ?)`, [name, contact, location]);
    sIds.push(r.insertId);
  }
  console.log('✅ Suppliers seeded with IDs:', sIds);

  // ── Inventory (total: ~2,80,000 kg received) ───────────────────────────────
  const invEntries = [
    [sIds[0], 40000, 'Truck', '2026-03-01'],
    [sIds[1], 35000, 'Mixed', '2026-03-15'],
    [sIds[0], 45000, 'Truck', '2026-04-03'],
    [sIds[1], 30000, 'Mixed', '2026-04-10'],
    [sIds[0], 40000, 'Truck', '2026-04-18'],
    [sIds[2], 25000, 'Mixed', '2026-05-02'],
    [sIds[1], 30000, 'Mixed', '2026-05-09'],
    [sIds[0], 20000, 'Truck', '2026-05-20'],
    [sIds[2], 15000, 'Mixed', '2026-05-25'],
    [sIds[0], 25000, 'Truck', '2026-06-10'],
    [sIds[1], 15000, 'Mixed', '2026-06-11'],
  ];
  for (const [sid, weight, type, date] of invEntries) {
    await db.execute(`INSERT INTO inventory (supplier_id, weight, type, date) VALUES (?, ?, ?, ?)`, [sid, weight, type, date]);
  }
  console.log('✅ Inventory seeded (total:', invEntries.reduce((a,b)=>a+b[1],0), 'kg)');

  // ── Batches (yields: 42% oil, 32% carbon, 12% steel, 14% gas) ─────────────
  // One anomaly batch for alert testing (BATCH-2026-007: 30% oil, 20% carbon)
  const batches = [
    ['BATCH-2026-001', 20000, 8400,  6400, 2400, 2800, 'Completed',   '2026-03-05'],
    ['BATCH-2026-002', 18000, 7560,  5760, 2160, 2520, 'Completed',   '2026-03-12'],
    ['BATCH-2026-003', 22000, 9240,  7040, 2640, 3080, 'Completed',   '2026-03-20'],
    ['BATCH-2026-004', 25000, 10500, 8000, 3000, 3500, 'Completed',   '2026-04-05'],
    ['BATCH-2026-005', 20000, 8400,  6400, 2400, 2800, 'Completed',   '2026-04-12'],
    ['BATCH-2026-006', 24000, 10080, 7680, 2880, 3360, 'Completed',   '2026-04-20'],
    ['BATCH-2026-007', 18000, 10800, 8640, 3240, 3780, 'Completed',   '2026-04-28'],
    // Anomaly: Only 30% oil, 20% carbon (below thresholds)
    ['BATCH-2026-008', 15000, 4500,  3000, 1800, 5700, 'Completed',   '2026-05-05'],
    ['BATCH-2026-009', 20000, 8400,  6400, 2400, 2800, 'Completed',   '2026-05-12'],
    ['BATCH-2026-010', 10000, 4200,  3200, 1200, 1400, 'Completed',   '2026-06-11'],
    ['BATCH-2026-011', 12000, 5040,  3840, 1440, 1680, 'In-Progress', '2026-06-11'],
    ['BATCH-2026-012', 12000, null,  null, null, null,  'Planned',    '2026-06-15'],
  ];
  for (const [bn, it, oil, carbon, steel, gas, status, date] of batches) {
    await db.execute(
      `INSERT INTO batches (batch_number, input_tyres, oil_output, carbon_output, steel_output, gas_output, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bn, it, oil, carbon, steel, gas, status, date]
    );
  }
  const totalBatchInput = batches.reduce((a,b)=>a+b[1],0);
  console.log('✅ Batches seeded (total input:', totalBatchInput, 'kg)');

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = [
    ['Shree Petroleum Distributors', '27AAACS1234A1Z5', 'Plot 14, MIDC, Pune, Maharashtra 411019', '9011122334'],
    ['Kumar Oil Trading Co.',        '07AABCK5678B1Z3', 'A-45, Naraina Industrial Area, New Delhi 110028', '9876501234'],
    ['Polyplast India Pvt Ltd',      '29AAECP9012C2Z1', '8th Cross, Peenya Industrial Zone, Bengaluru 560058', '9900112233'],
    ['Mehta Metals & Alloys',        '24AAHCM3456D3Z8', 'Opp. GIDC, Vatva, Ahmedabad, Gujarat 382445', '9988776655'],
    ['Ravi Chemicals Pvt Ltd',       '33AAFCR7890E4Z2', '12, Sipcot Industrial Estate, Chennai, Tamil Nadu 600097', '9444555666'],
  ];
  for (const [name, gst, address, phone] of customers) {
    await db.execute(`INSERT INTO customers (name, gst_number, address, phone) VALUES (?, ?, ?, ?)`, [name, gst, address, phone]);
  }
  console.log('✅ Customers seeded');

  // ── Sales ──────────────────────────────────────────────────────────────────
  const sales = [
    ['Oil',          5000, 45.0, 'Shree Petroleum Distributors', '2026-03-10'],
    ['Oil',          4000, 45.0, 'Kumar Oil Trading Co.',        '2026-03-20'],
    ['Carbon Black', 3000, 28.0, 'Polyplast India Pvt Ltd',      '2026-04-05'],
    ['Oil',          6000, 46.0, 'Shree Petroleum Distributors', '2026-04-15'],
    ['Steel',        2000, 35.0, 'Mehta Metals & Alloys',        '2026-04-22'],
    ['Carbon Black', 2500, 28.5, 'Ravi Chemicals Pvt Ltd',       '2026-05-01'],
    ['Oil',          5000, 47.0, 'Kumar Oil Trading Co.',        '2026-05-10'],
    ['Steel',        1500, 36.0, 'Mehta Metals & Alloys',        '2026-05-18'],
    ['Carbon Black', 2000, 29.0, 'Polyplast India Pvt Ltd',      '2026-05-22'],
    ['Oil',          3000, 48.0, 'Kumar Oil Trading Co.',        '2026-06-11'],
  ];
  for (const [pt, qty, ppu, buyer, date] of sales) {
    await db.execute(`INSERT INTO sales (product_type, quantity, price_per_unit, buyer, date) VALUES (?, ?, ?, ?, ?)`, [pt, qty, ppu, buyer, date]);
  }
  console.log('✅ Sales seeded');

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenses = [
    ['Labor',       55000,  '2026-03-05'],
    ['Electricity', 12000,  '2026-03-10'],
    ['Transport',   18000,  '2026-03-20'],
    ['Maintenance', 22000,  '2026-04-05'],
    ['Labor',       55000,  '2026-04-12'],
    ['Transport',   15000,  '2026-04-20'],
    ['Electricity', 14000,  '2026-05-05'],
    ['Labor',       55000,  '2026-05-12'],
    ['Transport',   12000,  '2026-05-20'],
    ['Maintenance', 18000,  '2026-05-25'],
    ['Transport',   10000,  '2026-06-11'],
  ];
  for (const [type, amt, date] of expenses) {
    await db.execute(`INSERT INTO expenses (type, amount, date) VALUES (?, ?, ?)`, [type, amt, date]);
  }
  const totalExp = expenses.reduce((a,b)=>a+b[1],0);
  console.log('✅ Expenses seeded (total: ₹' + totalExp + ')');

  // ── Invoices ───────────────────────────────────────────────────────────────
  const [custRows] = await db.execute('SELECT id, name, gst_number, address, phone FROM customers ORDER BY id');
  const custMap = {};
  custRows.forEach(r => { custMap[r.name] = r; });

  const invoiceData = [
    { customer: 'Shree Petroleum Distributors', date: '2026-03-12', status: 'Paid',    items: [{ desc: 'Pyrolysis Oil - Grade A', qty: 5000, rate: 45 }] },
    { customer: 'Kumar Oil Trading Co.',        date: '2026-03-22', status: 'Paid',    items: [{ desc: 'Pyrolysis Oil - Grade B', qty: 4000, rate: 45 }] },
    { customer: 'Polyplast India Pvt Ltd',      date: '2026-04-07', status: 'Paid',    items: [{ desc: 'Carbon Black N330',       qty: 3000, rate: 28 }] },
    { customer: 'Shree Petroleum Distributors', date: '2026-04-17', status: 'Paid',    items: [{ desc: 'Pyrolysis Oil - Grade A', qty: 6000, rate: 46 }] },
    { customer: 'Mehta Metals & Alloys',        date: '2026-04-24', status: 'Paid',    items: [{ desc: 'Steel Wire Recovered',    qty: 2000, rate: 35 }] },
    { customer: 'Ravi Chemicals Pvt Ltd',       date: '2026-05-03', status: 'Pending', items: [{ desc: 'Carbon Black N330',       qty: 2500, rate: 28.5 }] },
    { customer: 'Kumar Oil Trading Co.',        date: '2026-05-12', status: 'Pending', items: [{ desc: 'Pyrolysis Oil - Grade A', qty: 5000, rate: 47 }] },
    { customer: 'Mehta Metals & Alloys',        date: '2026-05-20', status: 'Overdue', items: [{ desc: 'Steel Wire Recovered',    qty: 1500, rate: 36 }] },
    { customer: 'Polyplast India Pvt Ltd',      date: '2026-05-24', status: 'Pending', items: [{ desc: 'Carbon Black N330',       qty: 2000, rate: 29 }] },
    { customer: 'Kumar Oil Trading Co.',        date: '2026-06-11', status: 'Pending', items: [{ desc: 'Pyrolysis Oil - Grade A', qty: 3000, rate: 48 }] },
  ];

  let seq = 1;
  for (const inv of invoiceData) {
    const invNum = `INV2026-${String(seq).padStart(4, '0')}`;
    seq++;
    const cust = custMap[inv.customer];
    if (!cust) { console.warn('Customer not found:', inv.customer); continue; }

    let taxableTotal = 0, cgstTotal = 0, sgstTotal = 0, grandTotal = 0;
    const itemsWithTotals = inv.items.map(item => {
      const taxable = Math.round(item.qty * item.rate * 100) / 100;
      const cgst = Math.round(taxable * 0.09 * 100) / 100;
      const sgst = Math.round(taxable * 0.09 * 100) / 100;
      const total = taxable + cgst + sgst;
      taxableTotal += taxable; cgstTotal += cgst; sgstTotal += sgst; grandTotal += total;
      return { ...item, taxable, cgst, sgst, total };
    });

    const [invoiceResult] = await db.execute(
      `INSERT INTO invoices (invoice_number, customer_id, customer_name, gst_number, address, phone, invoice_date, taxable_amount, cgst, sgst, igst, total_amount, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [invNum, cust.id, cust.name, cust.gst_number, cust.address, cust.phone, inv.date, Math.round(taxableTotal*100)/100, Math.round(cgstTotal*100)/100, Math.round(sgstTotal*100)/100, Math.round(grandTotal*100)/100, inv.status]
    );
    for (const item of itemsWithTotals) {
      await db.execute(
        `INSERT INTO invoice_items (invoice_id, product_description, quantity, rate, taxable_amount, cgst, sgst, igst, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [invoiceResult.insertId, item.desc, item.qty, item.rate, item.taxable, item.cgst, item.sgst, item.total]
      );
    }
  }
  console.log(`✅ ${invoiceData.length} invoices seeded`);

  // ── Settings ───────────────────────────────────────────────────────────────
  const settingsEntries = [
    ['TYRE_LIMIT',      '5000'],
    ['OIL_LIMIT',       '2000'],
    ['CARBON_LIMIT',    '1000'],
    ['COMPANY_NAME',    'PyroTech Industries Pvt Ltd'],
    ['COMPANY_GST',     '27AABCP1234A1Z5'],
    ['COMPANY_ADDRESS', 'B-12, MIDC Industrial Area, Pune, Maharashtra 411019'],
    ['COMPANY_PHONE',   '020-12345678'],
  ];
  for (const [key, value] of settingsEntries) {
    await db.execute(`INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)`, [key, value]);
  }
  console.log('✅ Settings updated');
  console.log('\n🎉 Reset & seed complete! Run: node audit_check.js to verify.');
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
